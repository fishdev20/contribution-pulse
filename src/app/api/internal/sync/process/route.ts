import { NextResponse } from "next/server";
import { getQueueBackend } from "@/server/queue/queue";
import { processSupabaseSyncQueue } from "@/server/queue/supabase-processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  const xSecret = request.headers.get("x-cron-secret");
  return xSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (getQueueBackend() !== "supabase") {
    return NextResponse.json({ ok: false, error: "sync_queue_backend_not_supabase" }, { status: 400 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "5");
  const result = await processSupabaseSyncQueue(Number.isFinite(limit) ? limit : 5);

  return NextResponse.json({ ok: true, ...result });
}
