import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { maskEmail } from "@/lib/privacy";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordSecurityAttempt } from "@/lib/security";

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/users",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const email = new URL(req.url).searchParams.get("email")?.toLowerCase().trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "ระบุอีเมล" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      emailVerified: true,
      plan: true,
      createdAt: true,
      termsAcceptedAt: true,
      _count: { select: { links: true, events: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
  }

  const [subscription, links] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      select: { plan: true, status: true, startedAt: true, expiresAt: true },
    }),
    prisma.link.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        destinationUrl: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    }),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      email: maskEmail(user.email),
      createdAt: user.createdAt.toISOString(),
      emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
      termsAcceptedAt: user.termsAcceptedAt ? user.termsAcceptedAt.toISOString() : null,
    },
    subscription,
    links: links.map((l) => ({
      ...l,
      expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
      createdAt: l.createdAt.toISOString(),
      clicks: l._count.events,
    })),
  });
}
