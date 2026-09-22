import type { CrmUser } from "./mock-users";

export const PLAN_MRR: Record<string, number> = {
  FREE: 0,
  CREATOR: 199,
  // CREATOR_PLUS price TBD — counts as purchase with ฿0 until priced.
  CREATOR_PLUS: 0,
};

const DAY = 86400_000;

export type Funnel = {
  views: number;
  uniqueViews: number;
  clicks: number;
  purchases: number;
  mrr: number;
  convUnique: number;
  convClick: number;
  convPurchase: number;
  retentionD7: { active: number; total: number; pct: number };
  retentionD30: { active: number; total: number; pct: number };
};

function isActive(u: CrmUser, flag: "d7" | "d30"): boolean {
  if (typeof u[flag] === "boolean") return u[flag] as boolean;
  return u.clickCount > 0;
}

export function computeFunnel(rows: CrmUser[], now = Date.now()): Funnel {
  let views = 0;
  let uniqueViews = 0;
  let clicks = 0;
  let purchases = 0;
  let mrr = 0;

  for (const u of rows) {
    views += u.views ?? 0;
    uniqueViews += u.uniqueViews ?? 0;
    clicks += u.clickCount;
    if (u.subscription?.status === "ACTIVE") {
      purchases += 1;
      mrr += PLAN_MRR[u.subscription.plan] ?? 0;
    }
  }

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  let d7a = 0;
  let d7t = 0;
  let d30a = 0;
  let d30t = 0;
  for (const u of rows) {
    const age = now - new Date(u.createdAt).getTime();
    if (Number.isNaN(age) || age < 0) continue;
    if (age >= 7 * DAY) {
      d7t += 1;
      if (isActive(u, "d7")) d7a += 1;
    }
    if (age >= 30 * DAY) {
      d30t += 1;
      if (isActive(u, "d30")) d30a += 1;
    }
  }

  return {
    views,
    uniqueViews,
    clicks,
    purchases,
    mrr,
    convUnique: pct(uniqueViews, views),
    convClick: pct(clicks, uniqueViews),
    convPurchase: pct(purchases, clicks),
    retentionD7: { active: d7a, total: d7t, pct: pct(d7a, d7t) },
    retentionD30: { active: d30a, total: d30t, pct: pct(d30a, d30t) },
  };
}
