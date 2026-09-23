export type AnalyticsPayload = {
  days: number;
  totalWindow: number;
  prevTotal: number;
  totalAllTime: number;
  perDay: { date: string; clicks: number }[];
  byDevice: { name: string; clicks: number }[];
  byBrowser: { name: string; clicks: number }[];
  byOS: { name: string; clicks: number }[];
  byCountry: { name: string; clicks: number }[];
  topReferrers: { name: string; clicks: number }[];
  topLinks: { id: string; title: string; slug: string; clicks: number }[];
  recent: {
    id: string;
    title: string;
    slug: string;
    device: string | null;
    country: string | null;
    at: string;
  }[];
  perf: {
    id: string;
    title: string;
    slug: string;
    platform: string | null;
    status: "ACTIVE" | "PAUSED";
    windowClicks: number;
    prevClicks: number;
  }[];
};

export type VibeUser = {
  displayName: string | null;
  vibeSlug: string | null;
  vibeTitle: string | null;
  vibeBio: string | null;
  vibeEmoji: string | null;
};

export type CampaignItem = {
  id: string;
  name: string;
  source: string;
  medium: string;
  content: string | null;
  linkId: string | null;
  linkSlug: string | null;
  linkTitle: string | null;
  clicks: number;
  createdAt: string;
};