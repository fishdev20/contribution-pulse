"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Home, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/onboarding", label: "Onboarding", icon: Home },
  { href: "/legal/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/legal/terms", label: "Terms", icon: FileText },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return pathname.startsWith("/dashboard");
  if (href === "/onboarding") return pathname.startsWith("/onboarding");
  if (href === "/legal/privacy") return pathname.startsWith("/legal/privacy");
  if (href === "/legal/terms") return pathname.startsWith("/legal/terms");
  return false;
}

export function NavLinks() {
  return <NavLinksContent />;
}

export function NavLinksContent({
  orientation = "horizontal",
  className,
  onNavigate,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "text-sm",
        orientation === "horizontal"
          ? "flex flex-wrap items-center gap-2 md:justify-end"
          : "grid gap-1",
        className,
      )}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors",
              orientation === "vertical" ? "w-full" : "",
              active
                ? "bg-primary/12 text-primary font-medium"
                : "text-foreground/85 hover:bg-accent hover:text-accent-foreground",
            )}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
