"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAppToast } from "@/components/providers";
import { clearSyncWatch, getSyncWatchStartedAt, isSyncWatchActive } from "@/lib/sync-watch";

type SyncEventPayload = {
  type: "sync_started" | "sync_completed" | "sync_failed";
  provider?: "GITLAB" | "AZURE_DEVOPS" | "GITHUB";
  backfillYear?: number;
  message?: string;
  timestamp: string;
};

type SyncStatusPayload = {
  activeJobCount?: number;
  latestJobStatus?: "COMPLETED" | "FAILED" | null;
  latestJobFinishedAt?: string | null;
};

export function DashboardLiveUpdater() {
  const router = useRouter();
  const { pushToast } = useAppToast();
  const latestEventKey = useRef<string | null>(null);
  const hasAnnouncedStart = useRef(false);
  const latestTerminalRef = useRef<string | null>(null);
  const latestRefreshedTerminalRef = useRef<string | null>(null);
  const NO_ACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;

  useEffect(() => {
    const source = new EventSource("/api/sync/events");

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SyncEventPayload;
        const dedupeKey = `${payload.type}:${payload.timestamp}`;
        if (latestEventKey.current === dedupeKey) return;
        latestEventKey.current = dedupeKey;

        if (payload.type === "sync_started") {
          pushToast(
            {
              title: "Sync started",
              subtitle: "Background processing is running.",
            },
            "info",
          );
          return;
        }

        router.refresh();
        if (payload.type === "sync_completed") {
          pushToast(
            {
              title: "Sync complete",
              subtitle: "Dashboard data has been refreshed.",
            },
            "success",
          );
          return;
        }
        pushToast(
          {
            title: "Sync failed",
            subtitle: payload.message ?? "Please check provider token/scope and retry.",
          },
          "error",
        );
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      // EventSource auto-reconnects.
    };

    const pollId = setInterval(async () => {
      if (!isSyncWatchActive()) return;
      try {
        const response = await fetch("/api/sync/status", { cache: "no-store" });
        if (!response.ok) return;
        const status = (await response.json()) as SyncStatusPayload;
        const watchStartedAt = getSyncWatchStartedAt();
        const activeJobCount = Number(status.activeJobCount ?? 0);
        const terminalTime = status.latestJobFinishedAt ? Date.parse(status.latestJobFinishedAt) : NaN;
        const terminalKey = status.latestJobFinishedAt ? `${status.latestJobStatus ?? "UNKNOWN"}:${status.latestJobFinishedAt}` : null;
        const isFromCurrentWatch =
          Number.isFinite(terminalTime) && watchStartedAt !== null ? terminalTime >= watchStartedAt : false;
        const hasTerminalForCurrentWatch = Boolean(terminalKey && isFromCurrentWatch);

        if (activeJobCount > 0 && !hasAnnouncedStart.current) {
          hasAnnouncedStart.current = true;
          pushToast(
            {
              title: "Sync started",
              subtitle: "Background processing is running.",
            },
            "info",
          );
          return;
        }

        // Incremental refresh: when a new chunk/job reaches terminal state for the current
        // watch window, refresh dashboard so newly aggregated days appear immediately.
        if (hasTerminalForCurrentWatch && terminalKey && latestRefreshedTerminalRef.current !== terminalKey) {
          latestRefreshedTerminalRef.current = terminalKey;
          router.refresh();
        }

        if (activeJobCount === 0 && hasTerminalForCurrentWatch) {
          if (terminalKey && latestTerminalRef.current !== terminalKey && isFromCurrentWatch) {
            latestTerminalRef.current = terminalKey;
            if (status.latestJobStatus === "FAILED") {
              pushToast(
                {
                  title: "Sync failed",
                  subtitle: "Please check provider token/scope and retry.",
                },
                "error",
              );
            } else {
              pushToast(
                {
                  title: "Sync complete",
                  subtitle: "Dashboard data has been refreshed.",
                },
                "success",
              );
            }
          }

          clearSyncWatch();
          hasAnnouncedStart.current = false;
          latestRefreshedTerminalRef.current = null;
          router.refresh();
          return;
        }

        // Safety valve: if no active jobs are observed for a long time and no terminal
        // event can be associated to this watch window, stop polling loop.
        if (activeJobCount === 0 && watchStartedAt && Date.now() - watchStartedAt > NO_ACTIVITY_TIMEOUT_MS) {
          clearSyncWatch();
          hasAnnouncedStart.current = false;
          latestRefreshedTerminalRef.current = null;
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => {
      source.close();
      clearInterval(pollId);
    };
  }, [pushToast, router]);

  return null;
}
