import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, getStripeCustomerId } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ password: z.string().min(1).max(100) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const limited = rateLimit(`delete-account:${session.user.id}`, 5, 60 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "ทำรายการบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "กรุณากรอกรหัสผ่านเพื่อยืนยัน" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const customer = await getStripeCustomerId(session.user.id);
    if (customer) {
      const subs = await stripe.subscriptions.list({ customer, status: "active" });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  } catch (err) {
    console.error("[account-delete] stripe cancel failed", String(err));
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ ok: true });
}
