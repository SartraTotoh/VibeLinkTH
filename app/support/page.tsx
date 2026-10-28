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
  title: "ศูนย์ช่วยเหลือ & AI Smart Assistant — VibeLink",
  description: "ศูนย์กลางบริการช่วยเหลือ สมาชิกปรึกษา AI Assistant ได้ตลอด 24 ชั่วโมง และติดต่อฝ่ายซัพพอร์ต",
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
        <Link href="/" className="brand">
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>
        </Link>
        <div className="dash-actions">
          <span className="nav-user" style={{ fontSize: 15 }}>{session.user.email}</span>
          <NavLangSwitcher />
          <Link href="/dashboard" className="mini-btn">
            <span className="ms">dashboard</span>
            {lang === "th" ? "แดชบอร์ด" : "Dashboard"}
          </Link>
          <Link href="/settings" className="mini-btn">
            <span className="ms">settings</span>
            {lang === "th" ? "ตั้งค่า" : "Settings"}
          </Link>
          {userIsAdmin ? (
            <Link href="/ceo" className="mini-btn">
              <span className="ms">terminal</span>
              Dev
            </Link>
          ) : null}
          <SignOutButton label={lang === "th" ? "ออก" : "Sign out"} />
        </div>
      </nav>

      <div className={styles.supportPageShell}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.kicker}>
            <span className={styles.pulseDot} />
            <span>{lang === "th" ? "HELP CENTER · 24/7 AI SMART ASSISTANT" : "HELP CENTER · 24/7 AI ASSISTANT"}</span>
          </div>
          <h1 className={styles.heroTitle}>
            {lang === "th" ? (
              <>
                ศูนย์ช่วยเหลือ <em>และ AI Smart Assistant</em>
              </>
            ) : (
              <>
                Help Center <em>&amp; AI Smart Assistant</em>
              </>
            )}
          </h1>
          <p className={styles.heroSubtitle}>
            {lang === "th"
              ? "มีคำถามหรือติดปัญหา? ค้นหาคำตอบยอดฮิต หรือคุยกับผู้ช่วย AI อัจฉริยะ ตอบไวใน 0.04 วินาที หรือติดต่อทีมงาน Support โดยตรง"
              : "Have questions or issues? Get instant answers from our AI assistant in 0.04s, or contact human support directly."}
          </p>
        </div>

        {/* 2 Quick Hub Cards matching Landing Page Design */}
        <div className={styles.hubGrid}>
          {/* Card 1: AI Assistant */}
          <div className={styles.hubCard}>
            <span className={styles.hubBadge}>
              <span className="ms" style={{ fontSize: 16 }}>bolt</span>
              {lang === "th" ? "AI POWERED · 24/7" : "AI POWERED · 24/7"}
            </span>
            <div className={styles.hubHeader}>
              <div className={styles.hubIcon}>
                <span className="ms" style={{ fontSize: 26 }}>smart_toy</span>
              </div>
              <h3 className={styles.hubTitle}>
                {lang === "th" ? "ถาม AI ตอบทันที 24 ชม." : "Instant AI Auto-Reply"}
              </h3>
            </div>
            <p className={styles.hubDesc}>
              {lang === "th"
                ? "ติดปัญหาการสร้าง Dynamic QR, ตั้งค่า Bio Link, ปรับแต่งหน้าโปรไฟล์ หรือแพ็กเกจ ทักคุยกับ Smart Assistant ด้านล่างได้ทันที"
                : "Ask anything about Dynamic QR codes, Bio Links, theme customization, or pricing plans. Instant answers 24/7."}
            </p>
            <div className={styles.promptChips}>
              <span className={styles.promptChip}>
                <span className="ms" style={{ fontSize: 15, color: "var(--primary, #b9ff2c)" }}>bolt</span>
                Dynamic QR
              </span>
              <span className={styles.promptChip}>
                <span className="ms" style={{ fontSize: 15, color: "var(--primary, #b9ff2c)" }}>link</span>
                Bio Link
              </span>
              <span className={styles.promptChip}>
                <span className="ms" style={{ fontSize: 15, color: "var(--primary, #b9ff2c)" }}>calendar_month</span>
                VibeBook
              </span>
              <span className={styles.promptChip}>
                <span className="ms" style={{ fontSize: 15, color: "var(--primary, #b9ff2c)" }}>verified</span>
                Creator Plan
              </span>
            </div>
          </div>

          {/* Card 2: Official Human Support Desk */}
          <div className={`${styles.hubCard} ${styles.hubCardHuman}`}>
            <span className={styles.hubBadge}>
              <span className="ms" style={{ fontSize: 16 }}>support_agent</span>
              {lang === "th" ? "OFFICIAL SUPPORT DESK" : "OFFICIAL SUPPORT DESK"}
            </span>
            <div className={styles.hubHeader}>
              <div className={styles.hubIcon}>
                <span className="ms" style={{ fontSize: 26 }}>headset_mic</span>
              </div>
              <h3 className={styles.hubTitle}>
                {lang === "th" ? "ฝ่ายบริการทีมงาน VibeLink" : "VibeLink Support Team"}
              </h3>
            </div>
            <p className={styles.hubDesc}>
              {lang === "th"
                ? "สำหรับข้อสงสัยเชิงธุรกิจ ปัญหาทางเทคนิคเฉพาะทาง หรือต้องการความช่วยเหลือจากทีมงานโดยตรง พร้อมเปิด Ticket ดูแลอย่างรวดเร็ว"
                : "For enterprise inquiries, technical support, or personalized assistance. Our team is ready to help."}
            </p>
            <a href="mailto:help@vibelinkth.com" className={styles.contactEmailLink}>
              <span className="ms" style={{ fontSize: 18 }}>mail</span>
              <span>help@vibelinkth.com ↗</span>
            </a>
          </div>
        </div>

        {/* Support Chat / Admin Wrapper */}
        <AdminSupportWrapper lang={lang} isAdminUser={userIsAdmin} />
      </div>

      <footer className="dash-foot">
        <span>{lang === "th" ? "© 2026 VibeLink — ทีมช่วยเหลือ & ฝ่ายสนับสนุน" : "© 2026 VibeLink — Help & Support"}</span>
        <a href="mailto:help@vibelinkth.com" style={{ color: "#94a3b8", textDecoration: "none" }}>help@vibelinkth.com</a>
      </footer>
    </main>
  );
}
