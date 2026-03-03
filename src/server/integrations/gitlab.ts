import { EventMetric } from "@/server/sync/aggregation";
import { fetchWithRetry, paginateByPage } from "@/server/integrations/http";

type GitlabEvent = {
  created_at: string;
  action_name?: string;
  push_data?: { commit_count?: number };
  target_type?: string;
};

function normalizeBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return "https://gitlab.com";
  return baseUrl.replace(/\/$/, "");
}

function toGitlabDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchGitlabDailyMetrics(params: {
  token: string;
  baseUrl?: string | null;
  from: Date;
  to: Date;
}): Promise<EventMetric[]> {
  const baseUrl = normalizeBaseUrl(params.baseUrl ?? undefined);
  const fromDate = toGitlabDate(params.from);
  const toDate = toGitlabDate(params.to);

  const events = await paginateByPage<GitlabEvent>(async (page) => {
    const url =
      `${baseUrl}/api/v4/events?scope=all&sort=asc` +
      `&after=${encodeURIComponent(fromDate)}&before=${encodeURIComponent(toDate)}` +
      `&per_page=100&page=${page}`;
    const res = await fetchWithRetry(url, {
      headers: {
        "PRIVATE-TOKEN": params.token,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`GitLab API error ${res.status}`);
    }

    const items = (await res.json()) as GitlabEvent[];
    const nextPage = Number(res.headers.get("x-next-page"));

    return {
      items,
      nextPage: Number.isFinite(nextPage) && nextPage > 0 ? nextPage : undefined,
    };
  });

  return events.map((event) => {
    const action = (event.action_name ?? "").toLowerCase();
    const target = (event.target_type ?? "").toLowerCase();

    return {
      date: event.created_at,
      commitCount: event.push_data?.commit_count ?? (action.includes("pushed") ? 1 : 0),
      mergeCount: target.includes("merge") || action.includes("merge") ? 1 : 0,
      prCount: 0,
      pipelineCount: target.includes("pipeline") ? 1 : 0,
    };
  });
}
