import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { limitsOf } from "@/lib/plans";
import { getActivePlan } from "@/lib/subscription";
import { detectPlatform, isValidSlug, normalizeDestination, randomSlug } from "@/lib/links";

const createSchema = z.object({
  destinationUrl: z.string().min(1).max(2048),
  title: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().toLowerCase().max(30).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const destinationUrl = normalizeDestination(parsed.data.destinationUrl);
  if (!destinationUrl) {
    return NextResponse.json(
      { error: "Destination URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http/https)" },
      { status: 400 },
    );
  }

  if (parsed.data.slug !== undefined && parsed.data.slug !== "" && !isValidSlug(parsed.data.slug)) {
    return NextResponse.json(
      { error: "Slug ใช้ได้แค่ a-z, 0-9, ขีดกลาง ยาว 3-30 ตัว และห้ามซ้ำกับชื่อระบบ" },
      { status: 400 },
    );
  }

  const limits = limitsOf(await getActivePlan(session.user.id));
  if (parsed.data.slug && !limits.customSlug) {
    return NextResponse.json(
      { error: "ตั้งชื่อ Slug เองได้เฉพาะแพ็กเกจ Creator ขึ้นไป — อัปเกรดเพื่อใช้ชื่อลิงก์ของตัวเอง" },
      { status: 403 },
    );
  }
  if (limits.maxActiveLinks !== null) {
    const activeCount = await prisma.link.count({
      where: { userId: session.user.id, status: "ACTIVE" },
    });
    if (activeCount >= limits.maxActiveLinks) {
      return NextResponse.json(
        { error: `เต็มโควต้าแล้ว (${limits.maxActiveLinks} ลิงก์แอกทีฟ) — ปิดลิงก์เก่าหรืออัปเกรดแพ็กเกจ` },
        { status: 403 },
      );
    }
  }

  let slug: string | undefined = parsed.data.slug || undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = slug ?? randomSlug();
    const exists = await prisma.link.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) {
      slug = candidate;
      break;
    }
    if (parsed.data.slug) {
      return NextResponse.json({ error: "Slug นี้ถูกใช้แล้ว เลือกชื่ออื่นนะ" }, { status: 409 });
    }
    slug = undefined;
  }
  if (!slug) {
    return NextResponse.json({ error: "สร้าง slug ไม่สำเร็จ ลองอีกครั้ง" }, { status: 500 });
  }

  const link = await prisma.link.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title ?? new URL(destinationUrl).hostname,
      slug,
      destinationUrl,
      platform: detectPlatform(destinationUrl),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      link: {
        id: link.id,
        title: link.title,
        slug: link.slug,
        destinationUrl: link.destinationUrl,
        platform: link.platform,
        status: link.status,
        clicks: 0,
        shortUrl: `${process.env.SHORT_LINK_URL ?? ""}/${link.slug}`,
        createdAt: link.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const limits = limitsOf(await getActivePlan(session.user.id));
  const since = new Date(Date.now() - limits.analyticsDays * 86400_000);

  const links = await prisma.link.findMany({
    where: { userId: session.user.id, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { events: { where: { type: "CLICK", createdAt: { gte: since } } } },
      },
    },
    take: 200,
  });

  return NextResponse.json({
    links: links.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      destinationUrl: l.destinationUrl,
      platform: l.platform,
      status: l.status,
      clicks: l._count.events,
      shortUrl: `${process.env.SHORT_LINK_URL ?? ""}/${l.slug}`,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
