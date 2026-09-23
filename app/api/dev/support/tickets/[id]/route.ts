import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordSecurityAttempt } from "@/lib/security";

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

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/support/tickets",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const rl = rateLimit(`support:ticket:${session?.user?.email}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "โหลดบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          plan: true,
          createdAt: true,
          vibeSlug: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) {
    return NextResponse.json({ error: "ไม่พบเธรดนี้" }, { status: 404 });
  }

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { adminSeenAt: new Date() },
  });

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      status: ticket.status,
      needsAdmin: ticket.needsAdmin,
      subjectPreview: ticket.subjectPreview,
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      lastSender: ticket.lastSender,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      user: {
        id: ticket.user.id,
        email: ticket.user.email,
        displayName: ticket.user.displayName,
        plan: ticket.user.plan,
        vibeSlug: ticket.user.vibeSlug,
        createdAt: ticket.user.createdAt.toISOString(),
      },
      messages: ticket.messages.map(msgShape),
    },
  });
}