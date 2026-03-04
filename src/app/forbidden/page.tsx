import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border border-border/60 bg-card/70 p-8 text-center shadow-sm">
        <p className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <Lock className="size-5" />
        </p>
        <p className="text-sm font-medium text-amber-600">403</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Access forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access this resource.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
