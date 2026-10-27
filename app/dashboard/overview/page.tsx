import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview | VibeLink Dashboard" };

export default function OverviewPage() {
  return <DashboardPageView activeTab="overview" />;
}
