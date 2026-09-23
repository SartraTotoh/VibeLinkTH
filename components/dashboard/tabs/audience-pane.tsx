"use client";

import type { AnalyticsPayload } from "./types";
import type { Lang } from "@/lib/i18n";
import styles from "./tabs.module.css";

const fmt = (n: number) => n.toLocaleString("en-US");

function list(name: string, data: { name: string; clicks: number }[], label: string) {
  return (
    <div className="panel" key={name} style={{ borderColor: "var(--line-pink)" }}>
      <div className="panel-head">
        <span className="ms">{name === "device" ? "devices" : name === "browser" ? "language" : name === "os" ? "memory" : name === "country" ? "public" : "play_circle"}</span>
        <h2>{label}</h2>
      </div>
      {data.length === 0 ? (
        <div className="empty">—</div>
      ) : (
        <div className={styles.breakRows}>
          {data.slice(0, 8).map((r) => {
            const max = data[0]?.clicks ?? 1;
            const pct = Math.round((r.clicks / data.reduce((s, x) => s + x.clicks, 0)) * 100);
            return (
              <div className={styles.breakRow} key={r.name}>
                <span className={styles.breakName}>{r.name}</span>
                <div className={styles.breakBar}>
                  <i
                    className={styles.breakFill}
                    style={{ width: `${Math.max(4, Math.round((r.clicks / max) * 100))}%` }}
                  />
                </div>
                <span className={styles.breakVal} title={`${pct}%`}>
                  {fmt(r.clicks)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AudiencePane({ a, lang }: { a: AnalyticsPayload; lang: Lang }) {
  return (
    <div className={styles.pane}>
      <p className={styles.paneSub}>
        {lang === "th"
          ? `ผู้ชมจากคลิก ${a.days} วันล่าสุด — device, เบราว์เซอร์, OS, ประเทศ และแหล่งอ้างอิง`
          : `Audience from clicks in the last ${a.days} days — device, browser, OS, country, referrer`}
      </p>
      <div className={styles.twoCol}>
        {list("device", a.byDevice, lang === "th" ? "อุปกรณ์" : "Device")}
        {list("browser", a.byBrowser, lang === "th" ? "เบราว์เซอร์" : "Browser")}
        {list("os", a.byOS, lang === "th" ? "ระบบปฏิบัติการ" : "OS")}
        {list("country", a.byCountry, lang === "th" ? "ประเทศ" : "Country")}
        {lang === "th"
          ? list("referrer", a.topReferrers, "แหล่งที่มา (Referrer)")
          : list("referrer", a.topReferrers, "Top referrers")}
      </div>
    </div>
  );
}