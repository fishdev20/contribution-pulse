import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAppUser } from "@/server/auth/user";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => ({}))) as { revoke?: boolean; token?: string };
    if (payload.revoke) {
      const token = String(payload.token ?? "");
      await prisma.publicShare.updateMany({
        where: { userId: appUser.id, token },
        data: { revokedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }
  }

  const form = await request.formData().catch(() => new FormData());
  const expiresInDaysRaw = String(form.get("expiresInDays") ?? "").trim();
  const expiresInDays = expiresInDaysRaw ? Number(expiresInDaysRaw) : undefined;

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  await prisma.publicShare.create({
    data: {
      userId: appUser.id,
      token,
      expiresAt,
    },
  });

  return NextResponse.json({ ok: true, token, expiresAt: expiresAt?.toISOString() ?? null });
}
