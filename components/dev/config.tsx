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
      <p className={styles.cardSub}>เธเนเธฒเธ—เธตเน Worker เนเธเนเธฃเธฑเธเธญเธขเธนเนเธ•เธญเธเธเธตเน (เนเธกเนเธฃเธงเธกเธเนเธฒเธฅเธฑเธ โ€” เธญเธขเธนเนเนเธ Secret Vault เธ”เนเธฒเธเธฅเนเธฒเธ)</p>
      <div style={{ marginTop: 12 }}>
        {config.map(([k, v]) => (
          <div className={styles.crow} key={k}>
            <div className={styles.crowKey}>
              <b title={k}>{k}</b>
            </div>
            <code className={styles.crowVal} title={v}>
              {v}
            </code>
            <CopyButton text={v} label={`เธเธฑเธ”เธฅเธญเธ ${k}`} />
          </div>
        ))}
      </div>
      <p className={styles.source}>
        Source ยท Worker env เธเธ“เธฐเธฃเธฑเธ ยท{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> เธญเนเธฒเธเธเนเธฒ {fetchedAt}
        </span>
      </p>
    </div>
  );
}
