import { PublicReportVisuals } from "@/components/public-report-visuals";
import { prisma } from "@/server/db/prisma";
import { BadgeCheck, CalendarClock, GitCommitHorizontal, GitMerge, GitPullRequest, Workflow } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const share = await prisma.publicShare.findUnique({ where: { token }, include: { user: true } });
  if (!share || share.revokedAt || (share.expiresAt && share.expiresAt < new Date())) {
    notFound();
  }

  const [activities, highlights] = await Promise.all([
    prisma.dailyActivity.findMany({
      where: {
        userId: share.userId,
      },
      orderBy: { date: "asc" },
    }),
    prisma.manualHighlight.findMany({ where: { userId: share.userId }, orderBy: { date: "desc" }, take: 10 }),
  ]);

  const ninetyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
  const recent = activities.filter((row) => row.date >= ninetyDaysAgo);

  const totals = recent.reduce(
    (acc, row) => {
      acc.commits += row.commitCount;
      acc.merges += row.mergeCount;
      acc.prs += row.prCount;
      acc.pipelines += row.pipelineCount;
      return acc;
    },
    { commits: 0, merges: 0, prs: 0, pipelines: 0 },
  );

  const byDay = new Map<
    string,
    {
      gitlabCommits: number;
      azureCommits: number;
      githubCommits: number;
      gitlabMerges: number;
      azureMerges: number;
      githubMerges: number;
      gitlabPrs: number;
      azurePrs: number;
      githubPrs: number;
      gitlabPipelines: number;
      azurePipelines: number;
      githubPipelines: number;
    }
  >();

  for (const row of activities) {
    const key = row.date.toISOString().slice(0, 10);
    const current = byDay.get(key) ?? {
      gitlabCommits: 0,
      azureCommits: 0,
      githubCommits: 0,
      gitlabMerges: 0,
      azureMerges: 0,
      githubMerges: 0,
      gitlabPrs: 0,
      azurePrs: 0,
      githubPrs: 0,
      gitlabPipelines: 0,
      azurePipelines: 0,
      githubPipelines: 0,
    };

    if (row.provider === "GITLAB") {
      current.gitlabCommits += row.commitCount;
      current.gitlabMerges += row.mergeCount;
      current.gitlabPrs += row.prCount;
      current.gitlabPipelines += row.pipelineCount;
    } else if (row.provider === "AZURE_DEVOPS") {
      current.azureCommits += row.commitCount;
      current.azureMerges += row.mergeCount;
      current.azurePrs += row.prCount;
      current.azurePipelines += row.pipelineCount;
    } else {
      current.githubCommits += row.commitCount;
      current.githubMerges += row.mergeCount;
      current.githubPrs += row.prCount;
      current.githubPipelines += row.pipelineCount;
    }

    byDay.set(key, current);
  }

  const chartData = Array.from(byDay.entries()).map(([date, counts]) => ({ date, ...counts }));

  return (
    <div className="mx-auto flex flex-col max-w-6xl gap-6">
      <section className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <BadgeCheck className="size-3.5" />
          Public read-only report
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contribution verification report</h1>
        <p className="mt-2 inline-flex items-start gap-2 text-sm text-muted-foreground">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
          Verification stamp: Data pulled on {new Date().toISOString().slice(0, 10)} via official APIs; only aggregate counts stored.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Commits (90d)" value={totals.commits} icon={<GitCommitHorizontal className="size-4" />} />
        <Metric label="Merge requests (90d)" value={totals.merges} icon={<GitMerge className="size-4" />} />
        <Metric label="Pull requests (90d)" value={totals.prs} icon={<GitPullRequest className="size-4" />} />
        <Metric label="Pipelines (90d)" value={totals.pipelines} icon={<Workflow className="size-4" />} />
      </section>

      <PublicReportVisuals data={chartData} />

      <section className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Manual highlights</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {highlights.map((highlight) => (
            <li key={highlight.id} className="rounded-lg border border-border/60 bg-background/50 p-3">
              <strong>{highlight.date.toISOString().slice(0, 10)}</strong>: {highlight.note}
            </li>
          ))}
          {highlights.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-muted-foreground">No highlights shared yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm">
      <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
