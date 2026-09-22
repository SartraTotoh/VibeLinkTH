import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/url";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const limited = rateLimit(`resend-verify:${session.user.id}`, 3, 15 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "ขอบ่อยเกินไป กรุณารอ 15 นาที" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, displayName: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const token = await issueEmailToken(user.id, "VERIFY_EMAIL");
  const sent = await sendVerificationEmail(
    user.email,
    user.displayName,
    `${appUrl()}/api/auth/verify-email?token=${token}`,
  );

  return NextResponse.json({ ok: true, sent });
}
