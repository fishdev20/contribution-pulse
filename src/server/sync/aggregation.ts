export type ProviderName = "GITLAB" | "AZURE_DEVOPS" | "GITHUB";

export type EventMetric = {
  date: string;
  commitCount?: number;
  mergeCount?: number;
  prCount?: number;
  pipelineCount?: number;
};

export function toUtcDay(dateLike: string | Date): Date {
  const date = new Date(dateLike);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function aggregateDaily(events: EventMetric[]): Map<string, Required<Omit<EventMetric, "date">>> {
  const daily = new Map<string, Required<Omit<EventMetric, "date">>>();

  for (const event of events) {
    const key = toUtcDay(event.date).toISOString();
    const existing = daily.get(key) ?? {
      commitCount: 0,
      mergeCount: 0,
      prCount: 0,
      pipelineCount: 0,
    };

    existing.commitCount += event.commitCount ?? 0;
    existing.mergeCount += event.mergeCount ?? 0;
    existing.prCount += event.prCount ?? 0;
    existing.pipelineCount += event.pipelineCount ?? 0;
    daily.set(key, existing);
  }

  return daily;
}

export function toDailyUpserts(
  userId: string,
  provider: ProviderName,
  metrics: Map<string, Required<Omit<EventMetric, "date">>>,
): Array<Record<string, unknown>> {
  return Array.from(metrics.entries()).map(([dateIso, counts]) => ({
    where: {
      userId_provider_date: {
        userId,
        provider,
        date: new Date(dateIso),
      },
    },
    create: {
      userId,
      provider,
      date: new Date(dateIso),
      ...counts,
    },
    update: counts,
  }));
}
