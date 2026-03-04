"use client";

import { Button } from "@/components/ui/button";
import { useSyncMutation } from "@/lib/api/hooks";
import { useAppToast } from "@/components/providers";
import { isSyncWatchActive, startSyncWatch } from "@/lib/sync-watch";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const { pushToast } = useAppToast();
  const syncMutation = useSyncMutation();
  const [state, setState] = useState<"idle" | "queueing" | "queued" | "failed">("idle");
  const [watchActive, setWatchActive] = useState(false);

  useEffect(() => {
    setWatchActive(isSyncWatchActive());
    const timer = setInterval(() => {
      setWatchActive(isSyncWatchActive());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function trigger() {
    if (watchActive || state === "queueing") return;
    setState("queueing");
    try {
      await syncMutation.mutateAsync();
      setState("queued");
      startSyncWatch();
      setWatchActive(true);
      pushToast(
        {
          title: "Sync queued",
          subtitle: "We will notify you when background processing completes.",
        },
        "info",
      );
      router.refresh();
    } catch {
      setState("failed");
      pushToast({ title: "Sync failed", subtitle: "Unable to queue sync. Please try again." }, "error");
    }
  }

  const isBusy = state === "queueing" || watchActive;
  const label =
    isBusy
      ? "Syncing..."
      : state === "idle"
        ? "Sync now"
        : state === "queued"
          ? "Queued"
          : "Failed";

  return (
    <Button onClick={trigger} disabled={isBusy} className="gap-2" size={"lg"}>
      <RefreshCw className={isBusy ? "size-4 animate-spin" : "size-4"} />
      {label}
    </Button>
  );
}
