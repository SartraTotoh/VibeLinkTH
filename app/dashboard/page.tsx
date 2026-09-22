import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { limitsOf } from "@/lib/plans";
import { getActivePlan } from "@/lib/subscription";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import { isAdmin } from "@/lib/admin";
import { LinkManager, type LinkItem } from "@/components/dashboard/link-manager";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { NavLangSwitcher } from "@/components/i18n/language";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";

  const plan = await getActivePlan(session.user.id);
  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
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
            <Link href="/dev" className="mini-btn">
              <span className="ms">terminal</span>
              {t(lang, "nav.dev")}
            </Link>
          ) : null}
          <Link href="/settings" className="mini-btn">
            <span className="ms">settings</span>
            {t(lang, "nav.settings")}
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

        <LinkManager
          initialLinks={initialLinks}
          plan={plan}
          maxActiveLinks={limits.maxActiveLinks}
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
