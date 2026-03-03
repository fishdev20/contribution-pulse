"use client";

import { useAppToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { useBackfillActionMutation } from "@/lib/api/hooks";
import { startSyncWatch } from "@/lib/sync-watch";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type BackfillJobRow = {
  id: string;
  year: number;
  provider: "GITLAB" | "AZURE_DEVOPS" | "GITHUB" | null;
  status: "queued" | "running" | "completed" | "failed";
  attemptCount: number;
  errorMessage: string | null;
  finishedAt: Date | null;
};

type Props = {
  jobs: BackfillJobRow[];
};

export function BackfillJobsPanel({ jobs }: Props) {
  const router = useRouter();
  const { pushToast } = useAppToast();
  const retryMutation = useBackfillActionMutation("retry");
  const deleteMutation = useBackfillActionMutation("delete");
  const cleanupMutation = useBackfillActionMutation("cleanup");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function postForm(action: "retry" | "delete" | "cleanup", jobId?: string) {
    const actionKey = `${action}:${jobId ?? "all"}`;
    setBusyAction(actionKey);

    try {
      if (action === "retry") await retryMutation.mutateAsync(jobId);
      if (action === "delete") await deleteMutation.mutateAsync(jobId);
      if (action === "cleanup") await cleanupMutation.mutateAsync(undefined);
      setBusyAction(null);
    } catch {
      setBusyAction(null);
      pushToast({ title: "Action failed", subtitle: "Please try again." }, "error");
      return;
    }
    if (action === "retry") {
      startSyncWatch();
      pushToast({ title: "Backfill retry queued", subtitle: "The worker will process it in background." }, "info");
    }
    if (action === "delete") pushToast({ title: "Backfill deleted", subtitle: "Record removed from list." }, "success");
    if (action === "cleanup") pushToast({ title: "Completed records cleared", subtitle: "Backfill history list cleaned." }, "success");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2">
      {jobs.length > 0 ? (
        <div className="mb-2 flex justify-end">
          <Button
            size="sm"
            variant="destructive"
            type="button"
            disabled={busyAction === "cleanup:all"}
            onClick={() => postForm("cleanup")}
          >
            {busyAction === "cleanup:all" ? <span className="flex gap-1"><Loader2 className="size-4 animate-spin" /> Cleaning...</span> : <span className="flex gap-1"><Trash2 /> Clean completed</span>}
          </Button>
        </div>
      ) : null}

      {jobs.map((job) => (
        <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            {renderBackfillStatusIcon(job.status)}
            <span className="font-medium">{job.year}</span>
            <span className="text-muted-foreground">• {formatProvider(job.provider)}</span>
            <span className="text-muted-foreground">• {formatBackfillStatus(job.status)}</span>
            <span className="text-muted-foreground">• attempt {job.attemptCount}</span>
          </div>
          <div className="flex items-center gap-2">
            {job.status === "failed" && job.errorMessage ? (
              <span className="max-w-[480px] truncate text-xs text-red-600" title={job.errorMessage}>
                {job.errorMessage}
              </span>
            ) : null}
            {job.status === "failed" ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                type="button"
                disabled={busyAction === `retry:${job.id}`}
                onClick={() => postForm("retry", job.id)}
              >
                <RefreshCw className={busyAction === `retry:${job.id}` ? "size-4 animate-spin" : "size-4"} />
                Retry
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="destructive"
              className="gap-1"
              type="button"
              disabled={busyAction === `delete:${job.id}`}
              onClick={() => postForm("delete", job.id)}
            >
              {busyAction === `delete:${job.id}` ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
      {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No historical backfill jobs yet.</p> : null}
    </div>
  );
}

function formatProvider(provider: "GITLAB" | "AZURE_DEVOPS" | "GITHUB" | null): string {
  if (provider === "GITLAB") return "GitLab";
  if (provider === "AZURE_DEVOPS") return "Azure DevOps";
  if (provider === "GITHUB") return "GitHub";
  return "All providers";
}

function formatBackfillStatus(status: BackfillJobRow["status"]): string {
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "completed") return "Completed";
  return "Failed";
}

function renderBackfillStatusIcon(status: BackfillJobRow["status"]) {
  if (status === "queued") return <Clock3 className="size-4 text-amber-600" />;
  if (status === "running") return <RefreshCw className="size-4 animate-spin text-blue-600" />;
  if (status === "completed") return <CheckCircle2 className="size-4 text-green-600" />;
  if (status === "failed") return <XCircle className="size-4 text-red-600" />;
  return <AlertCircle className="size-4 text-muted-foreground" />;
}
