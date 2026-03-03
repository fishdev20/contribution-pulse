import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";
import { createSyncEventSubscriber, getSyncEventsChannelForUser } from "@/server/queue/sync-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSse(data: unknown, event?: string): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  const lines = event ? `event: ${event}\n` : "";
  return new TextEncoder().encode(`${lines}data: ${payload}\n\n`);
}

export async function GET(request: Request) {
  const { appUser } = await requireAppUser();
  const channel = getSyncEventsChannelForUser(appUser.id);

  let cleanupRef: (() => Promise<void>) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const subscriber = createSyncEventSubscriber();
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const onMessage = (incomingChannel: string, message: string) => {
        if (incomingChannel !== channel) return;
        controller.enqueue(encodeSse(message));
      };

      subscriber.on("message", onMessage);
      await subscriber.subscribe(channel);

      controller.enqueue(encodeSse({ ok: true, connected: true, timestamp: new Date().toISOString() }, "connected"));
      heartbeatTimer = setInterval(() => {
        controller.enqueue(encodeSse({ t: Date.now() }, "ping"));
      }, 20000);

      cleanupRef = async () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        subscriber.off("message", onMessage);
        try {
          await subscriber.unsubscribe(channel);
        } finally {
          subscriber.disconnect();
        }
      };
    },
    async cancel() {
      if (cleanupRef) await cleanupRef();
    },
  });

  request.signal.addEventListener("abort", () => {
    if (cleanupRef) void cleanupRef();
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
