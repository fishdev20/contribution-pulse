import { safeLog } from "@/server/crypto/logging";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const lastRequestAt = new Map<string, number>();

export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  config: { retries?: number; minIntervalMs?: number } = {},
): Promise<Response> {
  const retries = config.retries ?? 4;
  const minIntervalMs = config.minIntervalMs ?? 250;

  let attempt = 0;
  const host = new URL(input).host;
  while (attempt <= retries) {
    try {
      const hostKey = host;
      const now = Date.now();
      const previous = lastRequestAt.get(hostKey) ?? 0;
      const elapsed = now - previous;
      if (elapsed < minIntervalMs) await sleep(minIntervalMs - elapsed);
      lastRequestAt.set(hostKey, Date.now());
      if (attempt > 0) await sleep(minIntervalMs * attempt);
      const res = await fetch(input, init);
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`Retryable HTTP ${res.status}`);
      }
      return res;
    } catch (error) {
      attempt += 1;
      safeLog("warn", "Transient API failure", { host, attempt, error });
      if (attempt > retries) throw error;
    }
  }

  throw new Error("unreachable");
}

export async function paginateByPage<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; nextPage?: number }>,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const { items, nextPage } = await fetchPage(page);
    all.push(...items);
    if (!nextPage) break;
    page = nextPage;
  }

  return all;
}

export async function paginateByContinuation<T>(
  fetchBatch: (continuationToken?: string) => Promise<{ items: T[]; continuationToken?: string }>,
): Promise<T[]> {
  const all: T[] = [];
  let token: string | undefined;

  while (true) {
    const batch = await fetchBatch(token);
    all.push(...batch.items);
    if (!batch.continuationToken) break;
    token = batch.continuationToken;
  }

  return all;
}
