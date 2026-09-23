import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/ceo/dev-console.module.css";

export function MilestonesModule() {
  const annivMs = new Date("2027-09-21T00:00:00+07:00").getTime() - Date.now();
  const daysLeft = Math.ceil(annivMs / 86400_000);

  return (
    <Collapsible
      id="mod-milestones"
      icon="cake"
      title="วันที่สำคัญ"
      source="วันที่จริงของโปรเจกต์"
    >
      <div className={styles.stack}>
        <div className={styles.kv}>
          <div>
            <b>21 ก.ย. 2569 — Grand Launch</b>
            <span style={{ color: "#a1a1aa" }}>
              landing + แอปใช้งานจริง + รับเงิน Stripe Live + อีเมล Resend · วันเกิด VibeLink
            </span>
          </div>
          <span className={`${styles.pill} ${styles.pillOn}`}>D-DAY</span>
        </div>
        <div className={styles.kv}>
          <div>
            <b>22 ก.ย. 2569 — Phase 1 + Security hardening</b>
            <span style={{ color: "#a1a1aa" }}>
              Analytics/QR/UTM/i18n/CRM ครบ · อุดช่องโหว่ไฟล์ลับ + โรเตชันคีย์
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>21 ก.ย. 2570 — ครบรอบ 1 ปี</b>
            <span style={{ color: "#a1a1aa" }}>
              {annivMs > 0 ? `อีกประมาณ ${daysLeft} วัน` : "ถึงแล้ว ฉลองเลย!"}
            </span>
          </div>
          <span className={`${styles.pill} ${styles.pillWarn}`}>next</span>
        </div>
      </div>
    </Collapsible>
  );
}