"use client";

import { useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

type SecEvent = {
  id: string;
  actorEmail: string;
  action: string;
  subjectRef: string | null;
  detail: string | null;
  result: string;
  createdAt: string;
};

type SecFeed = {
  events: SecEvent[];
  last24h: number;
  topIps: { ip: string; count: number }[];
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

export function SecurityFeedModule() {
  const [feed, setFeed] = useState<SecFeed | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/dev/security")
        .then((r) => (r.ok ? r.json() : { events: [], last24h: 0, topIps: [] }))
        .then((j) => {
          if (alive) setFeed(j);
        })
        .catch(() => alive && setFeed({ events: [], last24h: 0, topIps: [] }));
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const hits = feed?.last24h ?? 0;
  const bad = hits > 0;
  const masked = (ip: string) => (ip ? `${ip.slice(0, Math.min(ip.length, 12))}…` : "?");

  return (
    <div className={`${styles.card} ${bad ? styles.cardWarn : ""}`} id="mod-security-sentinel">
      <div className={styles.cardHead}>
        <span className="ms">{bad ? "shield" : "verified_user"}</span>
        <h2>Security Sentinel — เหตุการณ์ต้องสงสัย</h2>
        {hits > 0 ? (
          <span className={`${styles.pill} ${styles.pillWarn}`}>{hits} / 24 ชม.</span>
        ) : (
          <span className={`${styles.pill} ${styles.pillOn}`}>0 เหตุการณ์</span>
        )}
      </div>
      <p className={styles.cardSub}>
        {bad
          ? `พบ ${hits} เหตุการณ์ถูกบล็อก (พยายามเข้าคอนโซล/ไฟล์ลับ) ใน 24 ชม. — ดูรายละเอียดด้านล่าง`
          : "ไม่มีเหตุการณ์ความปลอดภัยใน 24 ชม. ที่ผ่านมา — middleware กันเส้นทางไฟล์ลับทำงานปกติ"}
      </p>

      {feed && bad ? (
        <>
          <div className={styles.stack} style={{ marginTop: 12 }}>
            {feed.topIps.map((t, i) => (
              <div className={styles.kv} key={t.ip}>
                <div>
                  <b>{i === 0 ? "ต้นทางหลัก" : `แหล่ง ${i + 1}`}</b>
                  <span style={{ color: "#a1a1aa" }}>
                    IP {masked(t.ip)} · พยายาม {t.count} ครั้งใน 24 ชม.
                  </span>
                </div>
                <span className={`${styles.pill} ${styles.pillWarn}`}>{t.count}x</span>
              </div>
            ))}
          </div>

          <div className={styles.hairline} style={{ marginTop: 14 }} />

          <div className={styles.tableWrap} style={{ marginTop: 12 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>เมื่อไหร่</th>
                  <th>เส้นทาง</th>
                  <th>เหตุผล</th>
                  <th>ผล</th>
                </tr>
              </thead>
              <tbody>
                {feed.events.slice(0, 12).map((e) => (
                  <tr key={e.id}>
                    <td className={styles.cellMono}>{fmtTime(e.createdAt)}</td>
                    <td className={styles.cellMono}>{e.subjectRef ?? "—"}</td>
                    <td className={styles.cellMono}>{e.detail ?? ""}</td>
                    <td>
                      <span className={`${styles.pill} ${e.result === "blocked" ? styles.pillWarn : styles.pillOn}`}>
                        {e.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.source}>
            Edge block (404) ไม่เขียน log (ไม่มี DB ที่ edge) — ข้อมูลนี้มาจากการถูกปฏิเสธในระดับ server
            (dev API / export) บันทึกเข้า AuditLog · รีเฟรชทุก 60 วิ
          </p>
        </>
      ) : feed ? (
        <p className={styles.source}>Edge 404 กัน path ต้องห้าม (`.env*` `.git` `.ssh` admin-panel) · ไม่มี log ที่ edge</p>
      ) : (
        <p className={styles.cardSub}>กำลังโหลด…</p>
      )}
    </div>
  );
}