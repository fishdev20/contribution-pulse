import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";
import { prisma } from "@/server/db/prisma";
import { getQueueBackend } from "@/server/queue/queue";

export async function GET() {
  const { appUser } = await requireAppUser();
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
    const [queuedJobCount, runningJobCount, failedJobCount, latestTerminal] = await Promise.all([
      (prisma as any).syncJob.count({
        where: { userId: appUser.id, status: "QUEUED" },
      }),
      (prisma as any).syncJob.count({
        where: { userId: appUser.id, status: "RUNNING" },
      }),
      (prisma as any).syncJob.count({
        where: { userId: appUser.id, status: "FAILED" },
      }),
      (prisma as any).syncJob.findFirst({
        where: {
          userId: appUser.id,
          status: { in: ["COMPLETED", "FAILED"] },
          finishedAt: { not: null },
        },
        orderBy: { finishedAt: "desc" },
        select: { status: true, finishedAt: true },
      }),
    ]);

    return NextResponse.json({
      runningCount,
      failedCount,
      latestSyncedAt,
      queuedJobCount,
      runningJobCount,
      failedJobCount,
      activeJobCount: queuedJobCount + runningJobCount,
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
    activeJobCount: runningCount,
    latestJobStatus: null,
    latestJobFinishedAt: null,
  });
}
