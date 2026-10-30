import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActivePlan } from "@/lib/subscription";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { SettingsActions } from "@/components/dashboard/settings-actions";
import { NavLangSwitcher } from "@/components/i18n/language";
import { SocialHubSettings } from "@/components/dashboard/social-hub-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings | VibeLinkTH" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";

  const [user, subscription, plan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        displayName: true,
        emailVerified: true,
        createdAt: true,
        termsAcceptedAt: true,
        vibeSlug: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      select: { plan: true, status: true, customerRef: true, expiresAt: true },
    }),
    getActivePlan(session.user.id),
  ]);

  const dateFmt = (d: Date) =>
    d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const planName =
    plan === "CREATOR"
      ? "Creator"
      : plan === "CREATOR_PLUS"
        ? "Creator Plus"
        : "Free";

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand" prefetch={false}>
          <img src="/logo.png" alt="VibeLink Logo" />
          Vibe<span>Link</span>TH
        </Link>
        <div className="dash-actions">
          <span className="nav-user" style={{ color: "var(--muted)", fontWeight: 700, fontSize: 15 }}>
            {session.user.email}
          </span>
          <NavLangSwitcher />
          <Link href="/dashboard" className="mini-btn" prefetch={false}>
            <span className="ms">dashboard</span>
            {lang === "th" ? "แดชบอร์ด" : "Dashboard"}
          </Link>
          <Link href="/support" className="mini-btn" prefetch={false}>
            <span className="ms">help</span>
            {lang === "th" ? "ช่วยเหลือ" : "Support"}
          </Link>
          <SignOutButton label={lang === "th" ? "ออก" : "Sign out"} />
        </div>
      </nav>

      <div className="dash-head">
        <div>
          <h1>{t(lang, "set.title")}</h1>
          <p className="greet">{t(lang, "set.sub")}</p>
        </div>
        <span className="plan-badge">
          <span className="ms">workspace_premium</span>
          {t(lang, "dash.plan")} {planName}
        </span>
      </div>

      <div className="dash">
        {user && !user.emailVerified ? <VerifyEmailBanner lang={lang} /> : null}

        {/* Account Details */}
        <section className="panel">
          <div className="panel-head">
            <span className="ms">person</span>
            <h2>{t(lang, "set.account")}</h2>
          </div>
          <p className="panel-sub">{t(lang, "set.accountSub")}</p>
          <div className="settings-row">
            <div>
              <b>{t(lang, "set.email")}</b>
              <small>
                {user?.email} {user?.emailVerified ? `· ${t(lang, "set.verified")}` : `· ${t(lang, "set.unverified")}`}
              </small>
            </div>
          </div>
          <div className="settings-row" style={{ marginTop: 8 }}>
            <div>
              <b>{t(lang, "set.displayName")}</b>
              <small>{user?.displayName || t(lang, "set.noName")}</small>
            </div>
          </div>
          <div className="settings-row" style={{ marginTop: 8 }}>
            <div>
              <b>หน้ารวมลิงก์ · Slug (URL ประจำตัว)</b>
              <small>
                {user?.vibeSlug ? `vibelinkth.com/vibe/${user.vibeSlug}` : "ยังไม่ได้ตั้งค่า slug"}
              </small>
            </div>
            <Link href="/dashboard/vibepage" className="mini-btn" prefetch={false}>
              <span className="ms">edit</span>
              แก้ไขหน้ารวมลิงก์
            </Link>
          </div>
          <div className="settings-row" style={{ marginTop: 8 }}>
            <div>
              <b>{t(lang, "set.plan")}</b>
              <small>
                {planName}
                {subscription?.expiresAt ? ` · ${t(lang, "set.expires")} ${dateFmt(subscription.expiresAt)}` : ""}
              </small>
            </div>
          </div>
          <p className="form-note">
            {t(lang, "set.changeInfo")} <a href="mailto:help@vibelinkth.com" style={{ color: "var(--primary-text)", fontWeight: 700 }}>help@vibelinkth.com</a>
          </p>
        </section>

        {/* Connected Social Accounts & Phone Contact Hub */}
        <SocialHubSettings lang={lang} />

        {/* Privacy & Account Actions */}
        <section className="panel">
          <div className="panel-head">
            <span className="ms">shield</span>
            <h2>{t(lang, "set.privacy")}</h2>
          </div>
          <p className="panel-sub">{t(lang, "set.privacySub")}</p>
          <SettingsActions hasSubscription={Boolean(subscription?.customerRef)} />
        </section>

        {/* Legal Documents */}
        <section className="panel">
          <div className="panel-head">
            <span className="ms">description</span>
            <h2>{t(lang, "set.docs")}</h2>
          </div>
          <p className="panel-sub">
            <Link href="/terms" prefetch={false} style={{ color: "var(--primary-text)", fontWeight: 700 }}>{t(lang, "auth.terms")}</Link> ·{" "}
            <Link href="/privacy" prefetch={false} style={{ color: "var(--primary-text)", fontWeight: 700 }}>{t(lang, "auth.privacy")}</Link> ·{" "}
            <Link href="/cookies" prefetch={false} style={{ color: "var(--primary-text)", fontWeight: 700 }}>Cookies</Link>
          </p>
        </section>
      </div>

      <footer className="dash-foot">
        <span>{t(lang, "dash.foot")}</span>
        <span className="secure-note" style={{ marginTop: 0 }}>
          <span className="ms">lock</span>
          {t(lang, "dash.stripeNote")}
        </span>
      </footer>
    </main>
  );
}
