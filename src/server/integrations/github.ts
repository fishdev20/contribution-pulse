import { fetchWithRetry, paginateByPage } from "@/server/integrations/http";
import { safeLog } from "@/server/crypto/logging";
import { EventMetric } from "@/server/sync/aggregation";

type GithubUser = { login: string };
type GithubRepo = { name: string; owner?: { login?: string } };
type GithubCommit = { sha?: string; commit?: { author?: { date?: string } } };
type GithubPull = { created_at?: string; merged_at?: string; user?: { login?: string } };
type GithubWorkflowRun = { created_at?: string };

function formatGithubDateRange(from: Date, to: Date): string {
  return `${from.toISOString().slice(0, 10)}..${to.toISOString().slice(0, 10)}`;
}

async function githubApiError(label: string, res: Response): Promise<Error> {
  let bodyPreview = "";
  try {
    bodyPreview = (await res.text()).slice(0, 240);
  } catch {
    bodyPreview = "";
  }
  return new Error(`${label} failed (${res.status} ${res.statusText})${bodyPreview ? `: ${bodyPreview}` : ""}`);
}

function isSkippableGithubCommitStatus(status: number): boolean {
  return status === 403 || status === 404 || status === 409;
}

export async function fetchGithubDailyMetrics(params: {
  token: string;
  from: Date;
  to: Date;
}): Promise<EventMetric[]> {
  const headers = {
    Authorization: `Bearer ${params.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const events: EventMetric[] = [];

  const userRes = await fetchWithRetry("https://api.github.com/user", { headers, cache: "no-store" });
  if (!userRes.ok) throw await githubApiError("GitHub user API", userRes);
  const user = (await userRes.json()) as GithubUser;
  // PAT-consistent matching: use authenticated GitHub login only.
  const authorQueries = [user.login].filter(Boolean);

  const repos = await paginateByPage<GithubRepo>(async (page) => {
    const url = new URL("https://api.github.com/user/repos");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("type", "all");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");

    const res = await fetchWithRetry(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) throw await githubApiError("GitHub repositories API", res);
    const items = (await res.json()) as GithubRepo[];
    const link = res.headers.get("link") ?? "";
    const hasNext = link.includes('rel="next"');

    return {
      items,
      nextPage: hasNext ? page + 1 : undefined,
    };
  });

  for (const repo of repos) {
    const owner = repo.owner?.login;
    if (!owner || !repo.name) continue;

    const seenCommitShas = new Set<string>();
    for (const author of authorQueries) {
      const commits = await paginateByPage<GithubCommit>(async (page) => {
        const url = new URL(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/commits`);
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));
        url.searchParams.set("since", params.from.toISOString());
        url.searchParams.set("until", params.to.toISOString());
        url.searchParams.set("author", author);

        const res = await fetchWithRetry(url.toString(), { headers, cache: "no-store" });
        if (!res.ok) {
          if (isSkippableGithubCommitStatus(res.status)) {
            safeLog("warn", "Skipping GitHub repo commits fetch during sync", {
              provider: "GITHUB",
              status: res.status,
              author,
            });
            return { items: [], nextPage: undefined };
          }
          throw await githubApiError("GitHub commits API", res);
        }
        const items = (await res.json()) as GithubCommit[];
        return {
          items,
          nextPage: items.length === 100 ? page + 1 : undefined,
        };
      });

      for (const commit of commits) {
        if (commit.sha && seenCommitShas.has(commit.sha)) continue;
        if (commit.sha) seenCommitShas.add(commit.sha);
        if (!commit.commit?.author?.date) continue;
        events.push({ date: commit.commit.author.date, commitCount: 1, mergeCount: 0, prCount: 0, pipelineCount: 0 });
      }
    }

    try {
      const pulls = await paginateByPage<GithubPull>(async (page) => {
        const url = new URL(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/pulls`);
        url.searchParams.set("state", "all");
        url.searchParams.set("sort", "updated");
        url.searchParams.set("direction", "desc");
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));

        const res = await fetchWithRetry(url.toString(), { headers, cache: "no-store" });
        if (!res.ok) throw await githubApiError("GitHub pulls API", res);
        const items = (await res.json()) as GithubPull[];
        return {
          items,
          nextPage: items.length === 100 ? page + 1 : undefined,
        };
      });

      for (const pull of pulls) {
        if (pull.user?.login !== user.login) continue;
        if (pull.created_at) {
          const created = new Date(pull.created_at);
          if (created >= params.from && created <= params.to) {
            events.push({ date: pull.created_at, commitCount: 0, mergeCount: 0, prCount: 1, pipelineCount: 0 });
          }
        }
        if (pull.merged_at) {
          const merged = new Date(pull.merged_at);
          if (merged >= params.from && merged <= params.to) {
            events.push({ date: pull.merged_at, commitCount: 0, mergeCount: 1, prCount: 0, pipelineCount: 0 });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!(message.includes("GitHub pulls API failed (404") || message.includes("GitHub pulls API failed (403"))) {
        throw error;
      }
    }

    try {
      const workflowRuns = await paginateByPage<GithubWorkflowRun>(async (page) => {
        const url = new URL(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/actions/runs`,
        );
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));
        url.searchParams.set("actor", user.login);
        url.searchParams.set("created", formatGithubDateRange(params.from, params.to));

        const res = await fetchWithRetry(url.toString(), { headers, cache: "no-store" });
        if (!res.ok) throw await githubApiError("GitHub workflow runs API", res);
        const data = (await res.json()) as { workflow_runs?: GithubWorkflowRun[] };
        const items = data.workflow_runs ?? [];
        return {
          items,
          nextPage: items.length === 100 ? page + 1 : undefined,
        };
      });

      for (const run of workflowRuns) {
        if (!run.created_at) continue;
        events.push({ date: run.created_at, commitCount: 0, mergeCount: 0, prCount: 0, pipelineCount: 1 });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!(message.includes("GitHub workflow runs API failed (404") || message.includes("GitHub workflow runs API failed (403"))) {
        throw error;
      }
    }
  }

  return events;
}
