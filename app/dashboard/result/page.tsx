import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Result Performance | VibeLink Dashboard" };

export default function ResultPage() {
  return <DashboardPageView activeTab="result" />;
}
