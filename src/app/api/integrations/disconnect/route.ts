import { NextResponse } from "next/server";
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

  if (provider !== "GITLAB" && provider !== "AZURE_DEVOPS" && provider !== "GITHUB") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await prisma.integration.deleteMany({ where: { userId: appUser.id, provider } });
  await prisma.dailyActivity.deleteMany({ where: { userId: appUser.id, provider } });

  return NextResponse.json({ ok: true });
}
