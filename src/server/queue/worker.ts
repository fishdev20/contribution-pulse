import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/server/db/prisma";
import { syncUserContributions } from "@/server/sync/syncService";
import { safeLog } from "@/server/crypto/logging";
import { publishSyncEvent } from "@/server/queue/sync-events";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const worker = new Worker(
  "contribution-sync",
  async (job) => {
    if (job.name === "sync-user") {
      await syncUserContributions(job.data.userId, job.data.options);
      return;
    }

    if (job.name === "nightly-sync") {
      const users = await prisma.user.findMany({ select: { id: true } });
      for (const user of users) {
        await syncUserContributions(user.id);
      }
    }
  },
  { connection, concurrency: 3 },
);

worker.on("active", (job) => {
  if (job.name !== "sync-user") return;
  const { userId, options } = job.data as {
    userId?: string;
    options?: { provider?: "GITLAB" | "AZURE_DEVOPS" | "GITHUB"; backfillYear?: number };
  };
  if (!userId) return;
  void publishSyncEvent({
    type: "sync_started",
    userId,
    provider: options?.provider,
    backfillYear: options?.backfillYear,
  });
});

worker.on("completed", (job) => {
  if (job.name !== "sync-user") return;
  const { userId, options } = job.data as {
    userId?: string;
    options?: { provider?: "GITLAB" | "AZURE_DEVOPS" | "GITHUB"; backfillYear?: number };
  };
  if (!userId) return;
  void publishSyncEvent({
    type: "sync_completed",
    userId,
    provider: options?.provider,
    backfillYear: options?.backfillYear,
  });
});

worker.on("failed", (job, err) => {
  if (job?.name === "sync-user") {
    const { userId, options } = (job.data ?? {}) as {
      userId?: string;
      options?: { provider?: "GITLAB" | "AZURE_DEVOPS" | "GITHUB"; backfillYear?: number };
    };
    if (userId) {
      void publishSyncEvent({
        type: "sync_failed",
        userId,
        provider: options?.provider,
        backfillYear: options?.backfillYear,
        message: err?.message ?? "Sync failed",
      });
    }
  }
  safeLog("error", "Queue job failed", { name: job?.name, err });
});
