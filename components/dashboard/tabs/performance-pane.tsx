"use client";

import type { AnalyticsPayload } from "./types";
import type { Lang } from "@/lib/i18n";
import styles from "./tabs.module.css";

const fmt = (n: number) => n.toLocaleString("en-US");

function pct(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export function PerformancePane({ a, lang }: { a: AnalyticsPayload; lang: Lang }) {
  const sorted = [...a.perf].sort((x, y) => y.windowClicks - x.windowClicks);

  return (
    <div className={styles.pane}>
      <div className="panel" style={{ borderColor: "var(--line-pink)" }}>
        <div className="panel-head">
          <span className="ms">trending_up</span>
          <h2>{lang === "th" ? "ผลงานแต่ละลิงก์" : "Per-link performance"}</h2>
        </div>
        <p className={styles.paneSub}>
          {lang === "th"
            ? `เทียบยอดคลิก ${a.days} วันล่าสุด กับช่วงก่อนหน้า`
            : `Compare last ${a.days} days vs previous window`}
        </p>
        {sorted.length === 0 ? (
          <div className="empty">{lang === "th" ? "สร้างลิงก์แรกก่อน — มาดูกันว่าตัวไหนกินคลิก" : "Create a link to start measuring"}</div>
        ) : (
          <div className={styles.perfTable}>
            {sorted.map((l) => {
              const d = pct(l.windowClicks, l.prevClicks);
              const up = l.windowClicks > l.prevClicks;
              const flat = l.windowClicks === l.prevClicks;
              const trendLabel =
                l.prevClicks === 0 && l.windowClicks === 0
                  ? "—"
                  : l.prevClicks === 0
                    ? lang === "th" ? "ใหม่" : "new"
                    : `${d > 0 ? "+" : ""}${d}%`;
              return (
                <div className={styles.perfRow} key={l.id}>
                  <div className={styles.perfMain}>
                    <b>{l.title}</b>
                    <small>/{l.slug}</small>
                  </div>
                  <span className={styles.perfNum}>
                    {fmt(l.windowClicks)}
                    <small>{lang === "th" ? "รอบนี้" : "this"} (d)</small>
                  </span>
                  <span className={styles.perfNum}>
                    {fmt(l.prevClicks)}
                    <small>{lang === "th" ? "ก่อนหน้า" : "prev"}</small>
                  </span>
                  <span
                    className={`${styles.perfTrend} ${up ? styles.deltaUp : flat ? styles.deltaFlat : styles.deltaDown}`}
                  >
                    {up ? "▲" : flat ? "●" : "▼"} {trendLabel}
                  </span>
                  <span className={`status-pill ${l.status === "ACTIVE" ? "on" : "off"}`}>
                    {l.status === "ACTIVE"
                      ? lang === "th" ? "ใช้งาน" : "Active"
                      : lang === "th" ? "หยุด" : "Paused"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}