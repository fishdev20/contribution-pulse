import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAppUser } from "@/server/auth/user";
import { prisma } from "@/server/db/prisma";

export async function POST(request: Request) {
  const { appUser, authUser } = await requireAppUser();

  await prisma.user.delete({ where: { id: appUser.id } });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  await admin.auth.admin.deleteUser(authUser.id);

  return NextResponse.json({ ok: true });
}
