"use client";

import Link from "next/link";
import { LinkManager, type LinkItem } from "@/components/dashboard/link-manager";
import type { Lang } from "@/lib/i18n";
import type { AnalyticsPayload, CampaignItem, VibeUser } from "./types";
import { OverviewPane } from "./overview-pane";
import { PerformancePane } from "./performance-pane";
import { AudiencePane } from "./audience-pane";
import { VibeTab } from "./vibe-tab";
import { CampaignsTab } from "./campaigns-tab";
import styles from "./tabs.module.css";

export type { AnalyticsPayload, CampaignItem, VibeUser } from "./types";

export type TabId = "links" | "overview" | "result" | "vibepage" | "audience" | "utm";

type Props = {
  activeTab?: TabId;
  initialLinks: LinkItem[];
  plan: string;
  maxActiveLinks: number | null;
  lang: Lang;
  analytics: AnalyticsPayload;
  vibe: VibeUser;
  initialCampaigns: CampaignItem[];
};

export const DASHBOARD_TABS = [
  { id: "overview", href: "/dashboard/overview", icon: "dashboard", th: "ภาพรวม", en: "Overview" },
  { id: "links", href: "/dashboard/links", icon: "link", th: "ลิงก์สั้น", en: "Links" },
  { id: "result", href: "/dashboard/result", icon: "trending_up", th: "ผลงานลิงก์", en: "Result" },
  { id: "vibepage", href: "/dashboard/vibepage", icon: "auto_awesome", th: "Vibe Page", en: "Vibe Page" },
  { id: "audience", href: "/dashboard/audience", icon: "groups", th: "สถิติผู้ชม", en: "Audience" },
  { id: "utm", href: "/dashboard/utm", icon: "campaign", th: "UTM แคมเปญ", en: "Campaigns" },
] as const;

export function DashboardTabs({
  activeTab = "overview",
  initialLinks,
  plan,
  maxActiveLinks,
  lang,
  analytics,
  vibe,
  initialCampaigns,
}: Props) {
  return (
    <>
      <nav className={styles.tabsBar} aria-label="Dashboard sub-navigation">
        {DASHBOARD_TABS.map((t) => {
          const isActive = activeTab === t.id;
          const label = lang === "en" ? t.en : t.th;
          return (
            <Link
              key={t.id}
              href={t.href}
              className={`${styles.tabBtn}${isActive ? ` ${styles.tabActive}` : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="ms">{t.icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {activeTab === "overview" ? <OverviewPane a={analytics} lang={lang} /> : null}

      {activeTab === "links" ? (
        <LinkManager
          initialLinks={initialLinks}
          plan={plan}
          maxActiveLinks={maxActiveLinks}
        />
      ) : null}

      {activeTab === "result" ? <PerformancePane a={analytics} lang={lang} /> : null}

      {activeTab === "vibepage" ? (
        <VibeTab
          vibe={vibe}
          activeLinks={initialLinks.filter((l) => l.status === "ACTIVE").length}
          lang={lang}
        />
      ) : null}

      {activeTab === "audience" ? <AudiencePane a={analytics} lang={lang} /> : null}

      {activeTab === "utm" ? (
        <CampaignsTab initialCampaigns={initialCampaigns} perf={analytics.perf} lang={lang} />
      ) : null}
    </>
  );
}
