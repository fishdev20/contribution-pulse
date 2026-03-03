import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";

export async function POST() {
  const { appUser } = await requireAppUser();
  const { removeCompletedBackfillJobsForUser } = await import("@/server/queue/queue");
  const { removed } = await removeCompletedBackfillJobsForUser(appUser.id);
  return NextResponse.json({ ok: true, removed });
}
