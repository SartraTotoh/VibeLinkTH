import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const [user, links, events, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailVerified: true,
        plan: true,
        createdAt: true,
        termsAcceptedAt: true,
      },
    }),
    prisma.link.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        title: true,
        slug: true,
        destinationUrl: true,
        platform: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.linkEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { id: true, linkId: true, type: true, device: true, browser: true, os: true, country: true, referrer: true, createdAt: true },
    }),
    prisma.subscription.findFirst({
      where: { userId: session.user.id },
      select: { plan: true, status: true, startedAt: true, expiresAt: true },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    subscription,
    links,
    events,
    note: "ไฟล์นี้เป็นสำเนาข้อมูลส่วนบุคคลของคุณจาก VibeLink",
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vibelink-export.json"',
      "Cache-Control": "no-store",
    },
  });
}
