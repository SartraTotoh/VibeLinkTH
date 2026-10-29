import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LiveStudio } from "@/components/live/live-studio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "VibeLinkTH Live สตูดิโอทดลอง",
  description: "เตรียมรายการ ทดลองกล้อง สลับฉาก แสดงสินค้า และบันทึกวิดีโอในเครื่อง",
  alternates: { canonical: "/live" },
  robots: { index: false, follow: false },
};

export default async function LivePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=%2Flive");
  return <LiveStudio ownerId={session.user.id} />;
}
