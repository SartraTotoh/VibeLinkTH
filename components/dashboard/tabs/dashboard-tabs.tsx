"use client";

import { useState } from "react";
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

type Props = {
  initialLinks: LinkItem[];
  plan: string;
  maxActiveLinks: number | null;
  lang: Lang;
  analytics: AnalyticsPayload;
  vibe: VibeUser;
  initialCampaigns: CampaignItem[];
};

const TABS = [
  { id: "links", icon: "link", th: "ลิงก์", en: "Links" },
  { id: "overview", icon: "dashboard", th: "ภาพรวม", en: "Overview" },
  { id: "performance", icon: "trending_up", th: "ผลงานลิงก์", en: "Link Performance" },
  { id: "vibe", icon: "auto_awesome", th: "Vibe Page", en: "Vibe Page" },
  { id: "audience", icon: "groups", th: "ผู้ชม", en: "Audience" },
  { id: "campaigns", icon: "campaign", th: "แคมเปญ", en: "Campaigns" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DashboardTabs({
  initialLinks,
  plan,
  maxActiveLinks,
  lang,
  analytics,
  vibe,
  initialCampaigns,
}: Props) {
  const [tab, setTab] = useState<TabId>("links");

  return (
    <>
      <div className={styles.tabsBar}>
        {TABS.map((tid) => {
          const active = tab === tid.id;
          const label = lang === "en" ? tid.en : tid.th;
          return (
            <button
              key={tid.id}
              type="button"
              className={`${styles.tabBtn}${active ? ` ${styles.tabActive}` : ""}`}
              onClick={() => setTab(tid.id)}
              aria-pressed={active}
            >
              <span className="ms">{tid.icon}</span>
              {label}
            </button>
          );
        })}
      </div>

      {tab === "links" ? (
        <LinkManager
          initialLinks={initialLinks}
          plan={plan}
          maxActiveLinks={maxActiveLinks}
        />
      ) : null}

      {tab === "overview" ? <OverviewPane a={analytics} lang={lang} /> : null}

      {tab === "performance" ? <PerformancePane a={analytics} lang={lang} /> : null}

      {tab === "vibe" ? (
        <VibeTab
          vibe={vibe}
          activeLinks={initialLinks.filter((l) => l.status === "ACTIVE").length}
          lang={lang}
        />
      ) : null}

      {tab === "audience" ? <AudiencePane a={analytics} lang={lang} /> : null}

      {tab === "campaigns" ? (
        <CampaignsTab initialCampaigns={initialCampaigns} perf={analytics.perf} lang={lang} />
      ) : null}
    </>
  );
}