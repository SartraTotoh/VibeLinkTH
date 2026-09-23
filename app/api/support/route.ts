import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hasHardSig, sanitizeValue } from "@/lib/charset";
import {
  matchRule,
  ruleReply,
  ticketPreview,
  DEFAULT_SETTINGS,
} from "@/lib/support";
import { writeAudit } from "@/lib/audit";

const MESSAGE_LIMIT = 2400;

function settingsFrom(row: {
  autoReplyOn: boolean;
  faqOn: boolean;
  greetingTh: string;
  greetingEn: string;
  noMatchTh: string;
  noMatchEn: string;
  hoursTh: string | null;
  hoursEn: string | null;
  emailNotify: boolean;
}) {
  return {
    autoReplyOn: row.autoReplyOn,
    faqOn: row.faqOn,
    greetingTh: row.greetingTh,
    greetingEn: row.greetingEn,
    noMatchTh: row.noMatchTh,
    noMatchEn: row.noMatchEn,
    hoursTh: row.hoursTh ?? null,
    hoursEn: row.hoursEn ?? null,
    emailNotify: row.emailNotify,
  };
}

async function getSettings() {
  const row = await prisma.supportSettings.findUnique({ where: { id: "singleton" } });
  if (row) return settingsFrom(row);
  const created = await prisma.supportSettings
    .create({
      data: {
        id: "singleton",
        ...DEFAULT_SETTINGS,
      },
    })
    .catch(() => null);
  return created ? settingsFrom(created) : settingsFrom(DEFAULT_SETTINGS);
}

function ticketShape(t: {
  id: string;
  status: string;
  needsAdmin: boolean;
  subjectPreview: string | null;
  lastMessageAt: Date;
  lastSender: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    status: t.status,
    needsAdmin: t.needsAdmin,
    subjectPreview: t.subjectPreview,
    lastMessageAt: t.lastMessageAt.toISOString(),
    lastSender: t.lastSender,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const [settings, rules, tickets] = await Promise.all([
    getSettings(),
    prisma.autoReplyRule.findMany({
      where: { enabled: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        priority: true,
        keywords: true,
        replyTh: true,
        replyEn: true,
        faqTh: true,
        faqEn: true,
        category: true,
        hitCount: true,
      },
    }),
    prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { lastMessageAt: "desc" },
      take: 10,
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  return NextResponse.json({
    settings,
    faq: rules.map((r) => ({
      id: r.id,
      priority: r.priority,
      category: r.category,
      qTh: r.faqTh ?? r.replyTh,
      qEn: r.faqEn ?? r.replyEn,
      aTh: r.replyTh,
      aEn: r.replyEn,
      hitCount: r.hitCount,
    })),
    tickets: tickets.map((t) => ({
      ...ticketShape(t),
      messages: t.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        ruleId: m.ruleId,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const rl = rateLimit(`support:msg:${session.user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "ส่งข้อความบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const raw = (await req.json().catch(() => null)) as { body?: string; lang?: string } | null;
  if (!raw || typeof raw.body !== "string") {
    return NextResponse.json({ error: "ข้อความไม่ถูกต้อง" }, { status: 400 });
  }

  const cleaned = sanitizeValue({ body: raw.body });
  const body = cleaned.body.trim();
  if (!body) {
    return NextResponse.json({ error: "พิมพ์ข้อความก่อนส่งครับ" }, { status: 400 });
  }
  if (body.length > MESSAGE_LIMIT) {
    return NextResponse.json({ error: `ข้อความยาวเกิน ${MESSAGE_LIMIT} ตัวอักษร` }, { status: 400 });
  }
  if (hasHardSig(body)) {
    return NextResponse.json(
      { error: "ข้อความมีอักขระที่เข้ารหัสผิด (mojibake) — กรุณาพิมพ์ใหม่" },
      { status: 400 },
    );
  }

  const lang = raw.lang === "en" ? "en" : "th";
  const [settings, rules, lastTicket] = await Promise.all([
    getSettings(),
    prisma.autoReplyRule.findMany({
      where: { enabled: true },
      select: { id: true, enabled: true, priority: true, keywords: true, replyTh: true, replyEn: true },
    }),
    prisma.supportTicket.findFirst({
      where: { userId: session.user.id, status: "OPEN" },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true },
    }),
  ]);

  let ticketId = lastTicket?.id ?? null;
  if (!ticketId) {
    const created = await prisma.supportTicket.create({
      data: { userId: session.user.id },
      select: { id: true },
    });
    ticketId = created.id;
  }

  const match = settings.autoReplyOn ? matchRule(rules, body) : null;

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: "OPEN",
      needsAdmin: match ? false : true,
      lastSender: "MEMBER",
      subjectPreview: ticketPreview(body),
      lastMessageAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, sender: "MEMBER", body },
  });

  if (match) {
    await prisma.$transaction([
      prisma.supportMessage.create({
        data: { ticketId: ticket.id, sender: "AUTO", body: ruleReply(match, lang), ruleId: match.id },
      }),
      prisma.autoReplyRule.update({
        where: { id: match.id },
        data: { hitCount: { increment: 1 } },
      }),
    ]);
  } else {
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        sender: "AUTO",
        body: lang === "en" ? settings.noMatchEn : settings.noMatchTh,
      },
    });
    await writeAudit({
      actorEmail: session.user.email ?? undefined,
      action: "support.ticket_needs_admin",
      subjectType: "SUPPORT",
      subjectRef: ticket.id,
      detail: `คำถามที่ auto-reply ตอบไม่ได้: ${ticketPreview(body, 120)}`,
      result: "open",
    });
  }

  const withMessages = await prisma.supportTicket.findUnique({
    where: { id: ticket.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!withMessages) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }

  return NextResponse.json({
    ticket: {
      ...ticketShape(withMessages),
      messages: withMessages.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        ruleId: m.ruleId,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}