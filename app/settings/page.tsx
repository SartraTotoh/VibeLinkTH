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

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";

  const [user, subscription, plan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, displayName: true, emailVerified: true, createdAt: true, termsAcceptedAt: true },
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

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>
        </Link>
        <div className="dash-actions">
          <NavLangSwitcher />
          <Link href="/dashboard" className="mini-btn">
            <span className="ms">link</span>
            {t(lang, "nav.links")}
          </Link>
          <SignOutButton label={lang === "th" ? "ออกจากระบบ" : "Sign out"} />
        </div>
      </nav>

      <div className="dash-head">
        <div>
          <h1>{t(lang, "set.title")}</h1>
          <p className="greet">{t(lang, "set.sub")}</p>
        </div>
        <span className="plan-badge">{t(lang, "dash.plan")} {plan}</span>
      </div>

      <div className="dash">
        {user && !user.emailVerified ? <VerifyEmailBanner lang={lang} /> : null}

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
          <div className="settings-row">
            <div>
              <b>{t(lang, "set.displayName")}</b>
              <small>{user?.displayName || t(lang, "set.noName")}</small>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <b>{t(lang, "set.plan")}</b>
              <small>
                {plan}
                {subscription?.expiresAt ? ` · ${t(lang, "set.expires")} ${dateFmt(subscription.expiresAt)}` : ""}
              </small>
            </div>
          </div>
          <p className="form-note">
            {t(lang, "set.changeInfo")} <a href="mailto:hello@vibelinkth.com">hello@vibelinkth.com</a>
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <span className="ms">shield</span>
            <h2>{t(lang, "set.privacy")}</h2>
          </div>
          <p className="panel-sub">{t(lang, "set.privacySub")}</p>
          <SettingsActions hasSubscription={Boolean(subscription?.customerRef)} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <span className="ms">description</span>
            <h2>{t(lang, "set.docs")}</h2>
          </div>
          <p className="panel-sub">
            <Link href="/terms">{t(lang, "auth.terms")}</Link> · <Link href="/privacy">{t(lang, "auth.privacy")}</Link> ·{" "}
            <Link href="/cookies">Cookies</Link>
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
