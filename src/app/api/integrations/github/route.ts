import { NextResponse } from "next/server";
import { encryptSecret } from "@/server/crypto/encryption";
import { prisma } from "@/server/db/prisma";
import { requireAppUser } from "@/server/auth/user";

const PROVIDER_GITHUB = "GITHUB";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const form = await request.formData();

  const token = String(form.get("token") ?? "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "github_missing_token" }, { status: 400 });
  }

  const encrypted = encryptSecret(token);

  await prisma.integration.upsert({
    where: {
      userId_provider: { userId: appUser.id, provider: PROVIDER_GITHUB },
    },
    create: {
      userId: appUser.id,
      provider: PROVIDER_GITHUB,
      encryptedToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
    },
    update: {
      encryptedToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
    },
  });

  return NextResponse.json({ ok: true });
}
