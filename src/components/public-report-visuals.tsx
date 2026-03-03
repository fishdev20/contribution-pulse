"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

const metricConfig: Record<
  Metric,
  { label: string; gitlabKey: keyof Point; azureKey: keyof Point; githubKey: keyof Point }
> = {
  commits: { label: "Commits", gitlabKey: "gitlabCommits", azureKey: "azureCommits", githubKey: "githubCommits" },
  merges: { label: "Merge requests", gitlabKey: "gitlabMerges", azureKey: "azureMerges", githubKey: "githubMerges" },
  prs: { label: "Pull requests", gitlabKey: "gitlabPrs", azureKey: "azurePrs", githubKey: "githubPrs" },
  pipelines: { label: "Pipelines", gitlabKey: "gitlabPipelines", azureKey: "azurePipelines", githubKey: "githubPipelines" },
};

export function PublicReportVisuals({ data }: { data: Point[] }) {
  const [metric, setMetric] = useState<Metric>("commits");
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const row of data) set.add(Number(row.date.slice(0, 4)));
    const sorted = Array.from(set).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [new Date().getUTCFullYear()];
  }, [data]);
  const [year, setYear] = useState<number>(years[0]);
  const current = metricConfig[metric];

  const monthlyBars = useMemo(() => buildMonthlyBars(data, year), [data, year]);
  const heatmap = useMemo(() => {
    const points = data.map((row) => {
      const gitlab = Number(row[current.gitlabKey] ?? 0);
      const azure = Number(row[current.azureKey] ?? 0);
      const github = Number(row[current.githubKey] ?? 0);
      return { date: row.date, value: gitlab + azure + github };
    });
    return buildHeatmap(points, year);
  }, [current.azureKey, current.githubKey, current.gitlabKey, data, year]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Activity visuals</h2>
          <p className="text-sm text-muted-foreground">Monthly provider split and yearly contribution heatmap.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={metric} onValueChange={(value) => setMetric(value as Metric)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commits">Commits</SelectItem>
              <SelectItem value="merges">Merge requests</SelectItem>
              <SelectItem value="prs">Pull requests</SelectItem>
              <SelectItem value="pipelines">Pipelines</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger className="w-[130px]">
              <CalendarDays className="mr-2 size-4 text-muted-foreground" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((entryYear) => (
                <SelectItem key={entryYear} value={String(entryYear)}>
                  {entryYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-80 rounded-xl border border-border/50 bg-background/40 p-3">
        <ResponsiveContainer>
          <BarChart data={monthlyBars}>
            <defs>
              <linearGradient id="publicGitlab" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="publicAzure" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0078d4" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#0078d4" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="publicGithub" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#24292f" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#24292f" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border) / 0.55)" strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip content={<PublicTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
            <Bar name={`GitLab ${current.label}`} dataKey={current.gitlabKey} stackId="provider" fill="url(#publicGitlab)" radius={[4, 4, 0, 0]} />
            <Bar name={`Azure DevOps ${current.label}`} dataKey={current.azureKey} stackId="provider" fill="url(#publicAzure)" radius={[4, 4, 0, 0]} />
            <Bar name={`GitHub ${current.label}`} dataKey={current.githubKey} stackId="provider" fill="url(#publicGithub)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 rounded-xl border border-border/50 bg-background/40 p-3">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Flame className="size-4 text-primary" />
          {current.label} heatmap ({year})
        </p>
        <HeatmapGrid weeks={heatmap.weeks} maxValue={heatmap.maxValue} values={heatmap.values} monthLabels={heatmap.monthLabels} />
      </div>
    </section>
  );
}

function PublicTooltip({
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
    <div className="min-w-[220px] rounded-md border border-border bg-popover/95 p-3 text-sm shadow-md backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {rows.map((item) => (
          <div key={item.dataKey ?? item.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? "currentColor" }} />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

function cellColor(value: number, maxValue: number): string {
  if (value <= 0) return "color-mix(in oklch, var(--primary) 7%, var(--background) 93%)";
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
}: {
  weeks: string[][];
  maxValue: number;
  values: Map<string, number>;
  monthLabels: Array<{ weekIndex: number; label: string }>;
}) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthLookup = new Map(monthLabels.map((label) => [label.weekIndex, label.label]));

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="min-w-[720px]">
        <div className="mb-2 grid grid-cols-[56px_1fr] gap-2 text-xs text-muted-foreground">
          <div />
          <div className="grid auto-cols-[16px] grid-flow-col gap-1">
            {weeks.map((_week, weekIndex) => (
              <div key={weekIndex} className="h-4 text-[11px] leading-4">
                {monthLookup.get(weekIndex) ?? ""}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[56px_1fr] gap-2">
          <div className="grid grid-rows-7 gap-1 text-xs text-muted-foreground">
            {labels.map((label) => (
              <div key={label} className="h-5 leading-5">
                {label}
              </div>
            ))}
          </div>
          <div className="grid auto-cols-[16px] grid-flow-col gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-7 gap-1">
                {Array.from({ length: 7 }).map((_, rowIndex) => {
                  const date = week[rowIndex];
                  if (!date) return <div key={rowIndex} className="h-4 w-4 rounded-[4px] bg-transparent" />;
                  const value = values.get(date) ?? 0;
                  return (
                    <div
                      key={date}
                      className="h-4 w-4 rounded-[4px] border border-border/35 transition-colors"
                      style={{ backgroundColor: cellColor(value, maxValue) }}
                      title={`${date}: ${value}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
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
  );
}
