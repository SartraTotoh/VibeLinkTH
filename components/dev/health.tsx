import styles from "@/app/ceo/dev-console.module.css";

export function HealthModule({ fetchedAt }: { fetchedAt: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">monitor_heart</span>
        <h2>เธฃเธฐเธเธเธซเธฅเธฑเธ</h2>
      </div>
      <p className={styles.cardSub}>
        เธฃเธฐเธเธเธ—เธณเธเธฒเธเธเธเธ•เธด ยท เนเธญเธ (Worker) เนเธฅเธฐเธเธฒเธเธเนเธญเธกเธนเธฅ (Neon) เน€เธเธทเนเธญเธกเธ•เนเธญเนเธฅเธฐเธ•เธญเธเธชเธเธญเธ
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
        Source ยท Worker + Neon ยท <span className={styles.fresh}><span className="ms" aria-hidden>schedule</span> เธญเธฑเธเน€เธ”เธ•เธฅเนเธฒเธชเธธเธ” {fetchedAt}</span>
      </p>
    </div>
  );
}