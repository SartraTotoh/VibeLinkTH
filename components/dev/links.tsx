import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/ceo/dev-console.module.css";

type QuickLink = { label: string; url: string; icon: string; desc: string };

const LINKS: QuickLink[] = [
  {
    label: "Cloudflare Workers",
    url: "https://dash.cloudflare.com/?to=/:account/workers-and-pages",
    icon: "cloud",
    desc: "deploy ยท log ยท route เธเธญเธเนเธญเธ",
  },
  {
    label: "Cloudflare DNS",
    url: "https://dash.cloudflare.com/?to=/:account/vibelinkth.com/dns",
    icon: "dns",
    desc: "เน€เธฃเธเธเธญเธฃเนเธ” DNS ยท เธ•เธฃเธงเธ SPF/DKIM/DMARC",
  },
  {
    label: "Stripe Dashboard",
    url: "https://dashboard.stripe.com/",
    icon: "payments",
    desc: "เน€เธเธดเธเน€เธเนเธฒ ยท เธฅเธนเธเธเนเธฒ ยท subscription",
  },
  {
    label: "Stripe Webhooks",
    url: "https://dashboard.stripe.com/webhooks",
    icon: "webhook",
    desc: "event เธเธฒเธ Stripe เน€เธเนเธฒเธเธฃเธเนเธซเธก",
  },
  {
    label: "Stripe Billing Portal",
    url: "https://dashboard.stripe.com/settings/billing/portal",
    icon: "receipt_long",
    desc: "เธซเธเนเธฒเธเธฑเธ”เธเธฒเธฃเธเธดเธฅเนเธซเนเธฅเธนเธเธเนเธฒ",
  },
  {
    label: "Neon Console",
    url: "https://console.neon.tech/",
    icon: "storage",
    desc: "เธเธฒเธเธเนเธญเธกเธนเธฅ ยท backup ยท connection",
  },
  {
    label: "Resend Domains",
    url: "https://resend.com/domains",
    icon: "mark_email_read",
    desc: "เธขเธทเธเธขเธฑเธเนเธ”เน€เธกเธ ยท เธชเธ–เธฒเธเธฐเธชเนเธเธญเธตเน€เธกเธฅ",
  },
  {
    label: "Sentry",
    url: "https://sentry.io/",
    icon: "bug_report",
    desc: "error เธเธฑเนเธ production (เธ–เนเธฒเน€เธเธทเนเธญเธกเนเธฅเนเธง)",
  },
];

export function LinksModule() {
  return (
    <Collapsible id="mod-links" icon="link" title="เธฅเธดเธเธเนเธ”เนเธงเธ" source="เธฅเธดเธเธเนเธ เธฒเธขเธเธญเธ (เน€เธเธดเธ”เนเธ—เนเธเนเธซเธกเน)">
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
