"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAppToast } from "@/components/providers";

type SyncEventPayload = {
  type: "sync_started" | "sync_completed" | "sync_failed";
  provider?: "GITLAB" | "AZURE_DEVOPS" | "GITHUB";
  backfillYear?: number;
  message?: string;
  timestamp: string;
};

export function DashboardLiveUpdater() {
  const router = useRouter();
  const { pushToast } = useAppToast();
  const latestEventKey = useRef<string | null>(null);

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

    return () => source.close();
  }, [pushToast, router]);

  return null;
}
