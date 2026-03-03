import { NextResponse } from "next/server";
import { Provider } from "@prisma/client";
import { requireAppUser } from "@/server/auth/user";
import { prisma } from "@/server/db/prisma";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  let provider = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await request.json().catch(() => ({}))) as { provider?: string };
    provider = String(payload.provider ?? "");
  } else {
    const form = await request.formData();
    provider = String(form.get("provider") ?? "");
  }

  if (provider !== Provider.GITLAB && provider !== Provider.AZURE_DEVOPS && provider !== Provider.GITHUB) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await prisma.integration.deleteMany({ where: { userId: appUser.id, provider } });
  await prisma.dailyActivity.deleteMany({ where: { userId: appUser.id, provider } });

  return NextResponse.json({ ok: true });
}
