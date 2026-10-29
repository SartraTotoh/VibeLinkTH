import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { PLAN_MRR } from "@/lib/funnel";
import { bangkokDayKey, reportingWindow } from "@/lib/reporting-time";
import { clientIp } from "@/lib/rate-limit";
import { recordSecurityAttempt } from "@/lib/security";

const DAY = 86400_000;
const DAYS = 30;

export type Metrics = {
  periodDays: number;
  totalUsers: number;
  kpis: {
    mrr: number;
    mrrDeltaPct: number | null;
    mrrIsNew: boolean;
    paidUsers: number;
    paidDelta: number;
    arpu: number;
    arpuDeltaPct: number | null;
    signups: number;
    signupsDeltaPct: number | null;
    clicks: number;
    clicksDeltaPct: number | null;
  };
  series: { date: string; mrr: number | null; clicks: number; signups: number }[];
  funnel: {
    views: number;
    uniqueViews: number;
    clicks: number;
    purchases: number;
    convViewClick: number | null;
    convClickPurchase: number | null;
  };
  planMix: { plan: string; label: string; count: number; pct: number }[];
  revenueMix: { plan: string; label: string; amount: number; pct: number }[];
  retention: {
    d7: { active: number; total: number; pct: number | null };
    d30: { active: number; total: number; pct: number | null };
  };
};

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/metrics",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const now = Date.now();
  const window = reportingWindow(DAYS, now);
  const start = window.since;
  const priorStart = start - DAYS * DAY;

  const [subs, planGroups, usersCreated, clickEvents] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: true, startedAt: true },
    }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.linkEvent.findMany({
      where: { type: "CLICK", createdAt: { gte: new Date(priorStart), lte: new Date(now) } },
      select: { createdAt: true },
    }),
  ]);

  const totalUsers = usersCreated.length;

  const mrr = subs.reduce((n, s) => n + (PLAN_MRR[s.plan] ?? 0), 0);
  const paidUsers = subs.length;
  const arpu = paidUsers > 0 ? Math.round((mrr / paidUsers) * 100) / 100 : 0;

  const newSubs = subs.filter((s) => s.startedAt.getTime() >= start);
  // Current ACTIVE rows cannot reconstruct churn, historical MRR or net growth.
  const mrrDeltaPct = null;
  const mrrIsNew = false;
  const paidDelta = newSubs.length;
  const arpuDeltaPct = null;

  const signupsNow = usersCreated.filter((u) => u.createdAt.getTime() >= start).length;
  const signupsPrior = usersCreated.filter(
    (u) => u.createdAt.getTime() >= priorStart && u.createdAt.getTime() < start,
  ).length;
  const signupsDeltaPct =
    signupsPrior > 0 ? Math.round(((signupsNow - signupsPrior) / signupsPrior) * 1000) / 10 : null;

  const clicksNow = clickEvents.filter((e) => e.createdAt.getTime() >= start).length;
  const clicksPrior = clickEvents.filter(
    (e) => e.createdAt.getTime() >= priorStart && e.createdAt.getTime() < start,
  ).length;
  const clicksDeltaPct =
    clicksPrior > 0 ? Math.round(((clicksNow - clicksPrior) / clicksPrior) * 1000) / 10 : null;

  const clicksTotal = clicksNow;

  const daily: {
    date: string;
    mrr: number | null;
    clicks: number;
    signups: number;
  }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = window.dates[DAYS - 1 - i]!;
    daily.push({ date, mrr: null, clicks: 0, signups: 0 });
  }

  const dayKey = (t: number) => bangkokDayKey(t);
  const byDay = (t: number) => daily.find((d) => d.date === dayKey(t));
  for (const e of clickEvents) {
    const d = byDay(e.createdAt.getTime());
    if (d) d.clicks += 1;
  }
  for (const u of usersCreated) {
    const d = byDay(u.createdAt.getTime());
    if (d) d.signups += 1;
  }

  const planLabels: Record<string, string> = { FREE: "Free", CREATOR: "Creator", CREATOR_PLUS: "Creator+" };
  const planCounts: Record<string, number> = { FREE: 0, CREATOR: 0, CREATOR_PLUS: 0 };
  for (const g of planGroups) planCounts[g.plan] = g._count._all;
  const planMix = Object.entries(planCounts).map(([plan, count]) => ({
    plan,
    label: planLabels[plan] ?? plan,
    count,
    pct: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
  }));

  const revCounts: Record<string, number> = {};
  for (const s of subs) revCounts[s.plan] = (revCounts[s.plan] ?? 0) + 1;
  const revenueMix = Object.entries(revCounts).map(([plan, count]) => {
    const amount = count * (PLAN_MRR[plan] ?? 0);
    return {
      plan,
      label: planLabels[plan] ?? plan,
      amount,
      pct: mrr > 0 ? Math.round((amount / mrr) * 1000) / 10 : 0,
    };
  });

  // LinkEvent records visitor traffic, not the creator returning to the product.
  // Do not manufacture D7/D30 retention from lifetime visitor clicks.
  const retention = {
    d7: { active: 0, total: 0, pct: null },
    d30: { active: 0, total: 0, pct: null },
  };

  const body: Metrics = {
    periodDays: DAYS,
    totalUsers,
    kpis: {
      mrr,
      mrrDeltaPct,
      mrrIsNew,
      paidUsers,
      paidDelta,
      arpu,
      arpuDeltaPct,
      signups: signupsNow,
      signupsDeltaPct,
      clicks: clicksNow,
      clicksDeltaPct,
    },
    series: daily,
    funnel: {
      views: 0,
      uniqueViews: 0,
      clicks: clicksTotal,
      purchases: paidUsers,
      convViewClick: null,
      convClickPurchase: null, // Subscriptions are not attributed to link visitors.
    },
    planMix,
    revenueMix,
    retention,
  };

  return NextResponse.json(body);
}