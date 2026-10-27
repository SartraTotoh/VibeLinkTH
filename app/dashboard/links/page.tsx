import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Links | VibeLink Dashboard" };

export default function LinksPage() {
  return <DashboardPageView activeTab="links" />;
}
