import { NextResponse } from "next/server";
import { encryptSecret } from "@/server/crypto/encryption";
import { prisma } from "@/server/db/prisma";
import { requireAppUser } from "@/server/auth/user";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const form = await request.formData();

  const token = String(form.get("token") ?? "").trim();
  const baseUrl = String(form.get("baseUrl") ?? "https://gitlab.com").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "gitlab_missing_token" }, { status: 400 });
  }

  const encrypted = encryptSecret(token);

  await prisma.integration.upsert({
    where: {
      userId_provider: { userId: appUser.id, provider: "GITLAB" },
    },
    create: {
      userId: appUser.id,
      provider: "GITLAB",
      encryptedToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
      gitlabBaseUrl: baseUrl,
    },
    update: {
      encryptedToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
      gitlabBaseUrl: baseUrl,
    },
  });

  return NextResponse.json({ ok: true });
}
