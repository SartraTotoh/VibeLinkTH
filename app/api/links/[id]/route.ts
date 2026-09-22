import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { limitsOf } from "@/lib/plans";
import { getActivePlan } from "@/lib/subscription";
import { isValidSlug, normalizeDestination } from "@/lib/links";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  destinationUrl: z.string().min(1).max(2048).optional(),
  slug: z.string().trim().toLowerCase().max(30).optional(),
  expiresAt: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

function linkShape(link: {
  id: string;
  title: string;
  slug: string;
  destinationUrl: string;
  platform: string | null;
  status: string;
  expiresAt: Date | null;
}) {
  return {
    id: link.id,
    title: link.title,
    slug: link.slug,
    destinationUrl: link.destinationUrl,
    platform: link.platform,
    status: link.status,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
  };
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const existing = await prisma.link.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบลิงก์นี้" }, { status: 404 });
  }

  const data: {
    status?: "ACTIVE" | "PAUSED";
    title?: string;
    destinationUrl?: string;
    platform?: string | null;
    slug?: string;
    expiresAt?: Date | null;
  } = {};

  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.title !== undefined) data.title = parsed.data.title;

  if (parsed.data.destinationUrl !== undefined) {
    const destinationUrl = normalizeDestination(parsed.data.destinationUrl);
    if (!destinationUrl) {
      return NextResponse.json(
        { error: "Destination URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http/https)" },
        { status: 400 },
      );
    }
    data.destinationUrl = destinationUrl;
    const { detectPlatform } = await import("@/lib/links");
    data.platform = detectPlatform(destinationUrl);
  }

  if (parsed.data.slug !== undefined) {
    const candidate = parsed.data.slug;
    if (!candidate) {
      return NextResponse.json({ error: "Slug ห้ามว่าง" }, { status: 400 });
    }
    if (!isValidSlug(candidate)) {
      return NextResponse.json(
        { error: "Slug ใช้ได้แค่ a-z, 0-9, ขีดกลาง ยาว 3-30 ตัว และห้ามซ้ำกับชื่อระบบ" },
        { status: 400 },
      );
    }
    if (candidate !== existing.slug) {
      const limits = limitsOf(await getActivePlan(session.user.id));
      if (!limits.customSlug) {
        return NextResponse.json(
          { error: "เปลี่ยน Slug เองได้เฉพาะแพ็กเกจ Creator ขึ้นไป" },
          { status: 403 },
        );
      }
      const taken = await prisma.link.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Slug นี้ถูกใช้แล้ว เลือกชื่ออื่นนะ" }, { status: 409 });
      }
      data.slug = candidate;
    }
  }

  if (parsed.data.expiresAt !== undefined) {
    if (parsed.data.expiresAt === null || parsed.data.expiresAt === "") {
      data.expiresAt = null;
    } else {
      const dt = new Date(parsed.data.expiresAt);
      if (Number.isNaN(dt.getTime())) {
        return NextResponse.json({ error: "วันหมดอายุไม่ถูกต้อง" }, { status: 400 });
      }
      if (dt.getTime() <= Date.now()) {
        return NextResponse.json({ error: "วันหมดอายุต้องเป็นเวลาในอนาคต" }, { status: 400 });
      }
      data.expiresAt = dt;
    }
  }

  const link = await prisma.link.update({ where: { id }, data });
  return NextResponse.json({ ok: true, link: linkShape(link) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.link.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบลิงก์นี้" }, { status: 404 });
  }

  await prisma.link.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
