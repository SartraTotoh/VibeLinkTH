import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { PLAN_MRR } from "@/lib/funnel";

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
  series: { date: string; mrr: number; clicks: number; signups: number }[];
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

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const now = Date.now();
  const start = now - DAYS * DAY;
  const priorStart = start - DAYS * DAY;

  const [subs, planGroups, usersCreated, clickEvents] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: true, startedAt: true },
    }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.user.findMany({ select: { createdAt: true, _count: { select: { events: true } } } }),
    prisma.linkEvent.findMany({
      where: { type: "CLICK", createdAt: { gte: new Date(priorStart) } },
      select: { createdAt: true },
    }),
  ]);

  const totalUsers = usersCreated.length;

  const mrr = subs.reduce((n, s) => n + (PLAN_MRR[s.plan] ?? 0), 0);
  const paidUsers = subs.length;
  const arpu = paidUsers > 0 ? Math.round((mrr / paidUsers) * 100) / 100 : 0;

  const newSubs = subs.filter((s) => s.startedAt.getTime() >= start);
  const prevSubs = subs.filter((s) => s.startedAt.getTime() < start);
  const newMrr = newSubs.reduce((n, s) => n + (PLAN_MRR[s.plan] ?? 0), 0);
  const prevMrr = mrr - newMrr;
  const mrrDeltaPct = prevMrr > 0 ? Math.round(((mrr - prevMrr) / prevMrr) * 1000) / 10 : null;
  const mrrIsNew = prevMrr === 0 && mrr > 0;
  const paidDelta = newSubs.length;

  const arpuPrev = prevSubs.length > 0 ? Math.round((prevMrr / prevSubs.length) * 100) / 100 : null;
  const arpuDeltaPct = arpuPrev != null && arpuPrev > 0 ? Math.round(((arpu - arpuPrev) / arpuPrev) * 1000) / 10 : null;

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

  const clicksTotal = clickEvents.length;

  const daily: {
    date: string;
    mrr: number;
    clicks: number;
    signups: number;
  }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = now - i * DAY;
    daily.push({ date: new Date(d).toISOString().slice(0, 10), mrr: 0, clicks: 0, signups: 0 });
  }

  const subsSorted = [...subs].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  let subIdx = 0;
  let cumMrr = 0;
  for (const day of daily) {
    const dayStart = new Date(`${day.date}T00:00:00Z`).getTime() + DAY;
    while (subIdx < subsSorted.length && subsSorted[subIdx]!.startedAt.getTime() < dayStart) {
      cumMrr += PLAN_MRR[subsSorted[subIdx]!.plan] ?? 0;
      subIdx += 1;
    }
    day.mrr = cumMrr;
  }

  const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
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

  const cohort = (minAge: number) => {
    const eligible = usersCreated.filter((u) => now - u.createdAt.getTime() >= minAge * DAY);
    const active = eligible.filter((u) => u._count.events > 0).length;
    return {
      active,
      total: eligible.length,
      pct: eligible.length > 0 ? Math.round((active / eligible.length) * 1000) / 10 : null,
    };
  };
  const retention = { d7: cohort(7), d30: cohort(30) };

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
      convClickPurchase: clicksTotal > 0 ? Math.round((paidUsers / clicksTotal) * 1000) / 10 : null,
    },
    planMix,
    revenueMix,
    retention,
  };

  return NextResponse.json(body);
}