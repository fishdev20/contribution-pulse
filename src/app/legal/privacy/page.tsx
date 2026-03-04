import { APP_NAME } from "@/config/branding";
import { Database, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

export default function PrivacyNoticePage() {
  const updatedAt = new Date().toISOString().slice(0, 10);

  return (
    <article className="mx-auto max-w-4xl">
      <header className="mb-8 rounded-xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="size-3.5" />
          Privacy-first by design
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Privacy Notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {APP_NAME} only stores aggregate contribution counts. No source-level metadata is retained.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Last updated: {updatedAt}</p>
      </header>

      <div className="space-y-5 text-[15px] leading-7 text-muted-foreground">
        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <Database className="size-4 text-primary" />
            Data We Store
          </h2>
          <p>{APP_NAME} stores only day-level aggregate metrics used for verification and reporting.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Commits per day</li>
            <li>Merge requests and pull requests per day</li>
            <li>Pipeline activity counts per day</li>
            <li>Manual highlights that you explicitly add</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <EyeOff className="size-4 text-primary" />
            Data We Never Store
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Source code</li>
            <li>Diffs or patches</li>
            <li>Commit messages</li>
            <li>Repository names</li>
            <li>Raw provider payloads after aggregation</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <KeyRound className="size-4 text-primary" />
            Security Controls
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Integration tokens are encrypted at rest using AES-256-GCM.</li>
            <li>Server-side secrets are never exposed to client code.</li>
            <li>Logs sanitize token-like values.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 text-lg font-semibold text-foreground">Retention, Deletion, and Control</h2>
          <p>
            You can disconnect providers at any time. You can also delete your account and related data from the
            settings page. Public report links can be revoked immediately and may be configured with expiration.
          </p>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
          <p>
            Questions about privacy practices should be sent to your support contact email. Replace this placeholder
            with your production legal contact.
          </p>
        </section>
      </div>
    </article>
  );
}
