import { prisma } from "@/server/db/prisma";
import { safeLog } from "@/server/crypto/logging";
import { publishSyncEvent } from "@/server/queue/sync-events";
import { syncUserContributions } from "@/server/sync/syncService";

const MAX_BATCH_SIZE = 20;
const SyncJobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

function toBackoffMs(attemptCount: number): number {
  return Math.min(60_000, 1_000 * 2 ** Math.max(0, attemptCount - 1));
}

export async function processSupabaseSyncQueue(limit = 5): Promise<{ picked: number; completed: number; failed: number }> {
  const batchSize = Math.max(1, Math.min(MAX_BATCH_SIZE, limit));
  const now = new Date();
  const candidates = await (prisma as any).syncJob.findMany({
    where: {
      status: SyncJobStatus.QUEUED,
      availableAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let picked = 0;
  let completed = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const locked = await (prisma as any).syncJob.updateMany({
      where: {
        id: candidate.id,
        status: SyncJobStatus.QUEUED,
      },
      data: {
        status: SyncJobStatus.RUNNING,
        startedAt: new Date(),
        lockedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });
    if (locked.count === 0) continue;
    picked += 1;

    try {
      await publishSyncEvent({
        type: "sync_started",
        userId: candidate.userId,
        provider: candidate.provider ?? undefined,
        backfillYear: candidate.backfillYear ?? undefined,
      });

      await syncUserContributions(candidate.userId, {
        from: candidate.from?.toISOString(),
        to: candidate.to?.toISOString(),
        provider: candidate.provider ?? undefined,
        backfillYear: candidate.backfillYear ?? undefined,
      });

      await (prisma as any).syncJob.update({
        where: { id: candidate.id },
        data: {
          status: SyncJobStatus.COMPLETED,
          finishedAt: new Date(),
          errorMessage: null,
        },
      });

      await publishSyncEvent({
        type: "sync_completed",
        userId: candidate.userId,
        provider: candidate.provider ?? undefined,
        backfillYear: candidate.backfillYear ?? undefined,
      });
      completed += 1;
    } catch (error) {
      const latest = await (prisma as any).syncJob.findUnique({ where: { id: candidate.id } });
      const attempts = latest?.attemptCount ?? 1;
      const shouldRetry = attempts < (latest?.maxAttempts ?? 3);
      const nextRunAt = new Date(Date.now() + toBackoffMs(attempts));

      await (prisma as any).syncJob.update({
        where: { id: candidate.id },
        data: {
          status: shouldRetry ? SyncJobStatus.QUEUED : SyncJobStatus.FAILED,
          availableAt: shouldRetry ? nextRunAt : new Date(),
          finishedAt: shouldRetry ? null : new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      await publishSyncEvent({
        type: "sync_failed",
        userId: candidate.userId,
        provider: candidate.provider ?? undefined,
        backfillYear: candidate.backfillYear ?? undefined,
        message: error instanceof Error ? error.message : "Sync failed",
      });
      safeLog("error", "Supabase queue sync job failed", { jobId: candidate.id, error });
      failed += 1;
    }
  }

  return { picked, completed, failed };
}
