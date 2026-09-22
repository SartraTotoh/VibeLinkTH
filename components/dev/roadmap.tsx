import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/dev/dev-console.module.css";

const PHASES: { phase: string; items: string[] }[] = [
  {
    phase: "Phase 2 — เติบโต",
    items: [
      "API + API keys + webhooks",
      "ทีม/องค์กร + roles",
      "รองรับ LINE / TikTok / Shopee / Lazada + deep link",
      "link-in-bio",
      "Referral / affiliate, promo codes",
      "Audit log, A/B testing",
    ],
  },
  {
    phase: "Phase 3 — Scale/Ops",
    items: [
      "Aggregate analytics ผ่าน Queues + R2/D1 (ลดภาระ DB ต่อคลิก)",
      "Cost monitoring",
      "กัน abuse / สแปมเชิงระบบ",
      "Status page + incident process",
    ],
  },
];

export function RoadmapModule() {
  return (
    <Collapsible
      id="mod-roadmap"
      icon="map"
      title="โฟกัสข้างหน้า"
      tag="planned"
      source="ตกลงกับเจ้าของ — แก้ไขในโค้ด"
    >
      <p className={styles.cardSub}>Phase 0 เสร็จแล้ว · Phase 1 กำลังทำ · Phase 2–3 รออนุมัติ</p>
      <div className={styles.stack} style={{ marginTop: 12 }}>
        {PHASES.map((r) => (
          <div className={styles.kv} key={r.phase}>
            <div>
              <b>{r.phase}</b>
              <span style={{ color: "#a1a1aa" }}>{r.items.join(" · ")}</span>
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}