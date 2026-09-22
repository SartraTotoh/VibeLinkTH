import styles from "@/app/dev/dev-console.module.css";

export type DevException = {
  key: string;
  tone: "bad" | "warn" | "info";
  icon: string;
  title: string;
  detail: string;
  action?: { label: string; href: string };
  target?: string;
};

export function ExceptionsModule({
  exceptions,
  fetchedAt,
}: {
  exceptions: DevException[];
  fetchedAt: string;
}) {
  const anyBad = exceptions.some((e) => e.tone === "bad");

  return (
    <div className={`${styles.card} ${anyBad ? styles.cardWarn : ""}`}>
      <div className={styles.cardHead}>
        <span className="ms">{anyBad ? "error" : "task_alt"}</span>
        <h2>สิ่งที่ต้องรู้ก่อนทำงาน</h2>
        {exceptions.length > 0 ? (
          <span className={`${styles.pill} ${anyBad ? styles.pillWarn : ""}`}>
            {exceptions.length} รายการ
          </span>
        ) : null}
      </div>

      {exceptions.length === 0 ? (
        <div className={styles.exRow}>
          <span className={`ms ${styles.exIcon}`} style={{ color: "#9aef80" }} aria-hidden>check_circle</span>
          <span className={styles.exBody}>
            <b>ทุกอย่างปกติ</b>
            <i>ไม่มีรายการที่ต้องตัดสินใจ</i>
          </span>
          <span className={`${styles.pill} ${styles.pillOn}`}>ok</span>
        </div>
      ) : (
        <div className={styles.exList}>
          {exceptions.map((e) => (
            <div className={`${styles.exRow} ${e.tone === "bad" ? styles.exBad : e.tone === "warn" ? styles.exWarn : ""}`} key={e.key} id={e.key}>
              <span className={`ms ${styles.exIcon}`} aria-hidden>{e.icon}</span>
              <span className={styles.exBody}>
                <b>{e.title}</b>
                <i>{e.detail}</i>
              </span>
              {e.target ? (
                <a className={styles.exGo} href={e.target}>
                  <span className="ms" aria-hidden>arrow_forward</span>
                </a>
              ) : null}
              {e.action ? (
                <a className={styles.exAction} href={e.action.href} target="_blank" rel="noreferrer noopener">
                  {e.action.label}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <p className={styles.source}>
        Source · คำนวณสดจาก Worker env + Resend + DB ·{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> ตรวจล่าสุด {fetchedAt}
        </span>
      </p>
    </div>
  );
}