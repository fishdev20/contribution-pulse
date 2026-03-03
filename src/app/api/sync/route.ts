import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";
import { enqueueUserSync } from "@/server/queue/queue";

export async function POST() {
  const { appUser } = await requireAppUser();
  await enqueueUserSync(appUser.id);
  return NextResponse.json({ ok: true });
}
