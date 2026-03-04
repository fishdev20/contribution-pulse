import { EventMetric } from "@/server/sync/aggregation";
import { fetchWithRetry, paginateByContinuation } from "@/server/integrations/http";
import { safeLog } from "@/server/crypto/logging";

type AzureProject = { name: string; id: string };
type AzureRepo = { id: string };
type AzureCommit = { author?: { date?: string } };

function authHeader(pat: string): string {
  return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
}

async function azureApiError(label: string, res: Response): Promise<Error> {
  let bodyPreview = "";
  try {
    bodyPreview = (await res.text()).slice(0, 240);
  } catch {
    bodyPreview = "";
  }
  return new Error(`${label} failed (${res.status} ${res.statusText})${bodyPreview ? `: ${bodyPreview}` : ""}`);
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function collectAzureIdentityCandidates(data: any): string[] {
  const candidates: string[] = [];
  const user = data?.authenticatedUser ?? {};
  const props = user?.properties ?? {};

  const push = (value: unknown) => {
    const picked = pickString(value);
    if (picked) candidates.push(picked);
  };

  push(user?.uniqueName);
  push(user?.providerDisplayName);
  push(user?.customDisplayName);

  // Try common property keys where Azure may return account/email-like values.
  const propertyKeys = ["Mail", "Email", "Account", "account", "SignInAddress", "IdentityType"];
  for (const key of propertyKeys) {
    const candidate = props?.[key];
    push(candidate?.$value);
    push(candidate?.value);
    push(candidate);
  }

  return candidates;
}

async function fetchAzureIdentityAuthors(baseUrl: string, headers: Record<string, string>): Promise<string[]> {
  try {
    const url = new URL(`${baseUrl}/_apis/connectionData`);
    url.searchParams.set("api-version", "7.1-preview.1");
    url.searchParams.set("connectOptions", "1");
    url.searchParams.set("lastChangeId", "-1");
    url.searchParams.set("lastChangeId64", "-1");

    const res = await fetchWithRetry(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) return [];

    const data = await res.json();
    return collectAzureIdentityCandidates(data);
  } catch {
    return [];
  }
}

export async function fetchAzureDailyMetrics(params: {
  token: string;
  organization: string;
  from: Date;
  to: Date;
  authorEmails: string[];
  fallbackEmail: string;
}): Promise<EventMetric[]> {
  const org = params.organization;
  const baseUrl = `https://dev.azure.com/${encodeURIComponent(org)}`;
  const headers = {
    Authorization: authHeader(params.token),
    "Content-Type": "application/json",
  };

  const projects = await paginateByContinuation<AzureProject>(async (continuationToken) => {
    const url = new URL(`${baseUrl}/_apis/projects`);
    url.searchParams.set("api-version", "7.1-preview.4");
    url.searchParams.set("$top", "100");
    if (continuationToken) url.searchParams.set("continuationToken", continuationToken);

    const res = await fetchWithRetry(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) throw await azureApiError("Azure projects API", res);

    const data = (await res.json()) as { value?: AzureProject[] };
    return {
      items: data.value ?? [],
      continuationToken: res.headers.get("x-ms-continuationtoken") ?? undefined,
    };
  });

  const identityCandidates = await fetchAzureIdentityAuthors(baseUrl, headers);
  const authorEmails = Array.from(
    new Set([params.fallbackEmail, ...params.authorEmails, ...identityCandidates].map((item) => item.trim().toLowerCase()).filter(Boolean)),
  );
  const events: EventMetric[] = [];

  for (const project of projects) {
    const repoRes = await fetchWithRetry(
      `${baseUrl}/${encodeURIComponent(project.id)}/_apis/git/repositories?api-version=7.1-preview.1`,
      { headers, cache: "no-store" },
    );
    if (!repoRes.ok) throw await azureApiError("Azure repositories API", repoRes);

    const repoData = (await repoRes.json()) as { value?: AzureRepo[] };
    const repos = repoData.value ?? [];

    for (const repo of repos) {
      for (const email of authorEmails) {
        let commits: AzureCommit[] = [];
        try {
          commits = await paginateByContinuation<AzureCommit>(async (continuationToken) => {
            const url = new URL(
              `${baseUrl}/${encodeURIComponent(project.id)}/_apis/git/repositories/${encodeURIComponent(repo.id)}/commits`,
            );
            url.searchParams.set("api-version", "7.1-preview.1");
            url.searchParams.set("searchCriteria.fromDate", params.from.toISOString());
            url.searchParams.set("searchCriteria.toDate", params.to.toISOString());
            url.searchParams.set("searchCriteria.author", email);
            url.searchParams.set("searchCriteria.$top", "100");
            if (continuationToken) url.searchParams.set("continuationToken", continuationToken);

            const res = await fetchWithRetry(url.toString(), { headers, cache: "no-store" });
            if (!res.ok) throw await azureApiError("Azure commits API", res);
            const data = (await res.json()) as { value?: AzureCommit[] };

            return {
              items: data.value ?? [],
              continuationToken: res.headers.get("x-ms-continuationtoken") ?? undefined,
            };
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // Skip repositories not visible to the token instead of failing the entire provider sync.
          if (message.includes("Azure commits API failed (404") || message.includes("Azure commits API failed (403")) {
            safeLog("warn", "Skipping inaccessible Azure repository during sync", {
              provider: "AZURE_DEVOPS",
              projectId: project.id,
              repoId: repo.id,
              email,
              error,
            });
            continue;
          }
          throw error;
        }

        for (const commit of commits) {
          if (!commit.author?.date) continue;
          events.push({ date: commit.author.date, commitCount: 1, prCount: 0, mergeCount: 0, pipelineCount: 0 });
        }
      }
    }
  }

  return events;
}
