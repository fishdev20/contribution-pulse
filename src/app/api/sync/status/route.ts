import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  const { appUser } = await requireAppUser();
  const integrations = await prisma.integration.findMany({
    where: { userId: appUser.id },
    select: { syncState: true, lastSyncedAt: true },
  });

  const runningCount = integrations.filter((integration) => integration.syncState === "RUNNING").length;
  const failedCount = integrations.filter((integration) => integration.syncState === "FAILED").length;
  const latestSyncedAt = integrations
    .map((integration) => integration.lastSyncedAt?.toISOString() ?? null)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return NextResponse.json({
    runningCount,
    failedCount,
    latestSyncedAt,
  });
}
