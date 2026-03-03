import { NextResponse } from "next/server";
import { requireAppUser } from "@/server/auth/user";
import { enqueueUserSync } from "@/server/queue/queue";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const form = await request.formData();

  const year = Number(String(form.get("year") ?? ""));
  const providerRaw = String(form.get("provider") ?? "ALL");

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ ok: false, error: "invalid_year" }, { status: 400 });
  }

  const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
  const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

  const provider =
    providerRaw === "GITLAB" || providerRaw === "AZURE_DEVOPS" || providerRaw === "GITHUB"
      ? providerRaw
      : undefined;

  await enqueueUserSync(appUser.id, { from, to, provider, backfillYear: year });

  return NextResponse.json({ ok: true, year });
}
