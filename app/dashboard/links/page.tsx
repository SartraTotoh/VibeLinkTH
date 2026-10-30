import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "VibeLinkTH Links — จัดการลิงก์และดูผล" }, robots: { index: false, follow: false } };

export default function LinksPage() {
  return <DashboardPageView activeTab="links" />;
}
