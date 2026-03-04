import { Queue } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/server/db/prisma";
import { safeLog } from "@/server/crypto/logging";

export type SyncProvider = "GITLAB" | "AZURE_DEVOPS" | "GITHUB";
export type QueueBackend = "bull" | "supabase";

const backend: QueueBackend = process.env.SYNC_QUEUE_BACKEND === "supabase" ? "supabase" : "bull";
let queueInstance: Queue | null = null;
function getSyncQueue(): Queue {
  if (queueInstance) return queueInstance;
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  queueInstance = new Queue("contribution-sync", { connection });
  return queueInstance;
}

export type SyncJobOptions = {
  from?: string;
  to?: string;
  provider?: SyncProvider;
  backfillYear?: number;
};

export type BackfillJobView = {
  id: string;
  year: number;
  provider: SyncProvider | null;
  status: "queued" | "running" | "completed" | "failed";
  attemptCount: number;
  errorMessage: string | null;
  finishedAt: Date | null;
};

const SyncJobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

function isBackfillJob(jobData: unknown): jobData is { userId: string; options: SyncJobOptions } {
  if (!jobData || typeof jobData !== "object") return false;
  const candidate = jobData as { userId?: unknown; options?: SyncJobOptions };
  return typeof candidate.userId === "string" && Number.isInteger(candidate.options?.backfillYear);
}

export async function enqueueUserSync(userId: string, options?: SyncJobOptions) {
  if (backend === "supabase") {
    await (prisma as any).syncJob.create({
      data: {
        userId,
        provider: options?.provider,
        from: options?.from ? new Date(options.from) : null,
        to: options?.to ? new Date(options.to) : null,
        backfillYear: options?.backfillYear ?? null,
        status: SyncJobStatus.QUEUED,
      },
    });
    return;
  }

  await getSyncQueue().add("sync-user", { userId, options }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
}

export async function scheduleNightlySync() {
  if (backend === "supabase") {
    safeLog("info", "Nightly sync schedule is managed via Supabase cron for supabase backend");
    return;
  }

  await getSyncQueue().add(
    "nightly-sync",
    {},
    {
      repeat: { pattern: "0 2 * * *" },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  );
}

export async function listBackfillJobsForUser(userId: string, limit = 8): Promise<BackfillJobView[]> {
  if (backend === "supabase") {
    const rows = await (prisma as any).syncJob.findMany({
      where: { userId, backfillYear: { not: null } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row: any) => ({
      id: row.id,
      year: row.backfillYear ?? 0,
      provider: (row.provider as SyncProvider | null) ?? null,
      status: row.status === "RUNNING" ? "running" : row.status === "COMPLETED" ? "completed" : row.status === "FAILED" ? "failed" : "queued",
      attemptCount: row.attemptCount,
      errorMessage: row.errorMessage,
      finishedAt: row.finishedAt,
    }));
  }

  try {
    const jobs = await getSyncQueue().getJobs(["waiting", "active", "completed", "failed", "delayed"], 0, 200);
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
  if (backend === "supabase") {
    const job = await (prisma as any).syncJob.findFirst({ where: { id: jobId, userId, backfillYear: { not: null } } });
    if (!job || job.status !== SyncJobStatus.FAILED) return { ok: false };
    await (prisma as any).syncJob.update({
      where: { id: job.id },
      data: {
        status: SyncJobStatus.QUEUED,
        availableAt: new Date(),
        errorMessage: null,
        finishedAt: null,
      },
    });
    return { ok: true, year: job.backfillYear ?? undefined };
  }

  try {
    const job = await getSyncQueue().getJob(jobId);
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
  if (backend === "supabase") {
    const result = await (prisma as any).syncJob.deleteMany({
      where: {
        id: jobId,
        userId,
        backfillYear: { not: null },
        status: { not: SyncJobStatus.RUNNING },
      },
    });
    return { ok: result.count > 0 };
  }

  try {
    const job = await getSyncQueue().getJob(jobId);
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
  if (backend === "supabase") {
    const result = await (prisma as any).syncJob.deleteMany({
      where: { userId, backfillYear: { not: null }, status: SyncJobStatus.COMPLETED },
    });
    return { removed: result.count };
  }

  try {
    const jobs = await getSyncQueue().getJobs(["completed"], 0, 300);
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

export function getQueueBackend(): QueueBackend {
  return backend;
}
