import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createCheckoutSession } from "@/lib/billing";

const bodySchema = z.object({ plan: z.enum(["CREATOR"]) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "แผนนี้ยังเปิดขายไม่ครบ — ใช้เฉพาะแพ็กเกจ Creator" },
      { status: 400 },
    );
  }

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  try {
    const url = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email ?? "",
      plan: parsed.data.plan,
      baseUrl,
    });
    return NextResponse.json({ url });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : "");
    if (msg.includes("PLAN_NOT_AVAILABLE")) {
      return NextResponse.json(
        { error: "ยังไม่ได้ผูกราคาแผนนี้ใน Stripe (ตั้ง STRIPE_PRICE_CREATOR ก่อน)" },
        { status: 501 },
      );
    }
    return NextResponse.json(
      { error: "สร้างลิงก์ชำระเงินไม่สำเร็จ ลองอีกครั้ง" },
      { status: 500 },
    );
  }
}