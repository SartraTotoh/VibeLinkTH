import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rl = rateLimit(`security-feed:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "เร็วเกินไป" }, { status: 429 });
  }

  const events = await prisma.auditLog.findMany({
    where: { subjectType: "SECURITY" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      actorEmail: true,
      action: true,
      subjectRef: true,
      detail: true,
      result: true,
      createdAt: true,
    },
  });

  const last24 = events.filter((e) => Date.now() - new Date(e.createdAt).getTime() < 86_400_000);
  const ipCount = new Map<string, number>();
  for (const e of last24) {
    const m = e.detail?.match(/ip ([^\s]+)/);
    const ip = m ? m[1] : "unknown";
    ipCount.set(ip, (ipCount.get(ip) ?? 0) + 1);
  }

  return NextResponse.json({
    events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    last24h: last24.length,
    topIps: [...ipCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count })),
  });
}