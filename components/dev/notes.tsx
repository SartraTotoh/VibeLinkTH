import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/dev/dev-console.module.css";

const NOTES: [string, string][] = [
  ["ธีม 2 โหมด ห้ามสลับชื่อ", "Blink = light (Electric Frosted · DESIGN-blink.md, bg #f5fbea) · Pank = dark (Cyberpunk Neon Glass · DESIGN.md, bg #090b10) — สลับได้ที่ landing [data-theme-btn] · แอป app/* ยังเป็น Pank เท่านั้น"],
  ["Pipeline deploy", "ต้องใช้ npm run cf:deploy เท่านั้น (build → patch Prisma wasm → deploy) หลังแก้ schema ต้อง prisma generate ก่อน"],
  ["Rate limit ในโค้ดเป็นระดับ isolate", "ป้องกันพื้นฐานได้ แต่ชั้นจริงควรใช้ WAF Rate Limiting ของ Cloudflare"],
  ["@prisma/adapter-neon เป็น v7 แต่ client v6", "ทำงานได้ แต่ควร align major ให้ตรงในอนาคต"],
  ["DMARC policy ปัจจุบัน p=none", "เก็บ log ก่อน แล้วยกระดับเป็น quarantine/reject เมื่อมั่นใจ"],
  ["โดเมน", "แอป: app.vibelinkth.com · ลิงก์สั้น: vibelinkth.com/go/* · www/go ยังไม่เข้า Worker"],
  ["หน่วยความจำดีไซน์: ห้ามใช้สไตล์การ์ดโปรโมชันไล่สีชมพู/ขอบเขียว (plan-panel เดิม)", "ลบออกจากโค้ดแล้ว — dashboard ใช้ member-strip แทน ห้ามนำกลับมาใช้อีก"],
  ["วัด Core Web Vitals", "npm run lighthouse:app (ต้องมี Chrome) — เป้า LCP < 2.5s, CLS < 0.1, INP < 200ms"],
  ["โดเมนสั้นสำหรับลิงก์ (Phase 2)", "slug สุ่ม 6 ตัวอักษรอยู่แล้ว (≤7 ✓) · ฟอร์มเตือนเมื่อ slug ยาวเกิน 10 · โดเมนสั้นแยกต้องซื้อโดเมนใหม่ (มีค่าใช้จ่าย) — รอตัดสินใจ"],
  ["การ์ดกันไฟล์ลับบน apex (.env)", "ลบ route ออกได้หลัง purge cache หรือพ้น s-maxage (~28 ก.ย. 2569)"],
];

export function NotesModule() {
  return (
    <Collapsible id="mod-notes" icon="info" title="บันทึกเตือนใจ" source="บันทึกจากการทำงานจริง">
      <div className={styles.stack}>
        {NOTES.map(([title, desc]) => (
          <div className={styles.kv} key={title}>
            <div>
              <b>{title}</b>
              <span style={{ color: "#a1a1aa" }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}