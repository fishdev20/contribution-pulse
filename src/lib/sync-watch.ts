const SYNC_WATCH_UNTIL_KEY = "pow_sync_watch_until";
const SYNC_WATCH_STARTED_AT_KEY = "pow_sync_watch_started_at";

function now(): number {
  return Date.now();
}

export function startSyncWatch(durationMs = 10 * 60 * 1000): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SYNC_WATCH_STARTED_AT_KEY, String(now()));
  localStorage.setItem(SYNC_WATCH_UNTIL_KEY, String(now() + durationMs));
}

export function clearSyncWatch(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SYNC_WATCH_UNTIL_KEY);
  localStorage.removeItem(SYNC_WATCH_STARTED_AT_KEY);
}

export function isSyncWatchActive(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(SYNC_WATCH_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  if (until > now()) return true;
  localStorage.removeItem(SYNC_WATCH_UNTIL_KEY);
  localStorage.removeItem(SYNC_WATCH_STARTED_AT_KEY);
  return false;
}

export function getSyncWatchStartedAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SYNC_WATCH_STARTED_AT_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
