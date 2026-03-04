import { APP_NAME } from "@/config/branding";
import { BadgeCheck, Gavel, ShieldAlert, Wrench } from "lucide-react";

export default function TermsPage() {
  const updatedAt = new Date().toISOString().slice(0, 10);

  return (
    <article className="mx-auto max-w-4xl">
      <header className="mb-8 rounded-xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Gavel className="size-3.5" />
          Legal terms
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          These terms govern your access to and use of {APP_NAME}.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Last updated: {updatedAt}</p>
      </header>

      <div className="space-y-5 text-[15px] leading-7 text-muted-foreground">
        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <BadgeCheck className="size-4 text-primary" />
            Service Scope
          </h2>
          <p>
            {APP_NAME} provides privacy-first contribution verification based on daily aggregate metrics from linked
            providers.
          </p>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <Wrench className="size-4 text-primary" />
            Acceptable Use
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use read-only integration tokens.</li>
            <li>Do not attempt to bypass security controls.</li>
            <li>Do not use the service for unlawful activity.</li>
            <li>Do not misuse public report links to misrepresent ownership of work.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 text-lg font-semibold text-foreground">Account and Data</h2>
          <p>You can disconnect integrations and delete your account data at any time from the dashboard controls.</p>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 inline-flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShieldAlert className="size-4 text-primary" />
            Availability and Liability
          </h2>
          <p>
            The service is provided on an &quot;as is&quot; basis. We may modify, suspend, or discontinue features at
            any time. To the extent permitted by law, liability is limited to direct damages and excludes indirect or
            consequential losses.
          </p>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-2 text-lg font-semibold text-foreground">Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of {APP_NAME} after an update means you accept
            the revised terms.
          </p>
        </section>
      </div>
    </article>
  );
}
