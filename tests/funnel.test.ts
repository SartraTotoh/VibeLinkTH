import { describe, expect, it } from "vitest";
import { computeFunnel } from "../lib/funnel";
import type { CrmUser } from "../lib/mock-users";

const NOW = new Date("2026-09-22T00:00:00.000Z").getTime();
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86400_000).toISOString();

function user(over: Partial<CrmUser> & { id: string }): CrmUser {
  return {
    email: `${over.id}@example.com`,
    displayName: null,
    plan: "FREE",
    emailVerified: null,
    createdAt: iso(60),
    linkCount: 0,
    clickCount: 0,
    subscription: null,
    ...over,
  };
}

describe("computeFunnel", () => {
  it("aggregates stages, conversions and purchase MRR", () => {
    const rows = [
      user({
        id: "a",
        plan: "CREATOR",
        views: 1000,
        uniqueViews: 600,
        clickCount: 60,
        subscription: { plan: "CREATOR", status: "ACTIVE" },
      }),
      user({
        id: "b",
        plan: "FREE",
        views: 500,
        uniqueViews: 200,
        clickCount: 10,
        subscription: null,
      }),
    ];
    const f = computeFunnel(rows, NOW);
    expect(f.views).toBe(1500);
    expect(f.uniqueViews).toBe(800);
    expect(f.clicks).toBe(70);
    expect(f.purchases).toBe(1);
    expect(f.mrr).toBe(199);
    expect(f.convUnique).toBeCloseTo(53.3, 1);
    expect(f.convClick).toBeCloseTo(8.8, 1);
    expect(f.convPurchase).toBeCloseTo(1.4, 1);
  });

  it("ignores expired/canceled subscriptions for purchases", () => {
    const rows = [
      user({ id: "c", clickCount: 5, subscription: { plan: "CREATOR", status: "EXPIRED" } }),
    ];
    const f = computeFunnel(rows, NOW);
    expect(f.purchases).toBe(0);
    expect(f.mrr).toBe(0);
  });

  it("computes retention over age-eligible users", () => {
    const rows = [
      user({ id: "old-on", createdAt: iso(40), clickCount: 3, d7: true, d30: true }),
      user({ id: "old-off", createdAt: iso(40), clickCount: 0, d7: false, d30: false }),
      user({ id: "new", createdAt: iso(2), clickCount: 9 }),
    ];
    const f = computeFunnel(rows, NOW);
    expect(f.retentionD7).toEqual({ active: 1, total: 2, pct: 50 });
    expect(f.retentionD30).toEqual({ active: 1, total: 2, pct: 50 });
  });

  it("derives real-user activity from clicks when flags are absent", () => {
    const rows = [user({ id: "r", createdAt: iso(45), clickCount: 7 })];
    const f = computeFunnel(rows, NOW);
    expect(f.retentionD7.active).toBe(1);
    expect(f.retentionD30.active).toBe(1);
  });

  it("handles empty input", () => {
    const f = computeFunnel([], NOW);
    expect(f).toEqual({
      views: 0,
      uniqueViews: 0,
      clicks: 0,
      purchases: 0,
      mrr: 0,
      convUnique: 0,
      convClick: 0,
      convPurchase: 0,
      retentionD7: { active: 0, total: 0, pct: 0 },
      retentionD30: { active: 0, total: 0, pct: 0 },
    });
  });
});
