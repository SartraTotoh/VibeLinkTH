import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { limitsOf } from "@/lib/plans";
import { getActivePlan } from "@/lib/subscription";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import { isAdmin } from "@/lib/admin";
import type { LinkItem } from "@/components/dashboard/link-manager";
import { DashboardTabs, type AnalyticsPayload, type CampaignItem, type VibeUser } from "@/components/dashboard/tabs/dashboard-tabs";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { NavLangSwitcher } from "@/components/i18n/language";

export const dynamic = "force-dynamic";

const MAX_EVENTS = 20000;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function countBy<T>(rows: T[], pick: (r: T) => string | null) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r) || "unknown";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, clicks]) => ({ name, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

function hostOf(raw: string | null) {
  if (!raw) return "direct";
  try {
    return new URL(raw).hostname.replace(/^www\./, "") || "direct";
  } catch {
    return "direct";
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";

  const plan = await getActivePlan(session.user.id);
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailVerified: true,
      displayName: true,
      vibeSlug: true,
      vibeTitle: true,
      vibeBio: true,
      vibeEmoji: true,
    },
  });
  const limits = limitsOf(plan);
  const since = new Date(Date.now() - limits.analyticsDays * 86400_000);
  const links = await prisma.link.findMany({
    where: { userId: session.user.id, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { events: { where: { type: "CLICK", createdAt: { gte: since } } } },
      },
    },
    take: 200,
  });

  const initialLinks: LinkItem[] = links.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    destinationUrl: l.destinationUrl,
    platform: l.platform,
    status: l.status as "ACTIVE" | "PAUSED",
    clicks: l._count.events,
    shortUrl: `${process.env.SHORT_LINK_URL ?? ""}/${l.slug}`,
    createdAt: l.createdAt.toISOString(),
    expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
  }));

  const [eventsCurrent, eventsPrev, totalAllTime, campaigns] = await Promise.all([
    prisma.linkEvent.findMany({
      where: { userId: session.user.id, type: "CLICK", createdAt: { gte: since } },
      select: {
        linkId: true,
        device: true,
        browser: true,
        os: true,
        country: true,
        referrer: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_EVENTS,
    }),
    prisma.linkEvent.findMany({
      where: {
        userId: session.user.id,
        type: "CLICK",
        createdAt: {
          gte: new Date(since.getTime() - limits.analyticsDays * 86400_000),
          lt: since,
        },
      },
      select: { linkId: true },
      take: MAX_EVENTS,
    }),
    prisma.linkEvent.count({ where: { userId: session.user.id, type: "CLICK" } }),
    prisma.campaign.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        link: { select: { slug: true, title: true } },
        _count: { select: { events: { where: { type: "CLICK" } } } },
      },
    }),
  ]);

  const days = limits.analyticsDays;
  const perDay: { date: string; clicks: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    perDay.push({ date: dayKey(d), clicks: 0 });
  }
  const dayIndex = new Map(perDay.map((p, i) => [p.date, i]));
  for (const e of eventsCurrent) {
    const idx = dayIndex.get(dayKey(e.createdAt));
    if (idx !== undefined) perDay[idx]!.clicks += 1;
  }

  const linkMeta = new Map(links.map((l) => [l.id, l]));

  const curByLink = new Map<string, number>();
  for (const e of eventsCurrent) curByLink.set(e.linkId, (curByLink.get(e.linkId) ?? 0) + 1);
  const prevByLink = new Map<string, number>();
  for (const e of eventsPrev) prevByLink.set(e.linkId, (prevByLink.get(e.linkId) ?? 0) + 1);

  const perf = links.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    platform: l.platform,
    status: l.status as "ACTIVE" | "PAUSED",
    windowClicks: curByLink.get(l.id) ?? 0,
    prevClicks: prevByLink.get(l.id) ?? 0,
  }));

  const topLinks = [...curByLink.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, clicks]) => ({
      id,
      clicks,
      title: linkMeta.get(id)?.title ?? "??",
      slug: linkMeta.get(id)?.slug ?? "??",
    }));

  const recent = eventsCurrent.slice(0, 8).map((e) => ({
    id: e.linkId,
    title: linkMeta.get(e.linkId)?.title ?? "??",
    slug: linkMeta.get(e.linkId)?.slug ?? "??",
    device: e.device,
    country: e.country,
    at: e.createdAt.toISOString(),
  }));

  const analytics: AnalyticsPayload = {
    days,
    totalWindow: eventsCurrent.length,
    prevTotal: eventsPrev.length,
    totalAllTime,
    perDay,
    byDevice: countBy(eventsCurrent, (e) => e.device),
    byBrowser: countBy(eventsCurrent, (e) => e.browser),
    byOS: countBy(eventsCurrent, (e) => e.os),
    byCountry: countBy(eventsCurrent, (e) => e.country),
    topReferrers: countBy(eventsCurrent, (e) => hostOf(e.referrer)).slice(0, 8),
    topLinks,
    recent,
    perf,
  };

  const vibe: VibeUser = {
    displayName: account?.displayName ?? null,
    vibeSlug: account?.vibeSlug ?? null,
    vibeTitle: account?.vibeTitle ?? null,
    vibeBio: account?.vibeBio ?? null,
    vibeEmoji: account?.vibeEmoji ?? null,
  };

  const campaignItems: CampaignItem[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    source: c.source,
    medium: c.medium,
    content: c.content,
    linkId: c.linkId,
    linkSlug: c.link?.slug ?? null,
    linkTitle: c.link?.title ?? null,
    clicks: c._count.events,
    createdAt: c.createdAt.toISOString(),
  }));

  const planName =
    plan === "CREATOR"
      ? "Creator"
      : plan === "CREATOR_PLUS"
        ? "Creator Plus"
        : "Free";

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>
        </Link>
        <div className="dash-actions">
          <span className="nav-user">{session.user.email}</span>
          <NavLangSwitcher />
          {isAdmin(session.user.email) ? (
            <Link href="/ceo" className="mini-btn">
              <span className="ms">terminal</span>
              {t(lang, "nav.dev")}
            </Link>
          ) : null}
          <Link href="/settings" className="mini-btn">
            <span className="ms">settings</span>
            {t(lang, "nav.settings")}
          </Link>
          <Link href="/support" className="mini-btn" title={t(lang, "nav.support")}>
            <span className="ms">help</span>
            {t(lang, "nav.support")}
          </Link>
          <SignOutButton label={lang === "th" ? "ออกจากระบบ" : "Sign out"} />
        </div>
      </nav>

      <div className="dash-head">
        <div>
          <h1>{t(lang, "dash.title")}</h1>
          <p className="greet">{session.user.email}</p>
        </div>
        <span className="plan-badge">{t(lang, "dash.plan")} {planName}</span>
      </div>

      <div className="dash">
        {account && !account.emailVerified ? <VerifyEmailBanner lang={lang} /> : null}
        <UpgradeCard currentPlan={plan} lang={lang} />

        <DashboardTabs
          initialLinks={initialLinks}
          plan={plan}
          maxActiveLinks={limits.maxActiveLinks}
          lang={lang}
          analytics={analytics}
          vibe={vibe}
          initialCampaigns={campaignItems}
        />
      </div>

      <footer className="dash-foot">
        <span>{t(lang, "dash.foot")}</span>
        <span className="secure-note" style={{ marginTop: 0 }}>
          <span className="ms">lock</span>
          {t(lang, "dash.stripeNote")} · <a href="mailto:hello@vibelinkth.com">{t(lang, "dash.contact")}</a>
        </span>
      </footer>
    </main>
  );
}
