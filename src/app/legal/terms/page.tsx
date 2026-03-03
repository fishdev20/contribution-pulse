import { APP_NAME } from "@/config/branding";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-border mb-8 border-b pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      </header>

      <div className="space-y-8 text-[15px] leading-7 text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Service Scope</h2>
          <p>
            {APP_NAME} provides privacy-first contribution verification based on daily aggregate metrics from linked
            providers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Acceptable Use</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use read-only integration tokens.</li>
            <li>Do not attempt to bypass security controls.</li>
            <li>Do not use the service for unlawful activity.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Account & Data</h2>
          <p>You can disconnect integrations and delete your account data at any time from the dashboard controls.</p>
        </section>
      </div>
    </article>
  );
}
