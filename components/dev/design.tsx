import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/ceo/dev-console.module.css";

const THEMES = [
  {
    name: "Blink",
    mode: "light",
    spec: "VibeLink Electric Frosted",
    file: "DESIGN-blink.md",
    tokens: "bg #f5fbea · การ์ดฟรอสต์ white/80 + backdrop-blur-2xl · DM Sans · squircle",
    status: "landing มีแล้ว · app ยังไม่เข้า (pending)",
    statusClass: styles.pillWarn,
  },
  {
    name: "Pank",
    mode: "dark",
    spec: "Cyberpunk Neon Glass",
    file: "DESIGN.md",
    tokens: "bg #090b10·#111319 · lime #b9ff2c · pink #ff4fd8 · violet #9270ff",
    status: "ธีมหลัก · ค่าเริ่มต้น landing + app (app/* ทั้งหมด)",
    statusClass: styles.pillOn,
  },
];

export function DesignModule() {
  return (
    <Collapsible
      id="mod-design"
      icon="palette"
      title="ธีม · Blink / Pank"
      tag="design"
      source="ไฟล์ต้นทางที่ repo root: DESIGN-blink.md (Blink) + DESIGN.md (Pank)"
    >
      <div className={styles.stack}>
        {THEMES.map((t) => (
          <div className={styles.kv} key={t.name}>
            <div>
              <b>{t.name} · {t.mode} — {t.spec}</b>
              <span style={{ color: "#a1a1aa" }}>{t.tokens}</span>
              <span style={{ color: "#8e8e96" }}>{t.file} · {t.status}</span>
            </div>
            <span className={`${styles.pill} ${t.statusClass}`}>{t.mode}</span>
          </div>
        ))}

        <div className={styles.kv}>
          <div>
            <b>ปุ่มสลับโหมด</b>
            <span style={{ color: "#a1a1aa" }}>
              อยู่ที่ landing/index.html → [data-theme-btn] · ค่าเริ่มต้น "pank" · จำตัวเลือกใน
              localStorage "vibelink-theme"
            </span>
          </div>
        </div>

        <div className={styles.kv}>
          <div>
            <b>หมายเหตุคนขี้ลืม</b>
            <span style={{ color: "#a1a1aa" }}>
              Blink = สว่างเสมอ, Pank = มืดเสมอ — อย่าเขียนสลับกัน · ถ้าจะเพิ่มธีม ต้องอัปเดต 2
              ไฟล์นี้ + หลักฐานใน landing ก่อน
            </span>
          </div>
        </div>
      </div>
    </Collapsible>
  );
}