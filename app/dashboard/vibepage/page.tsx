import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "หน้ารวมลิงก์ | VibeLinkTH Links", robots: { index: false, follow: false } };

export default function VibePageRoute() {
  return <DashboardPageView activeTab="vibepage" />;
}
