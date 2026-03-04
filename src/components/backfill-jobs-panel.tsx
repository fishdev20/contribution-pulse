"use client";

import { useAppToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { useBackfillActionMutation } from "@/lib/api/hooks";
import { startSyncWatch } from "@/lib/sync-watch";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

type BackfillGroup = {
  key: string;
  year: number;
  provider: BackfillJobRow["provider"];
  jobs: BackfillJobRow[];
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  status: BackfillJobRow["status"];
  latestError: string | null;
};

export function BackfillJobsPanel({ jobs }: Props) {
  const router = useRouter();
  const { pushToast } = useAppToast();
  const retryMutation = useBackfillActionMutation("retry");
  const deleteMutation = useBackfillActionMutation("delete");
  const cleanupMutation = useBackfillActionMutation("cleanup");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo<BackfillGroup[]>(() => {
    const map = new Map<string, BackfillGroup>();
    for (const job of jobs) {
      const key = `${job.year}:${job.provider ?? "ALL"}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          year: job.year,
          provider: job.provider,
          jobs: [job],
          queuedCount: job.status === "queued" ? 1 : 0,
          runningCount: job.status === "running" ? 1 : 0,
          completedCount: job.status === "completed" ? 1 : 0,
          failedCount: job.status === "failed" ? 1 : 0,
          status: job.status,
          latestError: job.status === "failed" ? job.errorMessage : null,
        });
        continue;
      }

      existing.jobs.push(job);
      if (job.status === "queued") existing.queuedCount += 1;
      if (job.status === "running") existing.runningCount += 1;
      if (job.status === "completed") existing.completedCount += 1;
      if (job.status === "failed") {
        existing.failedCount += 1;
        if (!existing.latestError && job.errorMessage) existing.latestError = job.errorMessage;
      }
    }

    const list = Array.from(map.values()).map((group) => {
      const sortedJobs = [...group.jobs].sort((a, b) => {
        const rank = { running: 0, queued: 1, failed: 2, completed: 3 } as const;
        return rank[a.status] - rank[b.status];
      });
      let status: BackfillJobRow["status"] = "completed";
      if (group.runningCount > 0) status = "running";
      else if (group.queuedCount > 0) status = "queued";
      else if (group.failedCount > 0) status = "failed";
      return { ...group, jobs: sortedJobs, status };
    });

    return list.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return formatProvider(a.provider).localeCompare(formatProvider(b.provider));
    });
  }, [jobs]);

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

  async function runGroupAction(action: "retry-group" | "delete-group", group: BackfillGroup) {
    const key = `${action}:${group.key}`;
    setBusyAction(key);

    try {
      if (action === "retry-group") {
        const failedJobs = group.jobs.filter((job) => job.status === "failed");
        await Promise.all(failedJobs.map((job) => retryMutation.mutateAsync(job.id)));
        if (failedJobs.length > 0) {
          startSyncWatch();
          pushToast(
            { title: "Backfill retries queued", subtitle: `${failedJobs.length} failed chunk${failedJobs.length > 1 ? "s" : ""} requeued.` },
            "info",
          );
        }
      } else {
        const deletableJobs = group.jobs.filter((job) => job.status !== "running");
        await Promise.all(deletableJobs.map((job) => deleteMutation.mutateAsync(job.id)));
        pushToast(
          { title: "Backfill group cleaned", subtitle: `${deletableJobs.length} chunk${deletableJobs.length > 1 ? "s" : ""} removed.` },
          "success",
        );
      }
    } catch {
      pushToast({ title: "Action failed", subtitle: "Please try again." }, "error");
    } finally {
      setBusyAction(null);
      router.refresh();
    }
  }

  return (
    <div className="mt-4 space-y-2">
      {groups.length > 0 ? (
        <div className="mb-2 flex justify-end">
          <Button
            size="sm"
            variant="destructive"
            type="button"
            disabled={busyAction === "cleanup:all"}
            onClick={() => postForm("cleanup")}
          >
            {busyAction === "cleanup:all" ? (
              <span className="flex gap-1">
                <Loader2 className="size-4 animate-spin" /> Cleaning...
              </span>
            ) : (
              <span className="flex gap-1">
                <Trash2 />
                Clean completed
              </span>
            )}
          </Button>
        </div>
      ) : null}

      {groups.map((group) => {
        const expanded = Boolean(expandedGroups[group.key]);
        const canRetryFailed = group.failedCount > 0;
        const deletableCount = group.jobs.filter((job) => job.status !== "running").length;

        return (
          <div key={group.key} className="rounded-md border border-border/60 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-left"
                onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.key]: !expanded }))}
              >
                {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                {renderBackfillStatusIcon(group.status)}
                <span className="font-medium">{group.year}</span>
                <span className="text-muted-foreground">• {formatProvider(group.provider)}</span>
                <span className="text-muted-foreground">• {group.completedCount}/{group.jobs.length} completed</span>
                {group.runningCount > 0 ? <span className="text-blue-600">• {group.runningCount} running</span> : null}
                {group.queuedCount > 0 ? <span className="text-amber-600">• {group.queuedCount} queued</span> : null}
                {group.failedCount > 0 ? <span className="text-red-600">• {group.failedCount} failed</span> : null}
              </button>
              <div className="flex items-center gap-2">
                {canRetryFailed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={busyAction === `retry-group:${group.key}`}
                    onClick={() => runGroupAction("retry-group", group)}
                    className="gap-1"
                  >
                    <RefreshCw className={busyAction === `retry-group:${group.key}` ? "size-4 animate-spin" : "size-4"} />
                    Retry failed
                  </Button>
                ) : null}
                <Button
                  size="icon"
                  variant="destructive"
                  type="button"
                  disabled={deletableCount === 0 || busyAction === `delete-group:${group.key}`}
                  onClick={() => runGroupAction("delete-group", group)}
                >
                  {busyAction === `delete-group:${group.key}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            </div>
            {expanded ? (
              <div className="space-y-2 border-t border-border/60 px-3 py-2">
                {group.jobs.map((job) => (
                  <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      {renderBackfillStatusIcon(job.status)}
                      <span className="text-muted-foreground">{formatBackfillStatus(job.status)}</span>
                      <span className="text-muted-foreground">• attempt {job.attemptCount}</span>
                      {job.status === "failed" && job.errorMessage ? (
                        <span className="max-w-[480px] truncate text-red-600" title={job.errorMessage}>
                          • {job.errorMessage}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === "failed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          className="h-7 gap-1 px-2 text-xs"
                          disabled={busyAction === `retry:${job.id}`}
                          onClick={() => postForm("retry", job.id)}
                        >
                          <RefreshCw className={busyAction === `retry:${job.id}` ? "size-3 animate-spin" : "size-3"} />
                          Retry
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        type="button"
                        disabled={job.status === "running" || busyAction === `delete:${job.id}`}
                        onClick={() => postForm("delete", job.id)}
                      >
                        {busyAction === `delete:${job.id}` ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
                {group.latestError ? <p className="text-xs text-red-600">{group.latestError}</p> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {groups.length === 0 ? <p className="text-sm text-muted-foreground">No historical backfill jobs yet.</p> : null}
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
