"use client";

import { useEffect, useState } from "react";
import styles from "@/app/dev/dev-console.module.css";

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
    issue: "ยืนยัน rotate/revoke credentials ที่เคยหลุด",
    response: "ตรวจว่า key เก่าถูก revoke จริง · ตรวจ logs · เก็บหลักฐาน",
    status: "action needed",
    note: "ครึ่งฝั่งแอปทำแล้ว (AUTH_SECRET rotate แล้ว) · ค้าง: purge cache, roll Neon, roll Stripe test keys",
  },
  {
    priority: "critical",
    issue: "ประเมินเหตุการณ์ข้อมูลส่วนบุคคลตาม PDPA",
    response: "breach assessment อย่างเป็นทางการ + ปรึกษาคนกฎหมายเรื่องหน้าที่แจ้งเหตุ",
    status: "action needed",
  },
  {
    priority: "high",
    issue: "DPA กับ sub-processors",
    response: "จัดทำ/ตรวจ Data Processing Agreement กับ Neon · Resend · Stripe · Cloudflare",
    status: "pending",
  },
  {
    priority: "high",
    issue: "แยก staging กับ production payment",
    response: "หลีกเลี่ยงทดสอบเงินจริงใน prod — ปัจจุบัน money path ผ่านด้วยมูลค่า ฿0 แล้ว",
    status: "partial",
  },
  {
    priority: "high",
    issue: "Privacy Policy / ToS / Refund Policy",
    response: "เผยแพร่ให้สอดคล้องกับการเปิดรับชำระเงินจริง",
    status: "pending",
  },
  {
    priority: "medium",
    issue: "ลด single-operator / bus factor",
    response: "second reviewer · runbook · least privilege · MFA",
    status: "pending",
  },
  {
    priority: "medium",
    issue: "Rotation policy",
    response: "รอบหมุน PIN / backup code / secrets + ทบทวนสิทธิ์ประจำรอบ",
    status: "pending",
    note: "AUTH_SECRET เคย rotate แล้ว 1 ครั้ง",
  },
  {
    priority: "medium",
    issue: "Auditability",
    response: "บันทึก who / what / when / result ของการเปลี่ยนแปลงสำคัญ",
    status: "doing",
    note: "audit log ทำงานแล้วสำหรับ link status change + full PII export",
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
        <h2>ความเสี่ยง & การเยียวยา</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>governance</span>
      </div>
      <p className={styles.cardSub}>
        จากการประเมินความเสี่ยงด้าน security / privacy / การพึ่งพาคนเดียว — เรียงตามความสำคัญ
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
      <p className={styles.cardSub}>ใครทำอะไรเมื่อไหร่ ผลเป็นอย่างไร</p>

      {logs === null ? (
        <p className={styles.cardSub}>กำลังโหลด…</p>
      ) : logs.length === 0 ? (
        <p className={styles.cardSub}>ยังไม่มีรายการ</p>
      ) : (
        <div className={styles.tableWrap} style={{ marginTop: 12 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>เมื่อไหร่</th>
                <th>ใคร</th>
                <th>ทำอะไร</th>
                <th>กับ</th>
                <th>ผลลัพธ์</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className={styles.cellMono}>{fmtTime(l.createdAt)}</td>
                  <td className={styles.cellMono}>{l.actorEmail}</td>
                  <td className={styles.cellMono}>{l.action}</td>
                  <td className={styles.cellMono}>{l.subjectRef ?? "—"}</td>
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
        Source · AuditLog (NeonDB) + การประเมินความเสี่ยงประจำโครงการ · ตารางนี้รีเฟรชเมื่อเปิดหน้า
      </p>
    </div>
  );
}