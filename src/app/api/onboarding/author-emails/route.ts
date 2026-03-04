import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAppUser } from "@/server/auth/user";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const form = await request.formData();
  const raw = String(form.get("emails") ?? "");
  const providerRaw = String(form.get("provider") ?? "").trim();

  const emails = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const provider =
    providerRaw === "GITLAB" || providerRaw === "AZURE_DEVOPS" || providerRaw === "GITHUB"
      ? providerRaw
      : undefined;

  await prisma.integration.updateMany({
    where: provider ? { userId: appUser.id, provider } : { userId: appUser.id },
    data: { authorEmails: emails },
  });

  return NextResponse.json({ ok: true });
}
