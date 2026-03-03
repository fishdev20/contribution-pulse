import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const { removeBackfillJobForUser } = await import("@/server/queue/queue");
  const form = await request.formData();
  const jobId = String(form.get("jobId") ?? "");
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "missing_job_id" }, { status: 400 });
  }

  const result = await removeBackfillJobForUser(appUser.id, jobId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "job_not_found_or_not_removable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
