import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { appUrl } from "@/lib/url";

const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  displayName: z.string().trim().min(1).max(60).optional(),
  acceptedTerms: z.literal(true),
});

export async function POST(req: Request) {
  const limited = rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "พยายามสมัครบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const termsMissing = !parsed.error.issues.every((i) => i.path[0] !== "acceptedTerms");
    return NextResponse.json(
      {
        error: termsMissing
          ? "กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัคร"
          : "อีเมลไม่ถูกต้อง หรือรหัสผ่านสั้นกว่า 8 ตัว",
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้สมัครแล้ว" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: parsed.data.displayName,
      termsAcceptedAt: new Date(),
    },
    select: { id: true, email: true, displayName: true },
  });

  let verificationSent = false;
  try {
    const token = await issueEmailToken(user.id, "VERIFY_EMAIL");
    verificationSent = await sendVerificationEmail(
      user.email,
      user.displayName,
      `${appUrl()}/api/auth/verify-email?token=${token}`,
    );
  } catch (err) {
    console.error("[register] verification email failed", String(err));
  }

  return NextResponse.json(
    { ok: true, verificationSent, user: { id: user.id, email: user.email } },
    { status: 201 },
  );
}
