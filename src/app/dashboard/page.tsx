import { BackfillForm } from "@/components/backfill-form";
import { BackfillJobsPanel } from "@/components/backfill-jobs-panel";
import { DashboardChart } from "@/components/dashboard-chart";
import { DashboardLiveUpdater } from "@/components/dashboard-live-updater";
import { DashboardPanelsClient } from "@/components/dashboard-panels-client";
import { SyncButton } from "@/components/sync-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppUser } from "@/server/auth/user";
import { prisma } from "@/server/db/prisma";
import { listBackfillJobsForUser } from "@/server/queue/queue";
import {
  ChartBar,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

const statusMessages: Record<string, string> = {
  backfill_queued: "Backfill has been queued. We will process it in the background and update your dashboard automatically.",
  backfill_invalid_year: "Invalid year for backfill.",
};

type ActivityRow = {
  date: Date;
  provider: "GITLAB" | "AZURE_DEVOPS" | "GITHUB";
  commitCount: number;
  mergeCount: number;
  prCount: number;
  pipelineCount: number;
};

type ManualHighlightRow = {
  id: string;
  date: Date;
  note: string;
};

type PublicShareRow = {
  token: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { status?: string; year?: string };
}) {
  const { appUser } = await requireAppUser();

  const [activitiesRaw, highlightsRaw, sharesRaw, backfillJobs] = await Promise.all([
    prisma.dailyActivity.findMany({
      where: {
        userId: appUser.id,
      },
      orderBy: { date: "asc" },
    }),
    prisma.manualHighlight.findMany({ where: { userId: appUser.id }, orderBy: { date: "desc" }, take: 20 }),
    prisma.publicShare.findMany({ where: { userId: appUser.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    listBackfillJobsForUser(appUser.id, 8),
  ]);
  const activities = activitiesRaw as ActivityRow[];
  const highlights = highlightsRaw as ManualHighlightRow[];
  const shares = sharesRaw as PublicShareRow[];

  const ninetyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
  const recentActivities = activities.filter((row) => row.date >= ninetyDaysAgo);

  const totals = recentActivities.reduce(
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
  const status = searchParams?.status ? statusMessages[searchParams.status] : undefined;
  const nowYear = new Date().getUTCFullYear();
  const completedBackfillCombos = backfillJobs
    .filter((job) => job.status === "completed")
    .map((job) => ({
      year: job.year,
      provider: (job.provider ?? "ALL") as "ALL" | "GITLAB" | "AZURE_DEVOPS" | "GITHUB",
    }));
  const activeBackfillCombos = backfillJobs
    .filter((job) => job.status === "queued" || job.status === "running")
    .map((job) => ({
      year: job.year,
      provider: (job.provider ?? "ALL") as "ALL" | "GITLAB" | "AZURE_DEVOPS" | "GITHUB",
    }));

  return (
    <div className="flex flex-col gap-6 mx-auto max-w-6xl">
      <DashboardLiveUpdater />
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-row flex-wrap items-center justify-between gap-3 duration-500">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><ChartBar className="h-7 w-7 text-primary" />Contribution dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verification stamp: Data pulled on {new Date().toISOString().slice(0, 10)} via official APIs; only aggregate counts stored.
          </p>
        </div>
        <SyncButton />
      </div>
      {status ? (
        <div className="animate-in fade-in slide-in-from-top-1 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 duration-300">
          {status} {searchParams?.year ? `(Year ${searchParams.year})` : ""}
        </div>
      ) : null}

      <section className="animate-in fade-in slide-in-from-bottom-2 grid gap-4 duration-500 md:grid-cols-4">
        <MetricCard label="Commits" value={totals.commits} icon={<GitCommitHorizontal className="size-4" />} />
        <MetricCard label="Merge requests" value={totals.merges} icon={<GitMerge className="size-4" />} />
        <MetricCard label="Pull requests" value={totals.prs} icon={<GitPullRequest className="size-4" />} />
        <MetricCard label="Pipelines" value={totals.pipelines} icon={<Workflow className="size-4" />} />
      </section>

      <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Card className="mb-6 border-border/60 shadow-sm transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle>Historical backfill</CardTitle>
            <p className="text-sm text-muted-foreground">Queue a one-time sync for an older year (for example 2025).</p>
          </CardHeader>
          <CardContent>
            <BackfillForm
              defaultYear={Number(searchParams?.year ?? String(nowYear - 1))}
              completedCombos={completedBackfillCombos}
              activeCombos={activeBackfillCombos}
            />
            <BackfillJobsPanel jobs={backfillJobs} />
          </CardContent>
        </Card>
        <DashboardChart data={chartData} />
      </section>

      <DashboardPanelsClient
        initialShares={shares.map((share) => ({
          token: share.token,
          revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
          expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
        }))}
        initialHighlights={highlights.map((highlight) => ({
          id: highlight.id,
          date: highlight.date.toISOString().slice(0, 10),
          note: highlight.note,
        }))}
      />

    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
