import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      link: { select: { id: true, slug: true, title: true } },
      _count: { select: { events: { where: { type: "CLICK" } } } },
    },
  });
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      source: c.source,
      medium: c.medium,
      content: c.content,
      linkId: c.linkId,
      linkSlug: c.link?.slug ?? null,
      linkTitle: c.link?.title ?? null,
      clicks: c._count.events,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    source?: string;
    medium?: string;
    content?: string;
    linkId?: string | null;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const source = (body.source ?? "").trim();
  const medium = (body.medium ?? "").trim();
  const content = (body.content ?? "").trim() || null;
  if (!name || !source || !medium) {
    return NextResponse.json(
      { error: "กรอกชื่อแคมเปญ (name) แหล่งที่มา (source) และช่องทาง (medium) ให้ครบ" },
      { status: 400 },
    );
  }

  let linkId: string | null = null;
  if (body.linkId) {
    const link = await prisma.link.findFirst({
      where: { id: body.linkId, userId: session.user.id },
      select: { id: true },
    });
    if (!link) {
      return NextResponse.json({ error: "ไม่พบลิงก์ที่เลือก" }, { status: 400 });
    }
    linkId = link.id;
  }

  const campaign = await prisma.campaign.create({
    data: { userId: session.user.id, name, source, medium, content, linkId },
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