import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { appUrl } from "@/lib/url";

const schema = z.object({ email: z.string().email().max(200) });

export async function POST(req: Request) {
  const ipLimit = rateLimit(`req-verify:${clientIp(req)}`, 5, 15 * 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "ขอบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const emailLimit = rateLimit(`req-verify-email:${email}`, 3, 15 * 60_000);
  if (emailLimit.ok) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, emailVerified: true },
    });
    if (user && !user.emailVerified) {
      try {
        const token = await issueEmailToken(user.id, "VERIFY_EMAIL");
        await sendVerificationEmail(
          user.email,
          user.displayName,
          `${appUrl()}/api/auth/verify-email?token=${token}`,
        );
      } catch (err) {
        console.error("[request-verification] failed", String(err));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
