import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeEmailToken } from "@/lib/email-tokens";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  const limited = rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "ขอบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ลิงก์ไม่ถูกต้อง หรือรหัสผ่านสั้นกว่า 8 ตัว" },
      { status: 400 },
    );
  }

  const userId = await consumeEmailToken(parsed.data.token, "RESET_PASSWORD");
  if (!userId) {
    return NextResponse.json(
      { error: "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
