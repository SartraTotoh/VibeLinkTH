import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { verifyPin } from "@/lib/privacy";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { recordSecurityAttempt } from "@/lib/security";

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/users/export",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ipLimit = rateLimit(`export-pin:${clientIp(req)}`, 5, 15 * 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "พยายามบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!verifyPin(pin, process.env.ADMIN_EXPORT_PIN_HASH ?? "")) {
    return NextResponse.json({ error: "PIN ไม่ถูกต้อง" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      email: true,
      displayName: true,
      emailVerified: true,
      plan: true,
      createdAt: true,
      termsAcceptedAt: true,
      _count: { select: { links: true, events: true } },
      subscription: { select: { plan: true, status: true, startedAt: true, expiresAt: true } },
    },
  });

  await writeAudit({
    actorEmail: session?.user?.email ?? undefined,
    action: "users.export_full_pii",
    subjectType: "users",
    detail: `Export ข้อมูลส่วนบุคคลเต็มจำนวน ${users.length} ราย (PIN-gated)`,
    result: "success",
  });

  return new NextResponse(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        exportedBy: session?.user?.email ?? "admin",
        count: users.length,
        users: users.map((u) => ({
          ...u,
          emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
          termsAcceptedAt: u.termsAcceptedAt ? u.termsAcceptedAt.toISOString() : null,
          linkCount: u._count.links,
          clickCount: u._count.events,
        })),
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="vibelink-users-full.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
