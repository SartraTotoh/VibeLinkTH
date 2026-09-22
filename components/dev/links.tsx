import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/dev/dev-console.module.css";

type QuickLink = { label: string; url: string; icon: string; desc: string };

const LINKS: QuickLink[] = [
  {
    label: "Cloudflare Workers",
    url: "https://dash.cloudflare.com/?to=/:account/workers-and-pages",
    icon: "cloud",
    desc: "deploy · log · route ของแอป",
  },
  {
    label: "Cloudflare DNS",
    url: "https://dash.cloudflare.com/?to=/:account/vibelinkth.com/dns",
    icon: "dns",
    desc: "เรคคอร์ด DNS · ตรวจ SPF/DKIM/DMARC",
  },
  {
    label: "Stripe Dashboard",
    url: "https://dashboard.stripe.com/",
    icon: "payments",
    desc: "เงินเข้า · ลูกค้า · subscription",
  },
  {
    label: "Stripe Webhooks",
    url: "https://dashboard.stripe.com/webhooks",
    icon: "webhook",
    desc: "event จาก Stripe เข้าครบไหม",
  },
  {
    label: "Stripe Billing Portal",
    url: "https://dashboard.stripe.com/settings/billing/portal",
    icon: "receipt_long",
    desc: "หน้าจัดการบิลให้ลูกค้า",
  },
  {
    label: "Neon Console",
    url: "https://console.neon.tech/",
    icon: "storage",
    desc: "ฐานข้อมูล · backup · connection",
  },
  {
    label: "Resend Domains",
    url: "https://resend.com/domains",
    icon: "mark_email_read",
    desc: "ยืนยันโดเมน · สถานะส่งอีเมล",
  },
  {
    label: "Sentry",
    url: "https://sentry.io/",
    icon: "bug_report",
    desc: "error ฝั่ง production (ถ้าเชื่อมแล้ว)",
  },
];

export function LinksModule() {
  return (
    <Collapsible id="mod-links" icon="link" title="ลิงก์ด่วน" source="ลิงก์ภายนอก (เปิดแท็บใหม่)">
      <div className={styles.linkGrid}>
        {LINKS.map((l) => (
          <a className={styles.linkCard} key={l.url} href={l.url} target="_blank" rel="noreferrer noopener">
            <span className={`${styles.linkIcon} ms`} aria-hidden>
              {l.icon}
            </span>
            <span className={styles.linkText}>
              <b>{l.label}</b>
              <small>{l.desc}</small>
            </span>
            <span className={`${styles.linkGo} ms`} aria-hidden>
              open_in_new
            </span>
          </a>
        ))}
      </div>
    </Collapsible>
  );
}
