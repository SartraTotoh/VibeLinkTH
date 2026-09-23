import styles from "@/app/ceo/dev-console.module.css";

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
        <h2>เธ เธฒเธเธฃเธงเธก</h2>
      </div>
      <p className={styles.cardSub}>เธ•เธฑเธงเน€เธฅเธเธฃเธฐเธ”เธฑเธเธชเธนเธเธเธญเธเธเธธเธฃเธเธดเธเธ•เธญเธเธเธตเน</p>
      <div className={styles.stats} style={{ marginTop: 10 }}>
        <div className={styles.stat}>
          <small><span className="ms">group</span>เธเธนเนเนเธเน</small>
          <b>{userCount.toLocaleString("th-TH")}</b>
        </div>
        <div className={styles.stat}>
          <small><span className="ms">link</span>เธฅเธดเธเธเนเธ—เธฑเนเธเธซเธกเธ”</small>
          <b>{linkCount.toLocaleString("th-TH")}</b>
        </div>
        <div className={styles.stat}>
          <small><span className="ms">bar_chart</span>เธเธฅเธดเธเธชเธฐเธชเธก</small>
          <b>{eventCount.toLocaleString("th-TH")}</b>
        </div>
        <div className={styles.stat}>
          <small><span className="ms">workspace_premium</span>เธฅเธนเธเธเนเธฒเธเนเธฒเธขเน€เธเธดเธ</small>
          <b>{activeSubs.toLocaleString("th-TH")}</b>
        </div>
      </div>
      <p className={styles.source}>
        Source ยท NeonDB ยท{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> เธญเธฑเธเน€เธ”เธ•เธฅเนเธฒเธชเธธเธ” {fetchedAt}
        </span>
      </p>
    </div>
  );
}