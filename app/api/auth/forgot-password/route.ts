import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { appUrl } from "@/lib/url";

const schema = z.object({ email: z.string().email().max(200) });

export async function POST(req: Request) {
  const limited = rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "ขอบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true, passwordHash: true },
  });

  if (user?.passwordHash) {
    try {
      const token = await issueEmailToken(user.id, "RESET_PASSWORD");
      await sendPasswordResetEmail(
        user.email,
        user.displayName,
        `${appUrl()}/reset-password?token=${token}`,
      );
    } catch (err) {
      console.error("[forgot-password] failed", String(err));
    }
  }

  return NextResponse.json({ ok: true });
}
