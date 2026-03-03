import "@/app/globals.css";
import { AppHeader } from "@/components/app-header";
import { Providers } from "@/components/providers";
import { APP_NAME } from "@/config/branding";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: APP_NAME,
  description: "Privacy-first contribution verification for private repositories",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const containerClass = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <AppHeader />
            <main className={`${containerClass} min-w-0 flex-1 overflow-x-hidden py-6 pt-28 sm:py-8 sm:pt-32`}>{children}</main>
            <footer className="border-border/60 mt-10 border-t">
              <div className={`${containerClass} flex flex-col gap-2 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}>
                <p className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  {APP_NAME}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                  <Link href="/legal/terms" className="hover:text-foreground transition-colors">
                    Terms
                  </Link>
                  <p>© {new Date().getFullYear()} Minh Nguyen. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
