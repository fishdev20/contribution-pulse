"use client";

import { HeaderProfileMenu } from "@/components/header-profile-menu";
import { NavLinksContent } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/branding";
import { useMeQuery } from "@/lib/api/hooks";
import { createClientSupabase } from "@/lib/supabase/client";
import { Loader2, LogOut, Menu, Settings, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: me, isLoading } = useMeQuery();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const displayName = useMemo(() => {
    if (!me || !me.authenticated || !me.email) return "User";
    return me.email.split("@")[0] || "User";
  }, [me]);

  const initials = useMemo(() => {
    if (!me || !me.authenticated || !me.email) return "U";
    const namePart = me.email.split("@")[0] ?? "";
    const parts = namePart.split(/[._-\s]+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    return namePart.slice(0, 2).toUpperCase() || "U";
  }, [me]);

  async function signOut() {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-border/70 bg-background/75 fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <nav className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <ShieldCheck className="size-5" />
            {APP_NAME}
          </Link>

          <div className="hidden items-center gap-4 text-sm md:flex">
            <NavLinksContent />
            <ThemeToggle />
            <HeaderProfileMenu />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              type="button"
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {open ? (
          <div className="animate-in slide-in-from-top-2 fade-in mt-3 md:hidden">
            {isLoading || !me ? (
              <div className="mb-2 flex items-center gap-3 px-1 py-2">
                <div className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-muted">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <p className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ) : me.authenticated ? (
              <>
                <div className="mb-2 flex items-center gap-3 px-1 py-2">
                  <Avatar className="size-10">
                    <AvatarImage src={me.avatarUrl ?? undefined} alt={me.email ?? "Profile"} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{me.email}</p>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-2">
                  <Link
                    href="/settings"
                    className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => setOpen(false)}
                  >
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </div>
              </>
            ) : (
              <div className="mb-2 px-1 py-2">
                <Link
                  href="/auth/signin"
                  className="inline-flex h-9 items-center rounded-md border border-border/60 px-3 text-sm hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
              </div>
            )}
            <div>
              <NavLinksContent orientation="vertical" onNavigate={() => setOpen(false)} />
            </div>
            {me?.authenticated ? (
              <div className="mt-2 border-t border-border/60 pt-2">
                <button
                  type="button"
                  className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={signOut}
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    </header>
  );
}
