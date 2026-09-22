import styles from "@/app/dev/dev-console.module.css";

export function OverviewModule({
  userCount,
  linkCount,
  eventCount,
  activeSubs,
  fetchedAt,
}: {
  userCount: number;
  linkCount: number;
  eventCount: number;
  activeSubs: number;
  fetchedAt: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">insights</span>
        <h2>ภาพรวม</h2>
      </div>
      <p className={styles.cardSub}>ตัวเลขระดับสูงของธุรกิจตอนนี้</p>
      <div className={styles.stats} style={{ marginTop: 10 }}>
        <div className={styles.stat}>
          <small><span className="ms">group</span>ผู้ใช้</small>
          <b>{userCount.toLocaleString("th-TH")}</b>
        </div>
        <div className={styles.stat}>
          <small><span className="ms">link</span>ลิงก์ทั้งหมด</small>
          <b>{linkCount.toLocaleString("th-TH")}</b>
        </div>
        <div className={styles.stat}>
          <small><span className="ms">bar_chart</span>คลิกสะสม</small>
          <b>{eventCount.toLocaleString("th-TH")}</b>
        </div>
        <div className={styles.stat}>
          <small><span className="ms">workspace_premium</span>ลูกค้าจ่ายเงิน</small>
          <b>{activeSubs.toLocaleString("th-TH")}</b>
        </div>
      </div>
      <p className={styles.source}>
        Source · NeonDB ·{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> อัปเดตล่าสุด {fetchedAt}
        </span>
      </p>
    </div>
  );
}