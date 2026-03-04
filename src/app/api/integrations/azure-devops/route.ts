import { NextResponse } from "next/server";
import { encryptSecret } from "@/server/crypto/encryption";
import { prisma } from "@/server/db/prisma";
import { requireAppUser } from "@/server/auth/user";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const form = await request.formData();

  const token = String(form.get("token") ?? "").trim();
  const organization = String(form.get("organization") ?? "").trim();

  if (!token || !organization) {
    return NextResponse.json({ ok: false, error: "azure_missing_fields" }, { status: 400 });
  }

  const encrypted = encryptSecret(token);
  const existingAliases = await prisma.integration.findMany({
    where: { userId: appUser.id },
    select: { authorEmails: true },
  });
  const authorEmails = Array.from(
    new Set(existingAliases.flatMap((item) => item.authorEmails).map((email) => email.trim().toLowerCase()).filter(Boolean)),
  );

  await prisma.integration.upsert({
    where: {
      userId_provider: { userId: appUser.id, provider: "AZURE_DEVOPS" },
    },
    create: {
      userId: appUser.id,
      provider: "AZURE_DEVOPS",
      encryptedToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
      azureOrg: organization,
      authorEmails,
    },
    update: {
      encryptedToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
      azureOrg: organization,
    },
  });

  return NextResponse.json({ ok: true });
}
