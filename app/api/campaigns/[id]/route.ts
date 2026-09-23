import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasHardSig, sanitizeObject } from "@/lib/charset";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบแคมเปญนี้" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    source?: string;
    medium?: string;
    content?: string | null;
    linkId?: string | null;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  let unbroken: Record<string, unknown> = {};
  try {
    unbroken = sanitizeObject({
      name: body.name,
      source: body.source,
      medium: body.medium,
      content: body.content,
      linkId: body.linkId,
    });
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const badText = [unbroken.name, unbroken.source, unbroken.medium]
    .some((v) => typeof v === "string" && hasHardSig(v));
  if (badText) {
    return NextResponse.json(
      { error: "ข้อมูลมีอักขระที่เข้ารหัสผิด (mojibake) — กรุณากรอกใหม่" },
      { status: 400 },
    );
  }
  if (unbroken.name !== undefined) data.name = String(unbroken.name ?? "").trim() || undefined;
  if (unbroken.source !== undefined) data.source = String(unbroken.source ?? "").trim() || undefined;
  if (unbroken.medium !== undefined) data.medium = String(unbroken.medium ?? "").trim() || undefined;
  if (unbroken.content !== undefined) data.content = String(unbroken.content ?? "").trim() || null;
  if (unbroken.linkId !== undefined) {
    if (unbroken.linkId) {
      const link = await prisma.link.findFirst({
        where: { id: String(unbroken.linkId), userId: session.user.id },
        select: { id: true },
      });
      if (!link) {
        return NextResponse.json({ error: "ไม่พบลิงก์ที่เลือก" }, { status: 400 });
      }
      data.linkId = String(unbroken.linkId);
    } else {
      data.linkId = null;
    }
  }
  const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

  const campaign = await prisma.campaign.update({
    where: { id },
    data: cleaned,
    include: {
      link: { select: { id: true, slug: true, title: true } },
      _count: { select: { events: { where: { type: "CLICK" } } } },
    },
  });

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      source: campaign.source,
      medium: campaign.medium,
      content: campaign.content,
      linkId: campaign.linkId,
      linkSlug: campaign.link?.slug ?? null,
      linkTitle: campaign.link?.title ?? null,
      clicks: campaign._count.events,
      createdAt: campaign.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.campaign.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบแคมเปญนี้" }, { status: 404 });
  }

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}