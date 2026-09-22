import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createPortalSession, getStripeCustomerId } from "@/lib/billing";
import { appUrl } from "@/lib/url";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const customer = await getStripeCustomerId(session.user.id);
  if (!customer) {
    return NextResponse.json(
      { error: "ยังไม่มีการสมัครสมาชิกที่จัดการได้" },
      { status: 400 },
    );
  }

  try {
    const url = await createPortalSession(customer, `${appUrl()}/settings`);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing-portal] failed", String(err));
    return NextResponse.json(
      { error: "เปิดหน้าจัดการการชำระเงินไม่สำเร็จ ลองอีกครั้ง" },
      { status: 500 },
    );
  }
}
