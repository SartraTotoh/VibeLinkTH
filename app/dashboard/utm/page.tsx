import { DashboardPageView } from "@/components/dashboard/dashboard-page-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "UTM Campaigns | VibeLink Dashboard" };

export default function UtmPage() {
  return <DashboardPageView activeTab="utm" />;
}
