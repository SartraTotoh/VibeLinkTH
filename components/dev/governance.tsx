"use client";

import { useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

type Risk = {
  priority: "critical" | "high" | "medium";
  issue: string;
  response: string;
  status: "action needed" | "pending" | "partial" | "doing" | "done";
  note?: string;
};

const RISKS: Risk[] = [
  {
    priority: "critical",
    issue: "เธขเธทเธเธขเธฑเธ rotate/revoke credentials เธ—เธตเนเน€เธเธขเธซเธฅเธธเธ”",
    response: "เธ•เธฃเธงเธเธงเนเธฒ key เน€เธเนเธฒเธ–เธนเธ revoke เธเธฃเธดเธ ยท เธ•เธฃเธงเธ logs ยท เน€เธเนเธเธซเธฅเธฑเธเธเธฒเธ",
    status: "action needed",
    note: "เธเธฃเธถเนเธเธเธฑเนเธเนเธญเธเธ—เธณเนเธฅเนเธง (AUTH_SECRET rotate เนเธฅเนเธง) ยท เธเนเธฒเธ: purge cache, roll Neon, roll Stripe test keys",
  },
  {
    priority: "critical",
    issue: "เธเธฃเธฐเน€เธกเธดเธเน€เธซเธ•เธธเธเธฒเธฃเธ“เนเธเนเธญเธกเธนเธฅเธชเนเธงเธเธเธธเธเธเธฅเธ•เธฒเธก PDPA",
    response: "breach assessment เธญเธขเนเธฒเธเน€เธเนเธเธ—เธฒเธเธเธฒเธฃ + เธเธฃเธถเธเธฉเธฒเธเธเธเธเธซเธกเธฒเธขเน€เธฃเธทเนเธญเธเธซเธเนเธฒเธ—เธตเนเนเธเนเธเน€เธซเธ•เธธ",
    status: "action needed",
  },
  {
    priority: "high",
    issue: "DPA เธเธฑเธ sub-processors",
    response: "เธเธฑเธ”เธ—เธณ/เธ•เธฃเธงเธ Data Processing Agreement เธเธฑเธ Neon ยท Resend ยท Stripe ยท Cloudflare",
    status: "pending",
  },
  {
    priority: "high",
    issue: "เนเธขเธ staging เธเธฑเธ production payment",
    response: "เธซเธฅเธตเธเน€เธฅเธตเนเธขเธเธ—เธ”เธชเธญเธเน€เธเธดเธเธเธฃเธดเธเนเธ prod โ€” เธเธฑเธเธเธธเธเธฑเธ money path เธเนเธฒเธเธ”เนเธงเธขเธกเธนเธฅเธเนเธฒ เธฟ0 เนเธฅเนเธง",
    status: "partial",
  },
  {
    priority: "high",
    issue: "Privacy Policy / ToS / Refund Policy",
    response: "เน€เธเธขเนเธเธฃเนเนเธซเนเธชเธญเธ”เธเธฅเนเธญเธเธเธฑเธเธเธฒเธฃเน€เธเธดเธ”เธฃเธฑเธเธเธณเธฃเธฐเน€เธเธดเธเธเธฃเธดเธ",
    status: "pending",
  },
  {
    priority: "medium",
    issue: "เธฅเธ” single-operator / bus factor",
    response: "second reviewer ยท runbook ยท least privilege ยท MFA",
    status: "pending",
  },
  {
    priority: "medium",
    issue: "Rotation policy",
    response: "เธฃเธญเธเธซเธกเธธเธ PIN / backup code / secrets + เธ—เธเธ—เธงเธเธชเธดเธ—เธเธดเนเธเธฃเธฐเธเธณเธฃเธญเธ",
    status: "pending",
    note: "AUTH_SECRET เน€เธเธข rotate เนเธฅเนเธง 1 เธเธฃเธฑเนเธ",
  },
  {
    priority: "medium",
    issue: "Auditability",
    response: "เธเธฑเธเธ—เธถเธ who / what / when / result เธเธญเธเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธเธชเธณเธเธฑเธ",
    status: "doing",
    note: "audit log เธ—เธณเธเธฒเธเนเธฅเนเธงเธชเธณเธซเธฃเธฑเธ link status change + full PII export",
  },
];

type AuditRow = {
  id: string;
  actorEmail: string;
  action: string;
  subjectRef: string | null;
  result: string;
  createdAt: string;
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function GovernanceModule() {
  const [logs, setLogs] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    fetch("/api/dev/audit?limit=20")
      .then((r) => (r.ok ? r.json() : { logs: [] }))
      .then((j) => setLogs(j.logs ?? []))
      .catch(() => setLogs([]));
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">gpp_bad</span>
        <h2>เธเธงเธฒเธกเน€เธชเธตเนเธขเธ & เธเธฒเธฃเน€เธขเธตเธขเธงเธขเธฒ</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>governance</span>
      </div>
      <p className={styles.cardSub}>
        เธเธฒเธเธเธฒเธฃเธเธฃเธฐเน€เธกเธดเธเธเธงเธฒเธกเน€เธชเธตเนเธขเธเธ”เนเธฒเธ security / privacy / เธเธฒเธฃเธเธถเนเธเธเธฒเธเธเน€เธ”เธตเธขเธง โ€” เน€เธฃเธตเธขเธเธ•เธฒเธกเธเธงเธฒเธกเธชเธณเธเธฑเธ
      </p>

      <div className={styles.stack} style={{ marginTop: 14 }}>
        {RISKS.map((r) => (
          <div className={styles.kv} key={r.issue}>
            <div>
              <b>
                <span className={`${styles.prio} ${r.priority === "critical" ? styles.prioCrit : r.priority === "high" ? styles.prioHigh : styles.prioMed}`}>
                  {r.priority}
                </span>{" "}
                {r.issue}
              </b>
              <span style={{ color: "#a1a1aa" }}>{r.response}</span>
              {r.note ? <span style={{ color: "#8e8e96" }}>{r.note}</span> : null}
            </div>
            <span
              className={`${styles.pill} ${
                r.status === "action needed"
                  ? styles.pillWarn
                  : r.status === "done"
                    ? styles.pillOn
                    : ""
              }`}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.hairline} style={{ marginTop: 16 }} />

      <div className={styles.cardHead} style={{ marginTop: 14 }}>
        <span className="ms">history</span>
        <h2>Audit log</h2>
        <span className={`${styles.pill} ${styles.pillOn}`}>live</span>
      </div>
      <p className={styles.cardSub}>เนเธเธฃเธ—เธณเธญเธฐเนเธฃเน€เธกเธทเนเธญเนเธซเธฃเน เธเธฅเน€เธเนเธเธญเธขเนเธฒเธเนเธฃ</p>

      {logs === null ? (
        <p className={styles.cardSub}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”โ€ฆ</p>
      ) : logs.length === 0 ? (
        <p className={styles.cardSub}>เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃ</p>
      ) : (
        <div className={styles.tableWrap} style={{ marginTop: 12 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>เน€เธกเธทเนเธญเนเธซเธฃเน</th>
                <th>เนเธเธฃ</th>
                <th>เธ—เธณเธญเธฐเนเธฃ</th>
                <th>เธเธฑเธ</th>
                <th>เธเธฅเธฅเธฑเธเธเน</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className={styles.cellMono}>{fmtTime(l.createdAt)}</td>
                  <td className={styles.cellMono}>{l.actorEmail}</td>
                  <td className={styles.cellMono}>{l.action}</td>
                  <td className={styles.cellMono}>{l.subjectRef ?? "โ€”"}</td>
                  <td>
                    <span className={`${styles.pill} ${l.result === "success" ? styles.pillOn : styles.pillWarn}`}>
                      {l.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.source}>
        Source ยท AuditLog (NeonDB) + เธเธฒเธฃเธเธฃเธฐเน€เธกเธดเธเธเธงเธฒเธกเน€เธชเธตเนเธขเธเธเธฃเธฐเธเธณเนเธเธฃเธเธเธฒเธฃ ยท เธ•เธฒเธฃเธฒเธเธเธตเนเธฃเธตเน€เธเธฃเธเน€เธกเธทเนเธญเน€เธเธดเธ”เธซเธเนเธฒ
      </p>
    </div>
  );
}