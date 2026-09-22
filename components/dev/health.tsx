import styles from "@/app/dev/dev-console.module.css";

export function HealthModule({ fetchedAt }: { fetchedAt: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">monitor_heart</span>
        <h2>ระบบหลัก</h2>
      </div>
      <p className={styles.cardSub}>
        ระบบทำงานปกติ · แอป (Worker) และฐานข้อมูล (Neon) เชื่อมต่อและตอบสนอง
      </p>
      <div className={styles.chips}>
        <span className={`${styles.chip} ${styles.chipOk}`}>
          <span className="ms" aria-hidden>cloud_done</span>
          <small>Worker / API</small>
          <b>online</b>
        </span>
        <span className={`${styles.chip} ${styles.chipOk}`}>
          <span className="ms" aria-hidden>storage</span>
          <small>Neon DB</small>
          <b>online</b>
        </span>
        <span className={`${styles.chip} ${styles.chipOk}`}>
          <span className="ms" aria-hidden>verified_user</span>
          <small>Auth session</small>
          <b>ok</b>
        </span>
      </div>
      <p className={styles.source}>
        Source · Worker + Neon · <span className={styles.fresh}><span className="ms" aria-hidden>schedule</span> อัปเดตล่าสุด {fetchedAt}</span>
      </p>
    </div>
  );
}