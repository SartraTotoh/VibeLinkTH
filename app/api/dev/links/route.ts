import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { maskEmail } from "@/lib/privacy";
import { writeAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordSecurityAttempt } from "@/lib/security";

const patchSchema = z.object({
  slug: z.string().min(1).max(60),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/links",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const slug = new URL(req.url).searchParams.get("slug")?.toLowerCase().trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "ระบุ slug" }, { status: 400 });
  }

  const link = await prisma.link.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      destinationUrl: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { email: true, plan: true } },
      _count: { select: { events: true } },
    },
  });
  if (!link) {
    return NextResponse.json({ error: "ไม่พบลิงก์นี้" }, { status: 404 });
  }

  return NextResponse.json({
    link: {
      ...link,
      user: { ...link.user, email: maskEmail(link.user.email) },
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      createdAt: link.createdAt.toISOString(),
      clicks: link._count.events,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/links",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const link = await prisma.link.findUnique({
    where: { slug: parsed.data.slug.toLowerCase() },
    select: { id: true },
  });
  if (!link) {
    return NextResponse.json({ error: "ไม่พบลิงก์นี้" }, { status: 404 });
  }

  const updated = await prisma.link.update({
    where: { id: link.id },
    data: { status: parsed.data.status },
    select: { slug: true, status: true },
  });

  await writeAudit({
    actorEmail: session?.user?.email ?? undefined,
    action: "link.set_status",
    subjectType: "link",
    subjectRef: updated.slug,
    detail: `ตั้งสถานะเป็น ${updated.status}`,
    result: "success",
  });

  return NextResponse.json({ ok: true, link: updated });
}
