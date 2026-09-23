import styles from "@/app/ceo/dev-console.module.css";
import { CopyButton } from "@/components/dev/copy-button";
import type { ResendDomainStatus } from "@/lib/resend-admin";

export function ResendModule({
  resend,
  fetchedAt,
}: {
  resend: ResendDomainStatus;
  fetchedAt: string;
}) {
  const records = resend.records ?? [];
  const verifiedCount = records.filter((r) => r.status === "verified").length;
  const allVerified = records.length > 0 && verifiedCount === records.length;

  const dnsState = resend.sendOnly
    ? { done: true, icon: "verified", sub: "ยืนยันครบใน dashboard" }
    : allVerified
      ? { done: true, icon: "dns", sub: `${verifiedCount} records` }
      : { done: false, icon: "autorenew", sub: "รอการยืนยัน" };

  const tone = !resend.configured
    ? "ยังไม่เชื่อมค่า secret"
    : resend.error
      ? `⚠ ${resend.error}`
      : resend.sendOnly
        ? "คีย์แบบ send-only (least privilege) — โดเมนยืนยันครบใน dashboard ของ Resend"
        : `พร้อมใช้ · DNS ยืนยันแล้ว ${verifiedCount}/${records.length}`;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">mark_email_read</span>
        <h2>Resend · อีเมล</h2>
        {resend.configured ? (
          <span className={`${styles.pill} ${resend.error ? styles.pillWarn : styles.pillOn}`}>
            {resend.error ? "มีปัญหา" : resend.sendOnly ? "send-only" : "พร้อม"}
          </span>
        ) : null}
      </div>

      <div className={styles.timeline}>
        <div className={`${styles.step} ${resend.configured ? styles.stepDone : ""}`}>
          <span className={styles.stepIcon}>
            <span className="ms">{resend.configured ? "check" : "hourglass_empty"}</span>
          </span>
          <b>Domain added</b>
          <small>{resend.configured ? resend.name ?? "vibelinkth.com" : "ยังไม่เชื่อม"}</small>
        </div>
        <div className={allVerified ? styles.connector : styles.connectorIdle} />
        <div className={`${styles.step} ${dnsState.done ? styles.stepDone : ""}`}>
          <span className={styles.stepIcon}>
            <span className="ms">{dnsState.icon}</span>
          </span>
          <b>DNS verified</b>
          <small>{dnsState.sub}</small>
        </div>
        <div className={styles.connectorIdle} />
        <div className={styles.step}>
          <span className={styles.stepIcon}>
            <span className="ms">send</span>
          </span>
          <b>Smoke test</b>
          <small>ส่งอีเมลทดสอบจริง</small>
        </div>
      </div>

      <p className={styles.cardSub} style={{ margin: "12px 0 0" }}>{tone}</p>

      {records.length > 0 ? (
        <div className={styles.tableWrap} style={{ marginTop: 16 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Content</th>
                <th>TTL</th>
                <th>Status</th>
                <th aria-label="copy" />
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={`${r.type}-${r.name}-${i}`}>
                  <td className={styles.cellMono}>{r.type}</td>
                  <td className={styles.cellMono}>{r.name}</td>
                  <td className={styles.cellMono} title={r.value}>
                    {r.value.length > 42 ? `${r.value.slice(0, 42)}…` : r.value}
                  </td>
                  <td>{r.ttl}</td>
                  <td>
                    <span className={`${styles.pill} ${r.status === "verified" ? styles.pillOn : styles.pillWarn}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <CopyButton text={r.value} label={`คัดลอก ${r.type} ${r.name}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : resend.sendOnly ? null : (
        <p className={styles.cardSub} style={{ margin: "12px 0 0" }}>
          ยังไม่มีข้อมูล DNS records
        </p>
      )}

      <div className={styles.hairline} style={{ marginTop: 14 }} />

      <p className={styles.source} style={{ marginTop: 12 }}>
        Source · Resend API สด ·{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> อัปเดตล่าสุด {fetchedAt}
        </span>{" "}
        · เปิดเพิ่มเติมที่{" "}
        <a className={styles.freshLink} href="https://resend.com/domains" target="_blank" rel="noreferrer noopener">
          Resend Domains <span className="ms" aria-hidden>open_in_new</span>
        </a>
      </p>
    </div>
  );
}