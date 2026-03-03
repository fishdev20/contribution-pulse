import { Queue } from "bullmq";
import IORedis from "ioredis";
import { safeLog } from "@/server/crypto/logging";

export type SyncProvider = "GITLAB" | "AZURE_DEVOPS" | "GITHUB";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const syncQueue = new Queue("contribution-sync", { connection });

export type SyncJobOptions = {
  from?: string;
  to?: string;
  provider?: SyncProvider;
  backfillYear?: number;
};

export async function enqueueUserSync(userId: string, options?: SyncJobOptions) {
  await syncQueue.add("sync-user", { userId, options }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
}

export async function scheduleNightlySync() {
  await syncQueue.add(
    "nightly-sync",
    {},
    {
      repeat: { pattern: "0 2 * * *" },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  );
}

export type BackfillJobView = {
  id: string;
  year: number;
  provider: SyncProvider | null;
  status: "queued" | "running" | "completed" | "failed";
  attemptCount: number;
  errorMessage: string | null;
  finishedAt: Date | null;
};

function isBackfillJob(jobData: unknown): jobData is { userId: string; options: SyncJobOptions } {
  if (!jobData || typeof jobData !== "object") return false;
  const candidate = jobData as { userId?: unknown; options?: SyncJobOptions };
  return typeof candidate.userId === "string" && Number.isInteger(candidate.options?.backfillYear);
}

export async function listBackfillJobsForUser(userId: string, limit = 8): Promise<BackfillJobView[]> {
  try {
    const jobs = await syncQueue.getJobs(["waiting", "active", "completed", "failed", "delayed"], 0, 200);
    const collected: BackfillJobView[] = [];

    for (const job of jobs) {
      if (job.name !== "sync-user") continue;
      if (!isBackfillJob(job.data)) continue;
      if (job.data.userId !== userId) continue;
      const state = await job.getState();
      const status = state === "active" ? "running" : state === "completed" ? "completed" : state === "failed" ? "failed" : "queued";

      collected.push({
        id: job.id ? String(job.id) : "",
        year: Number(job.data.options.backfillYear),
        provider: job.data.options.provider ?? null,
        status,
        attemptCount: job.attemptsMade,
        errorMessage: status === "failed" ? job.failedReason ?? "Sync failed" : null,
        finishedAt: typeof job.finishedOn === "number" ? new Date(job.finishedOn) : null,
      });
      if (collected.length >= limit) break;
    }

    return collected;
  } catch (error) {
    safeLog("warn", "Failed to list backfill jobs", { userId, error });
    return [];
  }
}

export async function retryBackfillJobForUser(userId: string, jobId: string): Promise<{ ok: boolean; year?: number }> {
  try {
    const job = await syncQueue.getJob(jobId);
    if (!job || job.name !== "sync-user" || !isBackfillJob(job.data) || job.data.userId !== userId) {
      return { ok: false };
    }

    const state = await job.getState();
    if (state !== "failed") {
      return { ok: false };
    }

    await job.retry();
    return { ok: true, year: Number(job.data.options.backfillYear) };
  } catch (error) {
    safeLog("warn", "Failed to retry backfill job", { userId, jobId, error });
    return { ok: false };
  }
}

export async function removeBackfillJobForUser(userId: string, jobId: string): Promise<{ ok: boolean }> {
  try {
    const job = await syncQueue.getJob(jobId);
    if (!job || job.name !== "sync-user" || !isBackfillJob(job.data) || job.data.userId !== userId) {
      return { ok: false };
    }
    await job.remove();
    return { ok: true };
  } catch (error) {
    safeLog("warn", "Failed to remove backfill job", { userId, jobId, error });
    return { ok: false };
  }
}

export async function removeCompletedBackfillJobsForUser(userId: string): Promise<{ removed: number }> {
  try {
    const jobs = await syncQueue.getJobs(["completed"], 0, 300);
    let removed = 0;

    for (const job of jobs) {
      if (job.name !== "sync-user") continue;
      if (!isBackfillJob(job.data) || job.data.userId !== userId) continue;
      await job.remove();
      removed += 1;
    }
    return { removed };
  } catch (error) {
    safeLog("warn", "Failed to remove completed backfill jobs", { userId, error });
    return { removed: 0 };
  }
}
