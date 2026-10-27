import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vibe Page Editor | VibeLink Dashboard" };

export default function VibePageRoute() {
  return <DashboardPageView activeTab="vibepage" />;
}
