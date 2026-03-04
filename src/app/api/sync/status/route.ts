import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";
import { prisma } from "@/server/db/prisma";
import { getQueueBackend } from "@/server/queue/queue";

function parseSinceParam(request: Request): Date | null {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  if (!since) return null;
  const parsed = new Date(since);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: Request) {
  const { appUser } = await requireAppUser();
  const since = parseSinceParam(request);
  const integrations = await prisma.integration.findMany({
    where: { userId: appUser.id },
    select: { syncState: true, lastSyncedAt: true },
  });

  const runningCount = integrations.filter((integration: any) => integration.syncState === "RUNNING").length;
  const failedCount = integrations.filter((integration: any) => integration.syncState === "FAILED").length;
  const latestSyncedAt = integrations
    .map((integration: any) => integration.lastSyncedAt?.toISOString() ?? null)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  if (getQueueBackend() === "supabase") {
    const whereBase: any = { userId: appUser.id };
    if (since) whereBase.createdAt = { gte: since };

    const [queuedJobCount, runningJobCount, failedJobCount, completedJobCount, latestTerminal] = await Promise.all([
      (prisma as any).syncJob.count({
        where: { ...whereBase, status: "QUEUED" },
      }),
      (prisma as any).syncJob.count({
        where: { ...whereBase, status: "RUNNING" },
      }),
      (prisma as any).syncJob.count({
        where: { ...whereBase, status: "FAILED" },
      }),
      (prisma as any).syncJob.count({
        where: { ...whereBase, status: "COMPLETED" },
      }),
      (prisma as any).syncJob.findFirst({
        where: {
          ...whereBase,
          status: { in: ["COMPLETED", "FAILED"] },
          finishedAt: { not: null },
        },
        orderBy: { finishedAt: "desc" },
        select: { status: true, finishedAt: true },
      }),
    ]);
    const activeJobCount = queuedJobCount + runningJobCount;
    const totalJobCount = queuedJobCount + runningJobCount + failedJobCount + completedJobCount;
    const finishedJobCount = failedJobCount + completedJobCount;
    const progressPercent = totalJobCount > 0 ? Math.round((finishedJobCount / totalJobCount) * 100) : null;

    return NextResponse.json({
      runningCount,
      failedCount,
      latestSyncedAt,
      queuedJobCount,
      runningJobCount,
      failedJobCount,
      completedJobCount,
      activeJobCount,
      totalJobCount,
      finishedJobCount,
      progressPercent,
      latestJobStatus: latestTerminal?.status ?? null,
      latestJobFinishedAt: latestTerminal?.finishedAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({
    runningCount,
    failedCount,
    latestSyncedAt,
    queuedJobCount: 0,
    runningJobCount: 0,
    failedJobCount: 0,
    completedJobCount: 0,
    activeJobCount: runningCount,
    totalJobCount: 0,
    finishedJobCount: 0,
    progressPercent: null,
    latestJobStatus: null,
    latestJobFinishedAt: null,
  });
}
