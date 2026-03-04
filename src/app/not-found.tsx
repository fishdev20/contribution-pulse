import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/branding";
import { Compass, House } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border border-border/60 bg-card/70 p-8 text-center shadow-sm">
        <p className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass className="size-5" />
        </p>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you requested does not exist in {APP_NAME}.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href="/" className="gap-2">
              <House className="size-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
