import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/branding";
import { BadgeCheck, ChartNoAxesCombined, Clock3, Database, FileCheck2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-28 top-8 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-36 h-56 w-56 rounded-full bg-chart-2/20 blur-3xl" />

      <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm sm:p-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BadgeCheck className="size-3.5" />
            Privacy-first contribution verification
          </p>

          <h1 className="max-w-4xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Prove private repo work without leaking private repo details
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            {APP_NAME} syncs from official GitLab, Azure DevOps, and GitHub APIs, then stores only daily aggregate counts.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/auth/signin">
              <Button size="lg">Start now</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                Open dashboard
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="font-semibold">Aggregate-only storage</p>
              <p className="mt-1 text-muted-foreground">No code, diffs, messages, or repo names persisted.</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="font-semibold">Public report links</p>
              <p className="mt-1 text-muted-foreground">Read-only, revokable, and optional expiration.</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="font-semibold">Verification stamp</p>
              <p className="mt-1 text-muted-foreground">Source API + pulled date embedded in reports.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Everything you need, without exposing private metadata</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Built for developers who need trustworthy proof of activity from private repositories.
          </p>
        </div>

        <div className="grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          <FeatureTile
            icon={<ChartNoAxesCombined className="size-4" />}
            title="Unified activity view"
            description="Commits, merges/PRs, and pipelines in one cross-provider timeline with clear per-provider series."
            delay="duration-500"
            className="sm:col-span-2 lg:col-span-7 lg:row-span-2"
            content={
              <>
                <div className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <p className="font-medium">GitLab</p>
                    <p className="mt-0.5 text-muted-foreground">Commits, MRs, pipelines</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <p className="font-medium">Azure DevOps</p>
                    <p className="mt-0.5 text-muted-foreground">Commits, PRs, builds</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <p className="font-medium">GitHub</p>
                    <p className="mt-0.5 text-muted-foreground">Commits, PRs, workflows</p>
                  </div>
                </div>
                <MiniActivityChart />
              </>
            }
          />
          <FeatureTile
            icon={<LockKeyhole className="size-4" />}
            title="Encrypted credentials"
            description="PATs are encrypted at rest with AES-256-GCM before persistence."
            delay="duration-700"
            className="lg:col-span-5"
          />
          <FeatureTile
            icon={<Clock3 className="size-4" />}
            title="Background sync"
            description="Queue-based workers handle retries, pagination, and rate limits safely."
            delay="duration-900"
            className="lg:col-span-5"
          />
          <FeatureTile
            icon={<Database className="size-4" />}
            title="Minimal data footprint"
            description="Only day-level counts are retained for reporting and verification."
            delay="duration-500"
            className="lg:col-span-5"
          />
          <FeatureTile
            icon={<FileCheck2 className="size-4" />}
            title="PDF export"
            description="Generate clean, shareable proof reports from your aggregate activity."
            delay="duration-700"
            className="lg:col-span-3"
          />
          <FeatureTile
            icon={<BadgeCheck className="size-4" />}
            title="Provider split"
            description="Separate series for GitLab, Azure DevOps, and GitHub contributions."
            delay="duration-900"
            className="lg:col-span-4"
          />
        </div>
      </section>
    </div>
  );
}

function MiniActivityChart() {
  const months = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
  const gitlab = [16, 24, 22, 30, 27, 35, 33, 41, 39, 44, 49, 46];
  const azure = [12, 18, 16, 21, 20, 26, 24, 28, 26, 31, 34, 30];
  const github = [8, 13, 10, 15, 14, 18, 17, 20, 19, 23, 25, 22];
  const maxValue = 50;
  const width = 480;
  const height = 140;
  const padX = 8;
  const padY = 10;
  const gitlabColor = "var(--chart-1)";
  const azureColor = "var(--chart-2)";
  const githubColor = "var(--chart-4)";

  const toPolyline = (values: number[]) =>
    values
      .map((v, i) => {
        const x = padX + (i * (width - padX * 2)) / (values.length - 1);
        const y = height - padY - (v / maxValue) * (height - padY * 2);
        return `${x},${y}`;
      })
      .join(" ");

  const toArea = (values: number[]) => {
    const line = toPolyline(values);
    return `M ${padX},${height - padY} L ${line.replaceAll(" ", " L ")} L ${width - padX},${height - padY} Z`;
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-background/55 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <LegendDot color={gitlabColor} label="GitLab" />
        <LegendDot color={azureColor} label="Azure DevOps" />
        <LegendDot color={githubColor} label="GitHub" />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[150px] w-full">
        {[0, 1, 2, 3, 4].map((row) => (
          <line
            key={row}
            x1={padX}
            y1={padY + (row * (height - padY * 2)) / 4}
            x2={width - padX}
            y2={padY + (row * (height - padY * 2)) / 4}
            stroke="hsl(var(--border) / 0.7)"
            strokeDasharray="3 5"
            strokeWidth="1"
          />
        ))}
        <path d={toArea(gitlab)} fill={gitlabColor} fillOpacity={0.16} />
        <polyline
          points={toPolyline(gitlab)}
          fill="none"
          stroke={gitlabColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={toPolyline(azure)}
          fill="none"
          stroke={azureColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={toPolyline(github)}
          fill="none"
          stroke={githubColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 grid grid-cols-6 text-[10px] text-muted-foreground/80">
        {months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function FeatureTile({
  icon,
  title,
  description,
  className,
  delay,
  content,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  delay: string;
  content?: ReactNode;
}) {
  return (
    <div
      className={`group relative animate-in fade-in slide-in-from-bottom-2 ${delay} overflow-hidden rounded-2xl border border-border/60 bg-card/65 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
        {title}
      </p>
      <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {content}
    </div>
  );
}
