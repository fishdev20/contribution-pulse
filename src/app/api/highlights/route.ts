import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { requireAppUser } from "@/server/auth/user";

export async function POST(request: Request) {
  const { appUser } = await requireAppUser();
  const form = await request.formData();

  const date = String(form.get("date") ?? "");
  const note = String(form.get("note") ?? "").trim();
  if (!date || !note) return NextResponse.json({ error: "Date and note are required" }, { status: 400 });

  const created = await prisma.manualHighlight.create({
    data: {
      userId: appUser.id,
      date: new Date(date),
      note,
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
