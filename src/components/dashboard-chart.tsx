"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUIStore } from "@/stores/ui-store";
import { CalendarDays, Cloud, Funnel, GithubIcon, GitlabIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  date: string;
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
};

type Metric = "commits" | "merges" | "prs" | "pipelines";
type ProviderFilter = "all" | "gitlab" | "azure" | "github";

const metricConfig: Record<
  Metric,
  { label: string; gitlabKey: keyof Point; azureKey: keyof Point; githubKey: keyof Point }
> = {
  commits: { label: "Commits", gitlabKey: "gitlabCommits", azureKey: "azureCommits", githubKey: "githubCommits" },
  merges: { label: "Merge requests", gitlabKey: "gitlabMerges", azureKey: "azureMerges", githubKey: "githubMerges" },
  prs: { label: "Pull requests", gitlabKey: "gitlabPrs", azureKey: "azurePrs", githubKey: "githubPrs" },
  pipelines: { label: "Pipelines", gitlabKey: "gitlabPipelines", azureKey: "azurePipelines", githubKey: "githubPipelines" },
};

export function DashboardChart({ data }: { data: Point[] }) {
  const metric = useUIStore((state) => state.dashboardMetric) as Metric;
  const providerFilter = useUIStore((state) => state.dashboardProvider) as ProviderFilter;
  const selectedYearFromStore = useUIStore((state) => state.dashboardYear);
  const setMetric = useUIStore((state) => state.setDashboardMetric);
  const setProviderFilter = useUIStore((state) => state.setDashboardProvider);
  const setSelectedYear = useUIStore((state) => state.setDashboardYear);
  const availableYears = useMemo(() => {
    const currentYear = new Date().getUTCFullYear();
    const startYear = currentYear - 4;

    const years: number[] = [];
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  }, [data]);
  const selectedYear = selectedYearFromStore ?? availableYears[0];
  const current = metricConfig[metric];

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]);
  }, [availableYears, selectedYear, setSelectedYear]);

  const title = useMemo(() => {
    if (providerFilter === "gitlab") return `GitLab ${current.label}`;
    if (providerFilter === "azure") return `Azure DevOps ${current.label}`;
    if (providerFilter === "github") return `GitHub ${current.label}`;
    return `${current.label} by provider (${selectedYear})`;
  }, [current.label, providerFilter, selectedYear]);

  const points = useMemo(() => {
    return data.map((row) => {
      const gitlab = Number(row[current.gitlabKey] ?? 0);
      const azure = Number(row[current.azureKey] ?? 0);
      const github = Number(row[current.githubKey] ?? 0);
      const value =
        providerFilter === "gitlab"
          ? gitlab
          : providerFilter === "azure"
            ? azure
            : providerFilter === "github"
              ? github
              : gitlab + azure + github;
      return { date: row.date, value };
    });
  }, [current.azureKey, current.githubKey, current.gitlabKey, data, providerFilter]);

  const heatmap = useMemo(() => buildHeatmap(points, selectedYear), [points, selectedYear]);
  const monthlyBars = useMemo(
    () => buildMonthlyBars(data, selectedYear),
    [data, selectedYear],
  );

  return (
    <div className="w-full rounded-xl border border-border p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex w-full flex-col gap-2 lg:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">

              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="relative w-full pl-9">
                  <div className='text-muted-foreground/80 pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 group-has-[select[disabled]]:opacity-50'>
                    <CalendarDays className="size-4" aria-hidden='true'/>
                  </div>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant={providerFilter === "all" ? "default" : "outline"}
              onClick={() => setProviderFilter("all")}
              type="button"
              aria-label="All providers"
            >
              <Funnel className="size-4" />
              <span className="hidden sm:inline">All</span>
            </Button>
            <Button
              variant={providerFilter === "gitlab" ? "default" : "outline"}
              onClick={() => setProviderFilter("gitlab")}
              type="button"
              aria-label="GitLab"
            >
              <GitlabIcon className="size-4" />
              <span className="hidden sm:inline">GitLab</span>
            </Button>
            <Button
              variant={providerFilter === "azure" ? "default" : "outline"}
              onClick={() => setProviderFilter("azure")}
              type="button"
              aria-label="Azure DevOps"
            >
              <Cloud className="size-4" />
              <span className="hidden sm:inline">Azure DevOps</span>
            </Button>
            <Button
              variant={providerFilter === "github" ? "default" : "outline"}
              onClick={() => setProviderFilter("github")}
              type="button"
              aria-label="GitHub"
            >
              <GithubIcon className="size-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer>
          <BarChart data={monthlyBars}>
            <defs>
              <linearGradient id="gitlabBars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.95} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.45} />
              </linearGradient>
              <linearGradient id="azureBars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0078d4" stopOpacity={0.95} />
                <stop offset="95%" stopColor="#0078d4" stopOpacity={0.45} />
              </linearGradient>
              <linearGradient id="githubBars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.95} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.2 }} />
            <Legend />
            {providerFilter !== "azure" && providerFilter !== "github" ? (
              <Bar
                name={`GitLab ${current.label}`}
                dataKey={current.gitlabKey}
                stackId="provider"
                fill="url(#gitlabBars)"
                radius={[4, 4, 0, 0]}
              />
            ) : null}
            {providerFilter !== "gitlab" && providerFilter !== "github" ? (
              <Bar
                name={`Azure DevOps ${current.label}`}
                dataKey={current.azureKey}
                stackId="provider"
                fill="url(#azureBars)"
                radius={[4, 4, 0, 0]}
              />
            ) : null}
            {providerFilter !== "gitlab" && providerFilter !== "azure" ? (
              <Bar
                name={`GitHub ${current.label}`}
                dataKey={current.githubKey}
                stackId="provider"
                fill="url(#githubBars)"
                radius={[4, 4, 0, 0]}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-sm font-medium text-muted-foreground">{current.label} heatmap ({selectedYear})</p>
        <HeatmapGrid
          weeks={heatmap.weeks}
          maxValue={heatmap.maxValue}
          values={heatmap.values}
          monthLabels={heatmap.monthLabels}
          year={selectedYear}
        />
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload.filter((item) => typeof item.value === "number" && Number.isFinite(item.value));
  if (rows.length === 0) return null;

  return (
    <div className="bg-background/95 border-border min-w-[220px] rounded-md border p-3 text-sm shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {rows.map((item) => (
          <div key={item.dataKey ?? item.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color ?? "currentColor" }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildHeatmap(points: Array<{ date: string; value: number }>, year: number) {
  const values = new Map<string, number>();
  for (const point of points) {
    if (Number(point.date.slice(0, 4)) === year) values.set(point.date, point.value);
  }
  const maxValue = Math.max(1, ...Array.from(values.values()));

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const startDay = yearStart.getUTCDay();
  const shiftToMonday = startDay === 0 ? 6 : startDay - 1;
  const start = new Date(yearStart);
  start.setUTCDate(start.getUTCDate() - shiftToMonday);

  const end = new Date(yearEnd);
  const endDay = end.getUTCDay();
  const shiftToSunday = endDay === 0 ? 0 : 7 - endDay;
  end.setUTCDate(end.getUTCDate() + shiftToSunday);

  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const monthLabels: Array<{ weekIndex: number; label: string }> = [];
  let lastMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const firstDay = weeks[i][0];
    const date = new Date(`${firstDay}T00:00:00.000Z`);
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    if (day <= 7 && month !== lastMonth) {
      monthLabels.push({
        weekIndex: i,
        label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      });
      lastMonth = month;
    }
  }

  return { weeks, maxValue, values, monthLabels };
}

function buildMonthlyBars(data: Point[], year: number) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months = monthNames.map((month) => ({
    month,
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
  }));

  for (const row of data) {
    const date = new Date(`${row.date}T00:00:00.000Z`);
    if (date.getUTCFullYear() !== year) continue;
    const monthIndex = date.getUTCMonth();
    const bucket = months[monthIndex];
    bucket.gitlabCommits += Number(row.gitlabCommits ?? 0);
    bucket.azureCommits += Number(row.azureCommits ?? 0);
    bucket.githubCommits += Number(row.githubCommits ?? 0);
    bucket.gitlabMerges += Number(row.gitlabMerges ?? 0);
    bucket.azureMerges += Number(row.azureMerges ?? 0);
    bucket.githubMerges += Number(row.githubMerges ?? 0);
    bucket.gitlabPrs += Number(row.gitlabPrs ?? 0);
    bucket.azurePrs += Number(row.azurePrs ?? 0);
    bucket.githubPrs += Number(row.githubPrs ?? 0);
    bucket.gitlabPipelines += Number(row.gitlabPipelines ?? 0);
    bucket.azurePipelines += Number(row.azurePipelines ?? 0);
    bucket.githubPipelines += Number(row.githubPipelines ?? 0);
  }

  return months;
}

function cellColor(value: number, maxValue: number): string {
  if (value <= 0) return "color-mix(in oklch, var(--primary) 6%, var(--background) 94%)";
  const intensity = Math.min(1, value / maxValue);
  if (intensity < 0.25) return "color-mix(in oklch, var(--primary) 24%, var(--background) 76%)";
  if (intensity < 0.5) return "color-mix(in oklch, var(--primary) 42%, var(--background) 58%)";
  if (intensity < 0.75) return "color-mix(in oklch, var(--primary) 62%, var(--background) 38%)";
  return "var(--primary)";
}

function HeatmapGrid({
  weeks,
  maxValue,
  values,
  monthLabels,
  year,
}: {
  weeks: string[][];
  maxValue: number;
  values: Map<string, number>;
  monthLabels: Array<{ weekIndex: number; label: string }>;
  year: number;
}) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthLookup = new Map(monthLabels.map((label) => [label.weekIndex, label.label]));

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="min-w-[640px]">
        <div className="mb-2 grid grid-cols-[52px_1fr] gap-2 text-xs text-muted-foreground">
          <div />
          <div className="grid auto-cols-[14px] grid-flow-col gap-1">
            {weeks.map((_week, weekIndex) => (
              <div key={weekIndex} className="h-4 text-[11px] leading-4">
                {monthLookup.get(weekIndex) ?? ""}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[52px_1fr] gap-2">
          <div className="grid grid-rows-7 gap-1 text-xs text-muted-foreground">
            {labels.map((label) => (
              <div key={label} className="h-4 leading-4">
                {label}
              </div>
            ))}
          </div>
          <div className="grid auto-cols-[14px] grid-flow-col gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-7 gap-1">
                {Array.from({ length: 7 }).map((_, rowIndex) => {
                  const date = week[rowIndex];
                  if (!date) return <div key={rowIndex} className="h-3.5 w-3.5 rounded-[4px] bg-transparent" />;
                  const value = values.get(date) ?? 0;
                  return (
                    <div
                      key={date}
                      className="h-3.5 w-3.5 rounded-[4px] border border-border/35 transition-colors"
                      style={{ backgroundColor: cellColor(value, maxValue) }}
                      title={`${date}: ${value}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{year} total days visualized in GitHub-style weekly grid.</p>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Low</span>
          {[0, 0.25, 0.5, 0.75, 1].map((step) => (
            <span
              key={step}
              className="h-3 w-3 rounded-[2px] border border-border/35"
              style={{ backgroundColor: cellColor(Math.round(maxValue * step), maxValue) }}
            />
          ))}
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
