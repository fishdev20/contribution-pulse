import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAppUser } from "@/server/auth/user";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const form = await request.formData();
  const raw = String(form.get("emails") ?? "");

  const emails = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  await prisma.integration.updateMany({
    where: { userId: appUser.id },
    data: { authorEmails: emails },
  });

  return NextResponse.json({ ok: true });
}
