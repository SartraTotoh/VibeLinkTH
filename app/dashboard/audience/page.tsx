import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audience Demographics | VibeLink Dashboard" };

export default function AudiencePage() {
  return <DashboardPageView activeTab="audience" />;
}
