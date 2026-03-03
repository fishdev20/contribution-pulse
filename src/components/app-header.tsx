"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { APP_NAME } from "@/config/branding";
import { HeaderProfileMenu } from "@/components/header-profile-menu";
import { NavLinksContent } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
            <HeaderProfileMenu />
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
          <div className="animate-in slide-in-from-top-2 fade-in mt-3 rounded-lg border border-border/60 bg-background/95 p-2 md:hidden">
            <NavLinksContent orientation="vertical" onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
      </nav>
    </header>
  );
}
