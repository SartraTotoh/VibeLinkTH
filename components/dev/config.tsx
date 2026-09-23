import styles from "@/app/ceo/dev-console.module.css";
import { CopyButton } from "@/components/dev/copy-button";

export function ConfigModule({
  config,
  fetchedAt,
}: {
  config: [string, string][];
  fetchedAt: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">tune</span>
        <h2>Runtime config</h2>
        <span className={`${styles.pill} ${styles.pillOn}`}>live</span>
      </div>
      <p className={styles.cardSub}>ค่าที่ Worker ใช้รันอยู่ตอนนี้ (ไม่รวมค่าลับ — อยู่ใน Secret Vault ด้านล่าง)</p>
      <div style={{ marginTop: 12 }}>
        {config.map(([k, v]) => (
          <div className={styles.crow} key={k}>
            <div className={styles.crowKey}>
              <b title={k}>{k}</b>
            </div>
            <code className={styles.crowVal} title={v}>
              {v}
            </code>
            <CopyButton text={v} label={`คัดลอก ${k}`} />
          </div>
        ))}
      </div>
      <p className={styles.source}>
        Source · Worker env ขณะรัน ·{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> อ่านค่า {fetchedAt}
        </span>
      </p>
    </div>
  );
}
