"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueueBackfillMutation } from "@/lib/api/hooks";
import { useAppToast } from "@/components/providers";
import { startSyncWatch } from "@/lib/sync-watch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BackfillProvider = "ALL" | "GITLAB" | "AZURE_DEVOPS" | "GITHUB";
type CompletedCombo = { year: number; provider: BackfillProvider };

export function BackfillForm({
  defaultYear,
  completedCombos,
  activeCombos,
}: {
  defaultYear: number;
  completedCombos: CompletedCombo[];
  activeCombos: CompletedCombo[];
}) {
  const router = useRouter();
  const { pushToast } = useAppToast();
  const queueBackfillMutation = useQueueBackfillMutation();
  const [year, setYear] = useState(String(defaultYear));
  const [provider, setProvider] = useState<BackfillProvider>("GITLAB");
  const [state, setState] = useState<"idle" | "queueing" | "queued" | "failed">("idle");
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getUTCFullYear();
    const minYear = Math.min(defaultYear, currentYear - 5);
    const years: string[] = [];
    for (let y = currentYear; y >= minYear; y--) years.push(String(y));
    if (!years.includes(String(defaultYear))) years.unshift(String(defaultYear));
    return Array.from(new Set(years));
  }, [defaultYear]);

  const comboAlreadyCompleted = useMemo(
    () => completedCombos.some((item) => item.year === Number(year) && item.provider === provider),
    [completedCombos, provider, year],
  );
  const comboInProgress = useMemo(
    () => activeCombos.some((item) => item.year === Number(year) && item.provider === provider),
    [activeCombos, provider, year],
  );

  const submitText = useMemo(() => {
    if (comboInProgress) return "In progress";
    if (comboAlreadyCompleted) return "Already synced";
    if (state === "queueing") return "Queueing...";
    if (state === "queued") return "Queued";
    if (state === "failed") return "Retry";
    return "Queue historical backfill";
  }, [comboAlreadyCompleted, comboInProgress, state]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (comboInProgress) {
      pushToast(
        {
          title: "Backfill already running",
          subtitle: `${year} • ${providerLabel(provider)}`,
        },
        "info",
      );
      return;
    }
    if (comboAlreadyCompleted) {
      pushToast(
        {
          title: "Backfill already completed",
          subtitle: `${year} • ${providerLabel(provider)}`,
        },
        "info",
      );
      return;
    }
    setState("queueing");

    try {
      const payload = await queueBackfillMutation.mutateAsync({ year, provider });
      if (!payload.ok) {
        setState("failed");
        pushToast({ title: "Backfill failed", subtitle: "Unable to queue historical backfill." }, "error");
        return;
      }
      setState("queued");
      startSyncWatch();
      pushToast(
        {
          title: "Backfill queued",
          subtitle: `${year} • ${providerLabel(provider)}`,
        },
        "info",
      );
      router.refresh();
    } catch {
      setState("failed");
      pushToast({ title: "Backfill failed", subtitle: "Unable to queue historical backfill." }, "error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <CalendarRange className="size-4" /> Year
        </span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((value) => (
              <SelectItem
                key={value}
                value={value}
                disabled={isComboBlocked(Number(value), provider, completedCombos, activeCombos)}
              >
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <DatabaseZap className="size-4" /> Provider
        </span>
        <Select value={provider} onValueChange={(value) => setProvider(value as BackfillProvider)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" disabled={isComboBlocked(Number(year), "ALL", completedCombos, activeCombos)}>
              All providers
            </SelectItem>
            <SelectItem value="GITLAB" disabled={isComboBlocked(Number(year), "GITLAB", completedCombos, activeCombos)}>
              GitLab
            </SelectItem>
            <SelectItem value="AZURE_DEVOPS" disabled={isComboBlocked(Number(year), "AZURE_DEVOPS", completedCombos, activeCombos)}>
              Azure DevOps
            </SelectItem>
            <SelectItem value="GITHUB" disabled={isComboBlocked(Number(year), "GITHUB", completedCombos, activeCombos)}>
              GitHub
            </SelectItem>
          </SelectContent>
        </Select>
      </label>
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="provider" value={provider} />
      <Button type="submit" disabled={state === "queueing" || comboAlreadyCompleted || comboInProgress}>
        {submitText}
      </Button>
    </form>
  );
}

function isComboCompleted(year: number, provider: BackfillProvider, completedCombos: CompletedCombo[]): boolean {
  return completedCombos.some((item) => item.year === year && item.provider === provider);
}

function isComboBlocked(
  year: number,
  provider: BackfillProvider,
  completedCombos: CompletedCombo[],
  activeCombos: CompletedCombo[],
): boolean {
  return isComboCompleted(year, provider, completedCombos) || isComboCompleted(year, provider, activeCombos);
}

function providerLabel(provider: BackfillProvider): string {
  if (provider === "ALL") return "All providers";
  if (provider === "AZURE_DEVOPS") return "Azure DevOps";
  if (provider === "GITHUB") return "GitHub";
  return "GitLab";
}
