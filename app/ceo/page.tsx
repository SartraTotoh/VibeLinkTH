import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getResendDomainStatus } from "@/lib/resend-admin";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { DevNav } from "@/components/dev/dev-nav";
import { ZoneSection } from "@/components/dev/zone";
import { HealthModule } from "@/components/dev/health";
import { ResendModule } from "@/components/dev/resend";
import { ExceptionsModule, type DevException } from "@/components/dev/exceptions";
import { OverviewModule } from "@/components/dev/overview";
import { UsersCrm } from "@/components/dev/users-crm";
import { RevenueModule } from "@/components/dev/revenue";
import { SupportModule } from "@/components/dev/support";
import { SupportChatModule } from "@/components/dev/support-chat";
import { RulesManagerModule } from "@/components/dev/rules-manager";
import { ConfigModule } from "@/components/dev/config";
import { SecurityFeedModule } from "@/components/dev/security-feed";
import { SecretVault } from "@/components/dev/secret-vault";
import { DeployModule } from "@/components/dev/deploy";
import { ApprovalModule } from "@/components/dev/approval";
import { ChecklistModule } from "@/components/dev/checklist";
import { GovernanceModule } from "@/components/dev/governance";
import { RoadmapModule } from "@/components/dev/roadmap";
import { MilestonesModule } from "@/components/dev/milestones";
import { LinksModule } from "@/components/dev/links";
import { DesignModule } from "@/components/dev/design";
import { IncidentReportModule } from "@/components/dev/incident-report";
import { NotesModule } from "@/components/dev/notes";
import styles from "./dev-console.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Dev Console — VibeLink",
  robots: { index: false, follow: false },
};

const SECRET_DEFS = [
  { key: "DATABASE_URL", label: "Neon connection (pooled)" },
  { key: "DATABASE_URL_UNPOOLED", label: "Neon direct (migrations)" },
  { key: "AUTH_SECRET", label: "Auth.js session secret" },
  { key: "STRIPE_SECRET_KEY", label: "Stripe API key" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook signing" },
  { key: "STRIPE_PRICE_CREATOR", label: "Stripe price — Creator" },
  { key: "STRIPE_PRICE_CREATOR_PLUS", label: "Stripe price — Creator Plus" },
  { key: "RESEND_API_KEY", label: "Resend (อีเมล)" },
  { key: "STRIPE_2FA_BACKUP", label: "Stripe 2FA backup code (ใช้ครั้งเดียว — ใช้แล้วต้องอัปเดต)" },
];

const DEPLOY_STEPS: { title: string; when: string; cmd: string | null }[] = [
  {
    title: "แก้ schema ฐานข้อมูล",
    when: "เมื่อแก้ schema.prisma — ต้อง generate ก่อน deploy เสมอ",
    cmd: "npx prisma db push && npx prisma generate",
  },
  {
    title: "Deploy ขึ้น production",
    when: "build → patch Prisma wasm → deploy ในคำสั่งเดียว",
    cmd: "npm run cf:deploy",
  },
  {
    title: "ตั้ง secret ใหม่",
    when: "หลังตั้งต้อง deploy ใหม่อีกรอบ ค่าถึงมีผล",
    cmd: "npx wrangler secret put <NAME>",
  },
  {
    title: "ดู log",
    when: "Workers → Observability (wrangler tail ใช้ไม่ได้บน Windows)",
    cmd: null,
  },
];

const CHECKLIST: [string, string][] = [
  ["ยืนยันโดเมนอีเมลใน Resend", "SPF / DKIM / DMARC ที่ Cloudflare DNS แล้วกด Verify — ดูสถานะสดในโมดูล Resend"],
  ["สลับ Stripe เป็น Live", "สร้าง product/price จริง แล้วตั้ง secret STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_CREATOR"],
  ["เพิ่ม Webhook ปลายทาง", "https://app.vibelinkth.com/api/billing/webhook (checkout.session.completed, customer.subscription.updated/deleted)"],
  ["เปิด Billing Portal ใน Stripe", "Settings → Billing → Customer portal"],
  ["WAF Rate Limiting", "Cloudflare → Security → WAF → Rate limiting rules สำหรับ /api/auth/* และ /go/*"],
  ["เปิด Backup/PITR ของ Neon", "Neon Console → Project → Settings → Backups"],
  ["(ทางเลือก) Sentry", "ส่ง DSN มาเพื่อเชื่อมการแจ้งเตือน error"],
];

const TONE_ORDER: Record<string, number> = { bad: 0, warn: 1, info: 2 };

export default async function DevPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) notFound();

  const [userCount, linkCount, eventCount, activeSubs, planGroups, resend, recentSec, openSupportTickets] =
    await Promise.all([
      prisma.user.count(),
      prisma.link.count(),
      prisma.linkEvent.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
      getResendDomainStatus(),
      prisma.auditLog.count({
        where: {
          subjectType: "SECURITY",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.supportTicket.count({
        where: { status: "OPEN", needsAdmin: true },
      }),
    ]);

  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = sk.startsWith("sk_live")
    ? "LIVE"
    : sk.startsWith("sk_test")
      ? "TEST"
      : "—";

  const vaultItems = SECRET_DEFS.map((s) => ({
    ...s,
    value: process.env[s.key] ?? "",
  }));
  const vaultReady = vaultItems.filter((v) => v.value).length;
  const vaultMissing = vaultItems.length - vaultReady;

  const records = resend.records ?? [];
  const verifiedCount = records.filter((r) => r.status === "verified").length;
  const allVerified = records.length > 0 && verifiedCount === records.length;

  const fetchedAt = new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const exceptions: DevException[] = [];

  if (recentSec > 0) {
    exceptions.push({
      key: "security-sentinel",
      tone: "warn",
      icon: "shield",
      title: `มีเหตุการณ์ต้องสงสัย ${recentSec} ครั้งใน 24 ชม.`,
      detail: "มีผู้ถูกบล็อกที่เส้นทางไฟล์ลับ/คอนโซล — ดู Security Sentinel เพื่อหาต้นทาง",
      target: "#mod-security-sentinel",
    });
  }

  if (openSupportTickets > 0) {
    exceptions.push({
      key: "support-inbox",
      tone: "warn",
      icon: "chat",
      title: `แชทช่วยเหลือรอตอบ ${openSupportTickets} เธรด`,
      detail: "สมาชิกส่งคำถามที่ auto-reply ตอบไม่ได้แล้ว — ไปตอบที่ห้องแชท",
      target: "#mod-support-chat",
    });
  }

  if (stripeMode === "—") {
    exceptions.push({
      key: "stripe-unset",
      tone: "bad",
      icon: "credit_card_off",
      title: "Stripe ยังไม่ได้ตั้งค่า",
      detail: "ตั้ง STRIPE_SECRET_KEY แล้ว deploy ใหม่ก่อนเปิดรับเงินจริง",
      target: "#mod-config",
    });
  } else if (stripeMode === "TEST") {
    exceptions.push({
      key: "stripe-test",
      tone: "warn",
      icon: "science",
      title: "Stripe อยู่ในโหมดทดสอบ (TEST)",
      detail: "ยังไม่รับเงินจริง — เปลี่ยนเป็น live ก่อนเปิดตัวจริง (ดูเช็กลิสต์เปิดตัว)",
      action: { label: "Stripe dashboard", href: "https://dashboard.stripe.com/" },
      target: "#mod-checklist",
    });
  }

  if (!resend.configured) {
    exceptions.push({
      key: "resend-unset",
      tone: "bad",
      icon: "mark_email_unread",
      title: "ระบบอีเมลยังปิดอยู่",
      detail: "ตั้ง RESEND_API_KEY เพื่อให้ส่งอีเมลยืนยัน/รีเซ็ตรหัสได้",
    });
  } else if (resend.error) {
    exceptions.push({
      key: "resend-error",
      tone: "bad",
      icon: "sync_problem",
      title: "อีเมลมีปัญหา",
      detail: resend.error,
    });
  } else if (!resend.sendOnly && records.length > 0 && !allVerified) {
    exceptions.push({
      key: "resend-dns",
      tone: "warn",
      icon: "dns",
      title: "DNS ของอีเมลยังยืนยันไม่ครบ",
      detail: `ผ่านแล้ว ${verifiedCount}/${records.length} records — เช็ค Cloudflare DNS`,
      action: { label: "Resend Domains", href: "https://resend.com/domains" },
    });
  }

  if (vaultMissing > 0) {
    exceptions.push({
      key: "vault-missing",
      tone: "warn",
      icon: "key_off",
      title: `ค่าลับขาด ${vaultMissing}/${vaultItems.length}`,
      detail: "ตั้งค่าให้ครบใน Worker secrets ก่อนทิ้งภายหลัง",
      target: "#mod-vault",
    });
  }

  if (userCount === 0) {
    exceptions.push({
      key: "no-users",
      tone: "info",
      icon: "person_off",
      title: "ยังไม่มีผู้ใช้ในระบบ",
      detail: "ลองสมัครผ่าน landing เพื่อทดสอบโฟลว์จริง",
    });
  } else if (activeSubs === 0) {
    exceptions.push({
      key: "no-revenue",
      tone: "info",
      icon: "payments",
      title: "ยังไม่มีลูกค้าจ่ายเงิน",
      detail: "money path ผ่านการทดสอบ ฿0 แล้ว — จ่ายจริงครั้งแรกค้างรอเปิด Stripe Live",
    });
  }

  exceptions.sort((a, b) => (TONE_ORDER[a.tone] ?? 9) - (TONE_ORDER[b.tone] ?? 9));

  const config: [string, string][] = [
    ["APP_URL", process.env.APP_URL ?? "—"],
    ["SHORT_LINK_URL", process.env.SHORT_LINK_URL ?? "—"],
    ["EMAIL_FROM", process.env.EMAIL_FROM ?? "—"],
    ["REQUIRE_EMAIL_VERIFICATION", process.env.REQUIRE_EMAIL_VERIFICATION ?? "false"],
    ["COMPANY_CONTACT_EMAIL", process.env.COMPANY_CONTACT_EMAIL ?? "—"],
  ];

  return (
    <main className={styles.page}>
      <div className={styles.aurora} aria-hidden />
      <div className={styles.grid} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      <div className={styles.inner}>
        <nav className={styles.topnav}>
          <Link href="/" className={styles.brand}>
            <img src="/logo.png" alt="" />
            Vibe<span>Link</span>
          </Link>
          <div className={styles.navActions}>
            <Link href="/dashboard" className={styles.pill}>
              <span className="ms" style={{ fontSize: 15 }}>link</span> หน้าลิงก์
            </Link>
            <Link href="/settings" className={styles.pill}>
              <span className="ms" style={{ fontSize: 15 }}>settings</span> ตั้งค่า
            </Link>
            <SignOutButton />
          </div>
        </nav>

        <header className={`${styles.hero} ${styles.rise}`}>
          <span className={styles.kicker}>
            <span className="ms">terminal</span> Mission Control · admin only
          </span>
          <h1 className={styles.title}>
            Mission <span>Control</span>
          </h1>
          <p className={styles.sub}>
            จัดการสถานะและตัดสินใจได้เร็วที่สุด — เข้าถึงเฉพาะ {session?.user?.email} ·
            ค่าลับจริงไม่ถูกบันทึกใน log
          </p>
          <div className={styles.meta}>
            <span className={`${styles.statusPill} ${styles.on}`}>✓ admin verified</span>
            <span className={`${styles.statusPill} ${stripeMode === "LIVE" ? styles.on : styles.off}`}>
              {stripeMode === "—" ? "✗ stripe unset" : `stripe ${stripeMode}`}
            </span>
            <span className={`${styles.statusPill} ${resend.configured && !resend.error ? styles.on : styles.off}`}>
              {resend.configured ? "resend connected" : "resend unset"}
            </span>
          </div>
        </header>

        <DevNav />

        <ZoneSection
          id="zone-check"
          icon="monitor_heart"
          title="CHECK"
          purpose="ตรวจสถานะก่อนทำงาน"
          question="ระบบปกติดีไหม?"
          defaultOpen
        >
          <ExceptionsModule exceptions={exceptions} fetchedAt={fetchedAt} />
          <SecurityFeedModule />
          <HealthModule fetchedAt={fetchedAt} />
          <ResendModule resend={resend} fetchedAt={fetchedAt} />
        </ZoneSection>

        <ZoneSection
          id="zone-understand"
          icon="insights"
          title="UNDERSTAND"
          purpose="มองภาพรวมก่อนตัดสินใจ"
          question="ตอนนี้เกิดอะไรขึ้น?"
          defaultOpen
        >
          <OverviewModule
            userCount={userCount}
            linkCount={linkCount}
            eventCount={eventCount}
            activeSubs={activeSubs}
            fetchedAt={fetchedAt}
          />
          <UsersCrm fetchedAt={fetchedAt} />
          <RevenueModule fetchedAt={fetchedAt} />
        </ZoneSection>

        <ZoneSection
          id="zone-act"
          icon="construction"
          title="ACT"
          purpose="ลงมือทำกับข้อมูลจริง"
          question="ต้องทำอะไร?"
          defaultOpen={false}
        >
          <SupportChatModule initialUnread={openSupportTickets} />
          <RulesManagerModule />
          <SupportModule />
        </ZoneSection>

        <ZoneSection
          id="zone-control"
          icon="settings"
          title="CONTROL"
          purpose="ปรับระบบ · secret · deploy"
          question="ต้องเปลี่ยนอะไร?"
          defaultOpen={false}
        >
          <ConfigModule config={config} fetchedAt={fetchedAt} />
          <SecretVault items={vaultItems} />
          <ApprovalModule />
          <DeployModule steps={DEPLOY_STEPS} />
          <ChecklistModule items={CHECKLIST} />
          <GovernanceModule />
        </ZoneSection>

        <ZoneSection
          id="zone-reference"
          icon="menu_book"
          title="REFERENCE"
          purpose="ค้นข้อมูลเพิ่มเติม"
          question="ไปดูอะไรต่อดี?"
          defaultOpen={false}
        >
          <RoadmapModule />
          <MilestonesModule />
          <LinksModule />
          <DesignModule />
          <IncidentReportModule />
          <NotesModule />
        </ZoneSection>

        <footer className={styles.foot}>
          <span>© 2026 VibeLink — Mission Control</span>
          <span>เข้าถึงจำกัดเฉพาะผู้ดูแลระบบ · noindex</span>
        </footer>
      </div>
    </main>
  );
}