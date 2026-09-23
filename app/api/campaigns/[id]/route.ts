import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  if (body.name !== undefined) data.name = (body.name ?? "").trim() || undefined;
  if (body.source !== undefined) data.source = (body.source ?? "").trim() || undefined;
  if (body.medium !== undefined) data.medium = (body.medium ?? "").trim() || undefined;
  if (body.content !== undefined) data.content = (body.content ?? "").trim() || null;
  if (body.linkId !== undefined) {
    if (body.linkId) {
      const link = await prisma.link.findFirst({
        where: { id: body.linkId, userId: session.user.id },
        select: { id: true },
      });
      if (!link) {
        return NextResponse.json({ error: "ไม่พบลิงก์ที่เลือก" }, { status: 400 });
      }
      data.linkId = link.id;
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