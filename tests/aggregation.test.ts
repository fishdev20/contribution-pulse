import { Provider } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { aggregateDaily, toDailyUpserts } from "../src/server/sync/aggregation";

describe("aggregation logic", () => {
  it("aggregates metrics by UTC day", () => {
    const aggregated = aggregateDaily([
      { date: "2026-02-01T01:00:00.000Z", commitCount: 2, mergeCount: 1 },
      { date: "2026-02-01T16:00:00.000Z", commitCount: 3, prCount: 2 },
      { date: "2026-02-02T02:00:00.000Z", pipelineCount: 4 },
    ]);

    expect(aggregated.size).toBe(2);
    expect(aggregated.get("2026-02-01T00:00:00.000Z")).toEqual({
      commitCount: 5,
      mergeCount: 1,
      prCount: 2,
      pipelineCount: 0,
    });
  });

  it("converts aggregated map to prisma upserts", () => {
    const aggregated = new Map([
      [
        "2026-02-01T00:00:00.000Z",
        { commitCount: 1, mergeCount: 1, prCount: 0, pipelineCount: 0 },
      ],
    ]);

    const upserts = toDailyUpserts("user_1", Provider.GITLAB, aggregated);

    expect(upserts).toHaveLength(1);
    expect(upserts[0].create.userId).toBe("user_1");
    expect(upserts[0].create.provider).toBe(Provider.GITLAB);
    expect(upserts[0].create.commitCount).toBe(1);
  });
});
