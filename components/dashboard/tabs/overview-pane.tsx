"use client";

import type { AnalyticsPayload } from "./types";
import type { Lang } from "@/lib/i18n";
import styles from "./tabs.module.css";

const fmt = (n: number) => n.toLocaleString("en-US");

function pct(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export function OverviewPane({ a, lang }: { a: AnalyticsPayload; lang: Lang }) {
  const delta = pct(a.totalWindow, a.prevTotal);
  const deltaLabel =
    a.prevTotal === 0 && a.totalWindow === 0
      ? "—"
      : a.prevTotal === 0
        ? lang === "th" ? "เริ่มแล้ว" : "new"
        : `${delta > 0 ? "+" : ""}${delta}%`;
  const up = a.totalWindow > a.prevTotal;
  const flat = a.totalWindow === a.prevTotal;
  const spark = a.perDay.slice(-14);
  const peak = Math.max(1, ...spark.map((d) => d.clicks));

  const linkCount = a.perf.length;
  const activeCount = a.perf.filter((l) => l.status === "ACTIVE").length;

  return (
    <div className={styles.pane}>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>
            <span className="ms">bolt</span>
            {lang === "th" ? `คลิก (${a.days} วัน)` : `Clicks (${a.days}d)`}
          </span>
          <b className={styles.kpiVal}>{fmt(a.totalWindow)}</b>
          <span className={styles.kpiSub}>
            {lang === "th" ? "ช่วงที่แล้ว" : "Prev."} {fmt(a.prevTotal)}
          </span>
          <span className={`${styles.kpiDelta} ${up ? styles.deltaUp : flat ? styles.deltaFlat : styles.deltaDown}`}>
            <span className="ms">{up ? "trending_up" : flat ? "remove" : "trending_down"}</span>
            {deltaLabel}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>
            <span className="ms">all_inbox</span>
            {lang === "th" ? "คลิกรวม" : "All-time"}
          </span>
          <b className={styles.kpiVal}>{fmt(a.totalAllTime)}</b>
          <span className={styles.kpiSub}>{lang === "th" ? "ตั้งแต่สร้างบัญชี" : "since signup"}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>
            <span className="ms">link</span>
            {lang === "th" ? "ลิงก์" : "Links"}
          </span>
          <b className={styles.kpiVal}>{fmt(linkCount)}</b>
          <span className={styles.kpiSub}>
            {lang === "th" ? `ใช้งานอยู่ ${activeCount} ลิงก์` : `${activeCount} active`}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>
            <span className="ms">trending_up</span>
            {lang === "th" ? "บนสุดตอนนี้" : "Top now"}
          </span>
          <b className={styles.kpiVal} style={{ fontSize: 20 }}>
            {a.topLinks[0]?.title ?? "-"}
          </b>
          <span className={styles.kpiSub}>
            {fmt(a.topLinks[0]?.clicks ?? 0)} {lang === "th" ? "คลิก" : "clicks"}
          </span>
        </div>
      </div>

      <div className="panel" style={{ borderColor: "var(--line-pink)" }}>
        <div className="panel-head">
          <span className="ms">show_chart</span>
          <h2>{lang === "th" ? "ยอดคลิกรายวัน" : "Daily clicks"}</h2>
        </div>
        <p className={styles.paneSub}>
          {lang === "th" ? `14 วันล่าสุด (สูงสุด ${fmt(peak)} คลิก/วัน)` : `Last 14 days (peak ${fmt(peak)}/day)`}
        </p>
        <div className={styles.barsDay}>
          {spark.map((d) => {
            const h = Math.max(3, Math.round((d.clicks / peak) * 88));
            return (
              <div className={styles.barCol} key={d.date} title={`${d.date}: ${fmt(d.clicks)}`}>
                <i
                  className={`${styles.barFill}${d.clicks === 0 ? ` ${styles.barFillZero}` : ""}`}
                  style={d.clicks ? { height: `${h}px` } : undefined}
                />
                <span className={styles.barDay}>{d.date.slice(8, 10)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className="panel" style={{ borderColor: "var(--line-pink)" }}>
          <div className="panel-head">
            <span className="ms">leaderboard</span>
            <h2>{lang === "th" ? "ลิงก์ยอดนิยม" : "Top links"}</h2>
          </div>
          {a.topLinks.length === 0 ? (
            <div className="empty">{lang === "th" ? "ยังไม่มีคลิกในรอบนี้ — แชร์ลิงก์เร็วๆ นี้" : "No clicks in this window yet"}</div>
          ) : (
            <div className={styles.breakRows}>
              {a.topLinks.map((l) => {
                const max = a.topLinks[0]?.clicks ?? 1;
                return (
                  <div className={styles.breakRow} key={l.id}>
                    <span className={styles.breakName} title={l.title}>
                      {l.title}
                    </span>
                    <div className={styles.breakBar}>
                      <i
                        className={styles.breakFill}
                        style={{ width: `${Math.max(4, Math.round((l.clicks / max) * 100))}%` }}
                      />
                    </div>
                    <span className={styles.breakVal}>{fmt(l.clicks)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel" style={{ borderColor: "var(--line-pink)" }}>
          <div className="panel-head">
            <span className="ms">notifications_active</span>
            <h2>{lang === "th" ? "คลิกล่าสุด" : "Recent clicks"}</h2>
          </div>
          {a.recent.length === 0 ? (
            <div className="empty">{lang === "th" ? "รอคลิกแรกของคุณ" : "Waiting for your first click"}</div>
          ) : (
            <div className={styles.recentRows}>
              {a.recent.map((r, i) => (
                <div className={styles.recentRow} key={i}>
                  <div className="rt" style={{ flex: 1, minWidth: 0 }}>
                    <b>{r.title}</b>
                    <small>
                      {r.device ?? "?"}
                      {r.country ? ` · ${r.country.toUpperCase()}` : ""} ·{" "}
                      {new Date(r.at).toLocaleString(lang === "th" ? "th-TH" : "en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                  <span className={`${styles.tag} ${styles.tagNeutral}`}>{lang === "th" ? "คลิก" : "click"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}