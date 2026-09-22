import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { maskEmail } from "@/lib/privacy";
import type { CrmUser } from "@/lib/mock-users";

const DAY = 86400_000;

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const plan = (params.get("plan") ?? "ALL").toUpperCase();
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get("pageSize") ?? "100", 10) || 100));

  const where: Record<string, unknown> = {};
  if (plan === "FREE" || plan === "CREATOR" || plan === "CREATOR_PLUS") {
    where.plan = plan;
  }
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
    ];
  }

  const now = new Date();
  const [total, totalUsers, rows, byPlan, verified, new7d, new30d, activeSubs, totalLinks, totalClicks] =
    await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count(),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          displayName: true,
          plan: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { links: true, events: true } },
          subscription: { select: { plan: true, status: true } },
        },
      }),
      prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } } }),
      prisma.subscription.groupBy({
        by: ["plan"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.link.count(),
      prisma.linkEvent.count({ where: { type: "CLICK" } }),
    ]);

  const users: CrmUser[] = rows.map((u) => ({
    id: u.id,
    email: maskEmail(u.email),
    displayName: u.displayName,
    plan: u.plan as CrmUser["plan"],
    emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
    linkCount: u._count.links,
    clickCount: u._count.events,
    subscription: u.subscription ?? null,
  }));

  const planCounts: Record<string, number> = { FREE: 0, CREATOR: 0, CREATOR_PLUS: 0 };
  for (const g of byPlan) planCounts[g.plan] = g._count._all;

  const activeByPlan: Record<string, number> = {};
  for (const g of activeSubs) activeByPlan[g.plan] = g._count._all;
  const mrrEstimate = (activeByPlan.CREATOR ?? 0) * 199;

  return NextResponse.json({
    users,
    total,
    page,
    pageSize,
    overview: {
      totalUsers,
      byPlan: planCounts,
      verified,
      unverified: totalUsers - verified,
      new7d,
      new30d,
      activeSubs: activeSubs.reduce((n, g) => n + g._count._all, 0),
      totalLinks,
      totalClicks,
      mrrEstimate,
    },
  });
}
