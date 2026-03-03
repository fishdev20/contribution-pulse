import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAppUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    redirect("/auth/signin");
  }

  const appUser = await prisma.user.upsert({
    where: { supabaseUserId: user.id },
    update: { email: user.email },
    create: { supabaseUserId: user.id, email: user.email },
  });

  return { appUser, authUser: user };
}
