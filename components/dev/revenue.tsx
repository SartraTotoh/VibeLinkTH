"use client";

import { useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";
import type { Metrics } from "@/app/api/dev/metrics/route";

function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Spark({ values, w = 132, h = 30 }: { values: number[]; w?: number; h?: number }) {
  if (values.length < 2 || values.every((v) => v === 0)) {
    return <span className={styles.sparkEmpty}>—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 4 - ((v - min) / span) * (h - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className={styles.spark} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden focusable="false">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Trend({ deltaPct, isNew }: { deltaPct: number | null; isNew?: boolean }) {
  if (isNew) return <span className={`${styles.trend} ${styles.trendGood}`}>เพิ่มใน 30 วันนี้</span>;
  if (deltaPct == null) return <span className={styles.trendMuted}>— ยังไม่มีช่วงก่อนหน้า</span>;
  const up = deltaPct >= 0;
  return (
    <span className={up ? styles.trendGood : styles.trendBad}>
      {up ? "↑" : "↓"} {Math.abs(deltaPct).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%
    </span>
  );
}

export function RevenueModule({ fetchedAt }: { fetchedAt: string }) {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dev/metrics")
      .then((res) => res.json().then((j) => ({ res, j })).catch(() => ({ res, j: null })))
      .then(({ res, j }) => {
        if (res.ok && j) setM(j as Metrics);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className="ms">payments</span>
          <h2>Revenue Performance</h2>
        </div>
        <p className={styles.cardSub}>กำลังโหลด…</p>
      </div>
    );
  }

  if (!m) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className="ms">payments</span>
          <h2>Revenue Performance</h2>
        </div>
        <p className={styles.confirmNote} style={{ marginTop: 8 }}>
          <span className="ms" aria-hidden>error_outline</span>
          โหลดข้อมูลไม่สำเร็จ — ตรวจ connection แล้วลองใหม่
        </p>
      </div>
    );
  }

  const k = m.kpis;
  const f = m.funnel;
  const insights: { tone: "warn" | "good" | "info"; icon: string; title: string; body: string; action?: string; zone?: string }[] = [];

  if (f.views === 0 && f.clicks === 0) {
    insights.push({
      tone: "info",
      icon: "radar",
      title: "ยังไม่มีข้อมูลการเข้าชม",
      body: "View / Click ตัวเลขจะเริ่มขยับเมื่อมีผู้ใช้จริงเข้าลิงก์",
      action: "เปิด Links →",
      zone: "zone-reference",
    });
  }
  if (f.views === 0 && f.clicks > 0) {
    insights.push({
      tone: "warn",
      icon: "radar",
      title: "Tracking Gap",
      body: "มี Click/Purchase แล้ว แต่ View/Unique ยังไม่ถูกเก็บ — ยังวัด Conversion เต็ม funnel ไม่ได้",
      action: "เปิด Support →",
      zone: "zone-act",
    });
  }
  if (f.convClickPurchase != null && f.purchases > 0) {
    insights.push({
      tone: f.convClickPurchase >= 75 ? "good" : "info",
      icon: "trending_up",
      title: `Click → Purchase = ${f.convClickPurchase}%`,
      body:
        f.convClickPurchase >= 100
          ? "ทุกคลิกที่ตามได้กลายเป็นการซื้อ — ยังต้องการ Traffic เพิ่มเพื่อยืนยัน"
          : "มี Purchase เกิดขึ้นจริง แนะนำติดตาม View เพื่อปิดช่องโหว่ของ Conversion",
      action: "เปิด Analytics →",
      zone: "zone-reference",
    });
  }
  if (f.clicks > f.purchases && f.convClickPurchase != null && f.convClickPurchase < 100) {
    insights.push({
      tone: "warn",
      icon: "trending_down",
      title: "จุดรั่วหลัง Click",
      body: `${f.clicks} คลิก → ${f.purchases} การซื้อ (${f.convClickPurchase}%) — เช็คหน้า destination ว่าชำระสำเร็จไหม`,
    });
  }

  const openZone = (zone: string) => {
    window.dispatchEvent(new CustomEvent("vl:openzone", { detail: zone }));
  };

  return (
    <div className={styles.rev}>
      <header className={styles.revHead}>
        <h2>Revenue Performance</h2>
        <span className={styles.revPeriod}>
          <span className="ms" aria-hidden>calendar_today</span> Last {m.periodDays} Days
        </span>
      </header>

      <div className={styles.revKpis}>
        <div className={styles.revKpi}>
          <small>MRR · รายเดือน</small>
          <b>฿{fmtMoney(k.mrr)}</b>
          <span className={styles.revTrendRow}>
            <Trend deltaPct={k.mrrDeltaPct} isNew={k.mrrIsNew} />
          </span>
          <Spark values={m.series.map((d) => d.mrr)} />
        </div>
        <div className={styles.revKpi}>
          <small>Paid Users</small>
          <b>{k.paidUsers.toLocaleString("th-TH")}</b>
          <span className={styles.revTrendRow}>
            {k.paidDelta > 0 ? (
              <span className={styles.trendGood}>+{k.paidDelta} เพิ่มใน 30 วันนี้</span>
            ) : (
              <span className={styles.trendMuted}>{k.paidUsers > 0 ? "ไม่มีเพิ่มใน 30 วัน" : "ยังไม่มีผู้จ่าย"}</span>
            )}
          </span>
          <Spark values={m.series.map((d) => d.mrr)} />
        </div>
        <div className={styles.revKpi}>
          <small>ARPU</small>
          <b>฿{fmtMoney(k.arpu)}</b>
          <span className={styles.revTrendRow}>
            <Trend deltaPct={k.arpuDeltaPct} />
          </span>
          <Spark values={m.series.map((d) => d.mrr)} />
        </div>
      </div>

      <div className={styles.revGrid} style={{ marginTop: 22 }}>
        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Revenue Funnel</h3>
          <div className={styles.funnelRow}>
            <div className={styles.fstep}>
              <b>View</b>
              <strong>{f.views.toLocaleString("th-TH")}</strong>
              <small>{f.uniqueViews.toLocaleString("th-TH")} unique</small>
            </div>
            <div className={styles.fconn}>
              <span className={styles.farrow}>→</span>
              <small>{f.convViewClick != null ? `${f.convViewClick}%` : "—"}</small>
            </div>
            <div className={styles.fstep}>
              <b>Click</b>
              <strong>{f.clicks.toLocaleString("th-TH")}</strong>
              <small>ช่องทางเข้าลิงก์</small>
            </div>
            <div className={styles.fconn}>
              <span className={styles.farrow}>→</span>
              <small>{f.convClickPurchase != null ? `${f.convClickPurchase}%` : "—"}</small>
            </div>
            <div className={styles.fstep}>
              <b>Purchase</b>
              <strong>{f.purchases.toLocaleString("th-TH")}</strong>
              <small>แพ็กเกจ ACTIVE</small>
            </div>
          </div>
          <p className={styles.revNote}>
            Funnel สะสมทั้งหมด · อัปเดต {fetchedAt}
          </p>
        </section>

        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Key Insights</h3>
          <ul className={styles.insights}>
            {insights.length === 0 ? (
              <li className={styles.insight} data-tone="good">
                <span className={styles.insightIcon} aria-hidden>
                  <span className="ms">check_circle</span>
                </span>
                <span className={styles.insightBody}>
                  <b>ไม่มีจุดติดขัด</b>
                  <small>ทุกสถานะอยู่ในเกณฑ์ที่คาดไว้</small>
                </span>
              </li>
            ) : (
              insights.map((ins, i) => (
                <li key={i} className={styles.insight} data-tone={ins.tone}>
                  <span className={styles.insightIcon} aria-hidden>
                    <span className="ms">{ins.icon}</span>
                  </span>
                  <span className={styles.insightBody}>
                    <b>{ins.title}</b>
                    <small>{ins.body}</small>
                    {ins.action && ins.zone ? (
                      <button
                        type="button"
                        className={styles.insightAction}
                        onClick={() => openZone(ins.zone!)}
                      >
                        {ins.action} <span className="ms" aria-hidden>arrow_forward</span>
                      </button>
                    ) : null}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className={styles.revGrid} style={{ marginTop: 22 }}>
        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Plan Mix</h3>
          <ul className={styles.bars}>
            {m.planMix.map((p) => (
              <li key={p.plan} className={styles.barRow}>
                <span className={styles.barName}>{p.label}</span>
                <span className={styles.barTrack} aria-hidden>
                  <i style={{ width: `${Math.max(2, p.count > 0 ? (p.count / Math.max(1, ...m.planMix.map((x) => x.count))) * 100 : 0)}%` }} />
                </span>
                <span className={styles.barNum}>{p.count.toLocaleString("th-TH")}</span>
              </li>
            ))}
          </ul>
          <p className={styles.revNote}>
            {m.totalUsers.toLocaleString("th-TH")} users ทั้งหมด ·{" "}
            {k.paidUsers > 0
              ? `${Math.round((k.paidUsers / m.totalUsers) * 100).toLocaleString("th-TH", { maximumFractionDigits: 0 })}% จ่ายเงิน (${k.paidUsers} ใน ${m.totalUsers})`
              : "ยังไม่มีผู้จ่ายเงิน"}
          </p>
        </section>

        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Revenue Mix</h3>
          <ul className={styles.bars}>
            {m.revenueMix.length === 0 ? (
              <li className={styles.revNote} style={{ margin: "0 0 8px" }}>ยังไม่มีรายได้แยกตามแพ็กเกจ</li>
            ) : (
              m.revenueMix.map((p) => (
                <li key={p.plan} className={styles.barRow}>
                  <span className={styles.barName}>{p.label}</span>
                  <span className={styles.barTrack} aria-hidden>
                    <i style={{ width: `${Math.max(2, p.pct)}%` }} />
                  </span>
                  <span className={styles.barNum}>฿{fmtMoney(p.amount)}</span>
                </li>
              ))
            )}
          </ul>
          <p className={styles.revNote}>
            MRR ฿{fmtMoney(k.mrr)}/เดือน · Creator × ฿199 ต่อผู้จ่าย · Plus ยังไม่ตั้งราคา
          </p>
        </section>
      </div>

      <div className={styles.revGrid} style={{ marginTop: 22 }}>
        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Revenue Sources</h3>
          <ul className={styles.kvList}>
            {m.revenueMix.length === 0 ? (
              <li className={styles.revNote}>ยังไม่มีแพ็กเกจที่ขายได้</li>
            ) : (
              m.revenueMix.map((p) => (
                <li key={p.plan} className={styles.kvRow}>
                  <span>{p.label}</span>
                  <b>฿{fmtMoney(p.amount)}</b>
                </li>
              ))
            )}
            <li className={styles.kvRow}>
              <span>รวมต่อเดือน</span>
              <b>฿{fmtMoney(k.mrr)}</b>
            </li>
          </ul>
        </section>

        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Retention</h3>
          <div className={styles.retGrid}>
            <div className={styles.retBlock}>
              <b>{m.retention.d7.pct != null ? `${m.retention.d7.pct}%` : "—"}</b>
              <small>D7</small>
              <span>{m.retention.d7.total > 0 ? `${m.retention.d7.active} ใน ${m.retention.d7.total} กลับมา` : "Not enough data"}</span>
            </div>
            <div className={styles.retBlock}>
              <b>{m.retention.d30.pct != null ? `${m.retention.d30.pct}%` : "—"}</b>
              <small>D30</small>
              <span>{m.retention.d30.total > 0 ? `${m.retention.d30.active} ใน ${m.retention.d30.total} กลับมา` : "Not enough data"}</span>
            </div>
          </div>
          <p className={styles.revNote}>cohort ตามอายุบัญชี · ยังไม่มี cohort ครบเกณฑ์จนกว่ามีผู้ใช้เกิน 7/30 วัน</p>
        </section>
      </div>

      <p className={styles.source}>
        Source · NeonDB ผ่าน /api/dev/metrics (ข้อมูลจริงเท่านั้น) · ราคา CREATOR ฿199 (lib/funnel PLAN_MRR) ·{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> โหลดแล้ว {fetchedAt}
        </span>
      </p>
    </div>
  );
}