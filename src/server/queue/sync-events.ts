import IORedis from "ioredis";
import { safeLog } from "@/server/crypto/logging";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const CHANNEL_PREFIX = "pow:sync-events:user:";

export type SyncEventType = "sync_started" | "sync_completed" | "sync_failed";

export type SyncEventPayload = {
  type: SyncEventType;
  userId: string;
  provider?: "GITLAB" | "AZURE_DEVOPS" | "GITHUB";
  backfillYear?: number;
  timestamp: string;
  message?: string;
};

function getChannel(userId: string): string {
  return `${CHANNEL_PREFIX}${userId}`;
}

export async function publishSyncEvent(payload: Omit<SyncEventPayload, "timestamp">): Promise<void> {
  const publisher = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  try {
    const eventPayload: SyncEventPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    await publisher.publish(getChannel(payload.userId), JSON.stringify(eventPayload));
  } catch (error) {
    safeLog("warn", "Failed to publish sync event", { payload, error });
  } finally {
    publisher.disconnect();
  }
}

export function createSyncEventSubscriber() {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function getSyncEventsChannelForUser(userId: string): string {
  return getChannel(userId);
}
