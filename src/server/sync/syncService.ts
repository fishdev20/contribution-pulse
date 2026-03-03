import { prisma } from "@/server/db/prisma";
import { decryptSecret } from "@/server/crypto/encryption";
import { safeLog } from "@/server/crypto/logging";
import { aggregateDaily, toDailyUpserts, EventMetric } from "@/server/sync/aggregation";
import { fetchGitlabDailyMetrics } from "@/server/integrations/gitlab";
import { fetchAzureDailyMetrics } from "@/server/integrations/azureDevops";
import { fetchGithubDailyMetrics } from "@/server/integrations/github";
import type { SyncJobOptions } from "@/server/queue/queue";

function buildSyncWindow(lastSyncedAt?: Date | null) {
  const now = new Date();
  if (!lastSyncedAt) {
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 90);
    return { from, to: now };
  }

  const from = new Date(lastSyncedAt);
  from.setUTCDate(from.getUTCDate() - 1);
  return { from, to: now };
}

export async function syncUserContributions(userId: string, options?: SyncJobOptions): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { integrations: true },
  });

  if (!user) throw new Error("User not found");

  for (const integration of user.integrations) {
    if (options?.provider && integration.provider !== options.provider) {
      continue;
    }

    await prisma.integration.update({ where: { id: integration.id }, data: { syncState: "RUNNING" } });

    try {
      const hasCustomRange = Boolean(options?.from && options?.to);
      const { from, to } = hasCustomRange
        ? { from: new Date(options!.from!), to: new Date(options!.to!) }
        : buildSyncWindow(integration.lastSyncedAt);
      const token = decryptSecret({
        ciphertext: integration.encryptedToken,
        iv: integration.tokenIv,
        tag: integration.tokenTag,
      });

      let events: EventMetric[] = [];
      if (integration.provider === "GITLAB") {
        events = await fetchGitlabDailyMetrics({
          token,
          baseUrl: integration.gitlabBaseUrl,
          from,
          to,
        });
      } else if (integration.provider === "AZURE_DEVOPS") {
        if (!integration.azureOrg) throw new Error("Azure org missing");
        events = await fetchAzureDailyMetrics({
          token,
          organization: integration.azureOrg,
          from,
          to,
          authorEmails: integration.authorEmails,
          fallbackEmail: user.email,
        });
      } else {
        events = await fetchGithubDailyMetrics({
          token,
          from,
          to,
          authorEmails: integration.authorEmails,
        });
      }

      const daily = aggregateDaily(events);
      const upserts = toDailyUpserts(user.id, integration.provider, daily);

      await prisma.$transaction(upserts.map((upsert) => prisma.dailyActivity.upsert(upsert as any)));
      safeLog("info", "Sync completed", {
        userId,
        provider: integration.provider,
        from: from.toISOString(),
        to: to.toISOString(),
        eventCount: events.length,
        dayCount: daily.size,
      });
      await prisma.integration.update({
        where: { id: integration.id },
        data: { syncState: "IDLE", lastSyncedAt: new Date() },
      });
    } catch (error) {
      await prisma.integration.update({ where: { id: integration.id }, data: { syncState: "FAILED" } });
      safeLog("error", "Sync failed", { userId, provider: integration.provider, error });
    }
  }
}
