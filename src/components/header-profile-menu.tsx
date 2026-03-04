"use client";

import { useMeQuery } from "@/lib/api/hooks";
import { createClientSupabase } from "@/lib/supabase/client";
import { Loader2, LogOut, Settings, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

export function HeaderProfileMenu() {
  const [open, setOpen] = useState(false);
  const { data: me, isLoading } = useMeQuery();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    if (!open) return;
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

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

  if (isLoading || !me) {
    return (
      <Button size="icon" variant="outline" className="rounded-full" disabled aria-label="Loading profile">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </Button>
    );
  }

  if (!me.authenticated) {
    return (
      <Link
        href="/auth/signin"
        className="inline-flex h-9 items-center rounded-md border border-border/60 px-3 text-sm hover:bg-accent"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        size={"icon"}
        variant={"outline"}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full p-0"
        aria-label="Open profile menu"
      >
        <Avatar className="size-8">
          <AvatarImage src={me.avatarUrl ?? undefined} alt={me.email ?? "Profile"} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Button>

      {open ? (
        <div className="bg-popover text-popover-foreground absolute right-0 top-11 z-50 min-w-56 rounded-md border border-border/60 p-2 shadow-lg">
          <div className="border-border mb-1 border-b px-2 pb-2 pt-1 text-xs text-muted-foreground">{me.email ?? "Signed in"}</div>
          <Link href="/onboarding" className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent" onClick={() => setOpen(false)}>
            <Wrench className="size-4" />
            Onboarding
          </Link>
          <Link href="/settings" className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent" onClick={() => setOpen(false)}>
            <Settings className="size-4" />
            Settings
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
