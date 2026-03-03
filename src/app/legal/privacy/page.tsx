import { APP_NAME } from "@/config/branding";

export default function PrivacyNoticePage() {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-border mb-8 border-b pb-5">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      </header>

      <div className="space-y-8 text-[15px] leading-7 text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">What We Store</h2>
          <p>{APP_NAME} stores only daily aggregate counts for contribution verification.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Commits per day</li>
            <li>Merge requests and pull requests per day</li>
            <li>Pipeline activity counts per day</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">What We Never Store</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Source code</li>
            <li>Diffs or patches</li>
            <li>Commit messages</li>
            <li>Repository names</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Security Controls</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Integration tokens are encrypted at rest using AES-256-GCM.</li>
            <li>Server-side secrets are never exposed to client code.</li>
            <li>Logs sanitize token-like values.</li>
          </ul>
        </section>
      </div>
    </article>
  );
}
