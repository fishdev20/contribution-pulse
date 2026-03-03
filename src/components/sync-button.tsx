"use client";

import { Button } from "@/components/ui/button";
import { useSyncMutation } from "@/lib/api/hooks";
import { useAppToast } from "@/components/providers";
import { startSyncWatch } from "@/lib/sync-watch";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const { pushToast } = useAppToast();
  const syncMutation = useSyncMutation();
  const [state, setState] = useState<"idle" | "queueing" | "queued" | "failed">("idle");

  async function trigger() {
    setState("queueing");
    try {
      await syncMutation.mutateAsync();
      setState("queued");
      startSyncWatch();
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

  const label = state === "idle" ? "Sync now" : state === "queueing" ? "Syncing..." : state === "queued" ? "Queued" : "Failed";

  return (
    <Button onClick={trigger} disabled={state === "queueing"} className="gap-2" size={"lg"}>
      <RefreshCw className={state === "queueing" ? "size-4 animate-spin" : "size-4"}/>
      {label}
    </Button>
  );
}
