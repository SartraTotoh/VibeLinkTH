import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { NavLangSwitcher } from "@/components/i18n/language";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { AdminSupportWrapper } from "@/components/support/admin-support-wrapper";
import styles from "./support.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ศูนย์ช่วยเหลือ — VibeLink",
  description: "ปรึกษาผู้ช่วย AI อัจฉริยะ ตอบไว 24 ชั่วโมง และติดต่อฝ่ายสนับสนุน",
  robots: { index: false, follow: false },
};

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";
  const userIsAdmin = isAdmin(session.user.email);

  return (
    <main className="shell">
      {/* Top Application Navigation */}
      <nav className="nav">
        <Link href="/" className="brand" prefetch={false}>
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>
        </Link>
        <div className="dash-actions">
          <span className="nav-user" style={{ fontSize: 15 }}>{session.user.email}</span>
          <NavLangSwitcher />
          <Link href="/dashboard" className="mini-btn" prefetch={false}>
            <span className="ms">dashboard</span>
            {lang === "th" ? "แดชบอร์ด" : "Dashboard"}
          </Link>
          <Link href="/settings" className="mini-btn" prefetch={false}>
            <span className="ms">settings</span>
            {lang === "th" ? "ตั้งค่า" : "Settings"}
          </Link>
          {userIsAdmin ? (
            <Link href="/ceo" className="mini-btn" prefetch={false}>
              <span className="ms">terminal</span>
              Dev
            </Link>
          ) : null}
          <SignOutButton label={lang === "th" ? "ออก" : "Sign out"} />
        </div>
      </nav>

      <div className={styles.supportPageShell}>
        {/* Compact, Sleek Cyber Hero Header */}
        <div className={styles.hero}>
          <div className={styles.kicker}>
            <span className={styles.pulseDot} />
            <span>AI SMART ASSISTANT · 24/7 ONLINE</span>
          </div>
          <h1 className={styles.heroTitle}>
            {lang === "th" ? (
              <>
                ศูนย์ช่วยเหลือ <em>และ AI Assistant</em>
              </>
            ) : (
              <>
                Help Center <em>&amp; AI Assistant</em>
              </>
            )}
          </h1>
          <p className={styles.heroSubtitle}>
            {lang === "th"
              ? "ถามตอบข้อสงสัยได้ทันที AI ตอบอัตโนมัติใน 0.04 วินาที หรือติดต่อทีมงาน Support ได้ตลอดเวลา"
              : "Instant answers from our 24/7 AI assistant in 0.04s, or chat directly with our support team."}
          </p>
        </div>

        {/* Support Chat Canvas (Hero Component) */}
        <AdminSupportWrapper lang={lang} isAdminUser={userIsAdmin} />

        {/* Direct Email Support Card */}
        <div className={styles.directContactBar}>
          <div className={styles.directContactLeft}>
            <div className={styles.directIcon}>
              <span className="ms" style={{ fontSize: 24 }}>headset_mic</span>
            </div>
            <div>
              <b style={{ fontSize: 16, color: "#ffffff", display: "block" }}>
                {lang === "th" ? "ต้องการติดต่อทีมงานฝ่ายสนับสนุนโดยตรง?" : "Need direct personalized assistance?"}
              </b>
              <span style={{ fontSize: 15, color: "#94a3b8" }}>
                {lang === "th" ? "สำหรับคำถามเฉพาะทางหรือธุรกิจ อีเมลหาเราได้ที่ help@vibelinkth.com" : "Email us anytime at help@vibelinkth.com"}
              </span>
            </div>
          </div>
          <a href="mailto:help@vibelinkth.com" className={styles.directEmailBtn}>
            <span className="ms" style={{ fontSize: 18 }}>mail</span>
            <span>{lang === "th" ? "ส่งอีเมล ↗" : "Email ↗"}</span>
          </a>
        </div>
      </div>

      <footer className="dash-foot">
        <span>{lang === "th" ? "© 2026 VibeLink — ศูนย์ช่วยเหลือ" : "© 2026 VibeLink — Help Center"}</span>
        <a href="mailto:help@vibelinkth.com" style={{ color: "#94a3b8", textDecoration: "none" }}>help@vibelinkth.com</a>
      </footer>
    </main>
  );
}
