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

  const limitArg = Number(new URL(req.url).searchParams.get("limit") ?? "30");
  const limit = Number.isFinite(limitArg) ? Math.min(Math.max(limitArg, 1), 200) : 30;

  const ipLimit = rateLimit(`audit:${clientIp(req)}`, 30, 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json({ error: "เร็วเกินไป" }, { status: 429 });
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actorEmail: true,
      action: true,
      subjectType: true,
      subjectRef: true,
      detail: true,
      result: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    count: logs.length,
  });
}