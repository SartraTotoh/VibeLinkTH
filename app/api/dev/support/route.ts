import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordSecurityAttempt } from "@/lib/security";
import { hasHardSig, sanitizeValue } from "@/lib/charset";
import { matchRule, ticketPreview, DEFAULT_SETTINGS } from "@/lib/support";
import { writeAudit } from "@/lib/audit";

const TICKET_MAX = 500;
const REPLY_LIMIT = 2400;

async function requireAdmin(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/support",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return { session: null };
  }
  return { session };
}

function msgShape(m: {
  id: string;
  sender: string;
  body: string;
  ruleId: string | null;
  createdAt: Date;
}) {
  return {
    id: m.id,
    sender: m.sender,
    body: m.body,
    ruleId: m.ruleId,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const { session } = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "inbox";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const where: Record<string, unknown> = {};
  if (view === "inbox") {
    where.status = "OPEN";
    where.needsAdmin = true;
  } else if (view === "all") {
    where.OR = [
      { status: "OPEN" },
      { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
    ];
  } else if (view === "resolved") {
    where.status = "RESOLVED";
  }

  const [tickets, settings, openCount] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: TICKET_MAX,
      include: {
        user: { select: { email: true, displayName: true, plan: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportSettings.findUnique({ where: { id: "singleton" } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
  ]);

  let filtered = tickets;
  if (q) {
    filtered = filtered.filter(
      (t) =>
        (t.subjectPreview ?? "").toLowerCase().includes(q) ||
        t.user.email.toLowerCase().includes(q) ||
        (t.user.displayName ?? "").toLowerCase().includes(q),
    );
  }

  return NextResponse.json({
    openCount,
    inboxCount: tickets.filter((t) => t.needsAdmin && t.status === "OPEN").length,
    tickets: filtered.map((t) => ({
      id: t.id,
      status: t.status,
      needsAdmin: t.needsAdmin,
      subjectPreview: t.subjectPreview,
      lastMessageAt: t.lastMessageAt.toISOString(),
      lastSender: t.lastSender,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messageCount: t._count.messages,
      user: {
        email: t.user.email,
        displayName: t.user.displayName,
        plan: t.user.plan,
      },
    })),
    settings: settings
      ? {
          autoReplyOn: settings.autoReplyOn,
          faqOn: settings.faqOn,
          hoursTh: settings.hoursTh,
          hoursEn: settings.hoursEn,
          emailNotify: settings.emailNotify,
        }
      : null,
  });
}

async function getTicket(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: {
        select: { id: true, email: true, displayName: true, plan: true, createdAt: true, vibeSlug: true },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) return null;
  return {
    ...ticket,
    user: {
      ...ticket.user,
      createdAt: ticket.user.createdAt.toISOString(),
    },
    createdISO: ticket.createdAt.toISOString(),
    updatedISO: ticket.updatedAt.toISOString(),
    lastMessageISO: ticket.lastMessageAt.toISOString(),
    messages: ticket.messages.map(msgShape),
  };
}

export async function POST(req: Request) {
  const { session } = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = (await req.json().catch(() => null)) as
    | {
        action?: string;
        ticketId?: string;
        body?: string;
        lang?: string;
      }
    | null;
  if (!raw || typeof raw.ticketId !== "string" || !raw.action) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const rl = rateLimit(`support:admin:${session.user?.email}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "ทำรายการบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: raw.ticketId },
    select: { id: true, userId: true, status: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "ไม่พบเธรดนี้" }, { status: 404 });
  }

  if (raw.action === "reply") {
    if (typeof raw.body !== "string") {
      return NextResponse.json({ error: "ข้อความตอบกลับไม่ถูกต้อง" }, { status: 400 });
    }
    const cleaned = sanitizeValue({ body: raw.body });
    const body = cleaned.body.trim();
    if (!body) {
      return NextResponse.json({ error: "พิมพ์ข้อความก่อนตอบ" }, { status: 400 });
    }
    if (body.length > REPLY_LIMIT) {
      return NextResponse.json({ error: `ข้อความยาวเกิน ${REPLY_LIMIT} ตัวอักษร` }, { status: 400 });
    }
    if (hasHardSig(body)) {
      return NextResponse.json(
        { error: "ข้อความมีอักขระที่เข้ารหัสผิด (mojibake) — กรุณาพิมพ์ใหม่" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.supportMessage.create({
        data: { ticketId: ticket.id, sender: "ADMIN", body },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "OPEN",
          needsAdmin: false,
          lastSender: "ADMIN",
          lastMessageAt: new Date(),
          adminSeenAt: new Date(),
        },
      }),
    ]);

    await writeAudit({
      actorEmail: session.user?.email ?? undefined,
      action: "support.admin_reply",
      subjectType: "SUPPORT",
      subjectRef: ticket.id,
      detail: `ตอบกลับแชทผู้ดูแล`,
      result: "success",
    });

    const updated = await getTicket(ticket.id);
    return NextResponse.json(updated ? { ticket: updated } : { error: "เกิดข้อผิดพลาด" }, {
      status: updated ? 200 : 500,
    });
  }

  if (raw.action === "resolve") {
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "RESOLVED", needsAdmin: false },
    });
    await writeAudit({
      actorEmail: session.user?.email ?? undefined,
      action: "support.resolve",
      subjectType: "SUPPORT",
      subjectRef: ticket.id,
      detail: `ปิดงานแชท`,
      result: "success",
    });
    const updated = await getTicket(ticket.id);
    return NextResponse.json(updated ? { ticket: updated } : { error: "เกิดข้อผิดพลาด" }, {
      status: updated ? 200 : 500,
    });
  }

  if (raw.action === "reopen") {
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "OPEN", needsAdmin: false },
    });
    const updated = await getTicket(ticket.id);
    return NextResponse.json(updated ? { ticket: updated } : { error: "เกิดข้อผิดพลาด" }, {
      status: updated ? 200 : 500,
    });
  }

  return NextResponse.json({ error: "action ไม่รู้จัก" }, { status: 400 });
}

export async function PUT(req: Request) {
  const { session } = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = (await req.json().catch(() => null)) as {
    autoReplyOn?: boolean;
    faqOn?: boolean;
    greetingTh?: string;
    greetingEn?: string;
    noMatchTh?: string;
    noMatchEn?: string;
    hoursTh?: string | null;
    hoursEn?: string | null;
    emailNotify?: boolean;
  } | null;
  if (!raw) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const cleaned = sanitizeValue(raw);
  const existing = await prisma.supportSettings.findUnique({ where: { id: "singleton" } });
  if (!existing) {
    await prisma.supportSettings.create({
      data: { id: "singleton", ...DEFAULT_SETTINGS },
    });
  }

  const result = await prisma.supportSettings.update({
    where: { id: "singleton" },
    data: {
      autoReplyOn: typeof cleaned.autoReplyOn === "boolean" ? cleaned.autoReplyOn : undefined,
      faqOn: typeof cleaned.faqOn === "boolean" ? cleaned.faqOn : undefined,
      greetingTh: typeof cleaned.greetingTh === "string" ? cleaned.greetingTh : undefined,
      greetingEn: typeof cleaned.greetingEn === "string" ? cleaned.greetingEn : undefined,
      noMatchTh: typeof cleaned.noMatchTh === "string" ? cleaned.noMatchTh : undefined,
      noMatchEn: typeof cleaned.noMatchEn === "string" ? cleaned.noMatchEn : undefined,
      hoursTh: typeof cleaned.hoursTh === "string" || cleaned.hoursTh == null ? (cleaned.hoursTh ?? null) : undefined,
      hoursEn: typeof cleaned.hoursEn === "string" || cleaned.hoursEn == null ? (cleaned.hoursEn ?? null) : undefined,
      emailNotify: typeof cleaned.emailNotify === "boolean" ? cleaned.emailNotify : undefined,
    },
  });

  await writeAudit({
    actorEmail: session.user?.email ?? undefined,
    action: "support.update_settings",
    subjectType: "SUPPORT",
    detail: "แก้ไขการตั้งค่า Support (auto-reply/FAQ/เวลาทำการ)",
    result: "success",
  });

  return NextResponse.json({
    settings: {
      autoReplyOn: result.autoReplyOn,
      faqOn: result.faqOn,
      greetingTh: result.greetingTh,
      greetingEn: result.greetingEn,
      noMatchTh: result.noMatchTh,
      noMatchEn: result.noMatchEn,
      hoursTh: result.hoursTh,
      hoursEn: result.hoursEn,
      emailNotify: result.emailNotify,
    },
  });
}