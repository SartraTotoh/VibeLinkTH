import styles from "@/app/ceo/dev-console.module.css";
import { CopyButton } from "@/components/dev/copy-button";

export type DeployStep = { title: string; when: string; cmd: string | null };

export function DeployModule({ steps }: { steps: DeployStep[] }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">rocket_launch</span>
        <h2>Deploy</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>pipeline</span>
      </div>
      <p className={styles.cardSub}>
        เธ—เธณเธ•เธฒเธกเธฅเธณเธ”เธฑเธ 1 โ’ {steps.length} ยท เธฃเธฑเธเธเธฒเธเนเธเธฅเน€เธ”เธญเธฃเนเนเธเธฃเน€เธเธเธ•เน (Windows PowerShell)
      </p>
      <ol className={styles.ordered}>
        {steps.map((s) => (
          <li key={s.title}>
            <b>{s.title}</b>
            <span>{s.when}</span>
            {s.cmd ? (
              <div className={styles.cmdRow}>
                <code title={s.cmd}>{s.cmd}</code>
                <CopyButton text={s.cmd} label={`เธเธฑเธ”เธฅเธญเธ ${s.title}`} />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <p className={styles.source}>Source ยท package.json + runbook เนเธ repo ยท เธเธณเธชเธฑเนเธ deploy เธ•เนเธญเธเธเนเธฒเธ patch Prisma wasm เน€เธชเธกเธญ</p>
    </div>
  );
}
