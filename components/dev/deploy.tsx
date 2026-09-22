import styles from "@/app/dev/dev-console.module.css";
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
        ทำตามลำดับ 1 → {steps.length} · รันจากโฟลเดอร์โปรเจกต์ (Windows PowerShell)
      </p>
      <ol className={styles.ordered}>
        {steps.map((s) => (
          <li key={s.title}>
            <b>{s.title}</b>
            <span>{s.when}</span>
            {s.cmd ? (
              <div className={styles.cmdRow}>
                <code title={s.cmd}>{s.cmd}</code>
                <CopyButton text={s.cmd} label={`คัดลอก ${s.title}`} />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <p className={styles.source}>Source · package.json + runbook ใน repo · คำสั่ง deploy ต้องผ่าน patch Prisma wasm เสมอ</p>
    </div>
  );
}
