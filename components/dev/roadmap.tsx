import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/ceo/dev-console.module.css";

const PHASES: { phase: string; items: string[] }[] = [
  {
    phase: "Phase 2 โ€” เน€เธ•เธดเธเนเธ•",
    items: [
      "API + API keys + webhooks",
      "เธ—เธตเธก/เธญเธเธเนเธเธฃ + roles",
      "เธฃเธญเธเธฃเธฑเธ LINE / TikTok / Shopee / Lazada + deep link",
      "link-in-bio",
      "Referral / affiliate, promo codes",
      "Audit log, A/B testing",
    ],
  },
  {
    phase: "Phase 3 โ€” Scale/Ops",
    items: [
      "Aggregate analytics เธเนเธฒเธ Queues + R2/D1 (เธฅเธ”เธ เธฒเธฃเธฐ DB เธ•เนเธญเธเธฅเธดเธ)",
      "Cost monitoring",
      "เธเธฑเธ abuse / เธชเนเธเธกเน€เธเธดเธเธฃเธฐเธเธ",
      "Status page + incident process",
    ],
  },
];

export function RoadmapModule() {
  return (
    <Collapsible
      id="mod-roadmap"
      icon="map"
      title="เนเธเธเธฑเธชเธเนเธฒเธเธซเธเนเธฒ"
      tag="planned"
      source="เธ•เธเธฅเธเธเธฑเธเน€เธเนเธฒเธเธญเธ โ€” เนเธเนเนเธเนเธเนเธเนเธ”"
    >
      <p className={styles.cardSub}>Phase 0 เน€เธชเธฃเนเธเนเธฅเนเธง ยท Phase 1 เธเธณเธฅเธฑเธเธ—เธณ ยท Phase 2โ€“3 เธฃเธญเธญเธเธธเธกเธฑเธ•เธด</p>
      <div className={styles.stack} style={{ marginTop: 12 }}>
        {PHASES.map((r) => (
          <div className={styles.kv} key={r.phase}>
            <div>
              <b>{r.phase}</b>
              <span style={{ color: "#a1a1aa" }}>{r.items.join(" ยท ")}</span>
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}