"use client";

import { useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";
import type { Metrics } from "@/app/api/dev/metrics/route";

function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Spark({ values, w = 132, h = 30 }: { values: number[]; w?: number; h?: number }) {
  if (values.length < 2 || values.every((v) => v === 0)) {
    return <span className={styles.sparkEmpty}>โ€”</span>;
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
  if (isNew) return <span className={`${styles.trend} ${styles.trendGood}`}>เน€เธเธดเนเธกเนเธ 30 เธงเธฑเธเธเธตเน</span>;
  if (deltaPct == null) return <span className={styles.trendMuted}>โ€” เธขเธฑเธเนเธกเนเธกเธตเธเนเธงเธเธเนเธญเธเธซเธเนเธฒ</span>;
  const up = deltaPct >= 0;
  return (
    <span className={up ? styles.trendGood : styles.trendBad}>
      {up ? "โ‘" : "โ“"} {Math.abs(deltaPct).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%
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
        <p className={styles.cardSub}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”โ€ฆ</p>
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
          เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ โ€” เธ•เธฃเธงเธ connection เนเธฅเนเธงเธฅเธญเธเนเธซเธกเน
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
      title: "เธขเธฑเธเนเธกเนเธกเธตเธเนเธญเธกเธนเธฅเธเธฒเธฃเน€เธเนเธฒเธเธก",
      body: "View / Click เธ•เธฑเธงเน€เธฅเธเธเธฐเน€เธฃเธดเนเธกเธเธขเธฑเธเน€เธกเธทเนเธญเธกเธตเธเธนเนเนเธเนเธเธฃเธดเธเน€เธเนเธฒเธฅเธดเธเธเน",
      action: "เน€เธเธดเธ” Links โ’",
      zone: "zone-reference",
    });
  }
  if (f.views === 0 && f.clicks > 0) {
    insights.push({
      tone: "warn",
      icon: "radar",
      title: "Tracking Gap",
      body: "เธกเธต Click/Purchase เนเธฅเนเธง เนเธ•เน View/Unique เธขเธฑเธเนเธกเนเธ–เธนเธเน€เธเนเธ โ€” เธขเธฑเธเธงเธฑเธ” Conversion เน€เธ•เนเธก funnel เนเธกเนเนเธ”เน",
      action: "เน€เธเธดเธ” Support โ’",
      zone: "zone-act",
    });
  }
  if (f.convClickPurchase != null && f.purchases > 0) {
    insights.push({
      tone: f.convClickPurchase >= 75 ? "good" : "info",
      icon: "trending_up",
      title: `Click โ’ Purchase = ${f.convClickPurchase}%`,
      body:
        f.convClickPurchase >= 100
          ? "เธ—เธธเธเธเธฅเธดเธเธ—เธตเนเธ•เธฒเธกเนเธ”เนเธเธฅเธฒเธขเน€เธเนเธเธเธฒเธฃเธเธทเนเธญ โ€” เธขเธฑเธเธ•เนเธญเธเธเธฒเธฃ Traffic เน€เธเธดเนเธกเน€เธเธทเนเธญเธขเธทเธเธขเธฑเธ"
          : "เธกเธต Purchase เน€เธเธดเธ”เธเธถเนเธเธเธฃเธดเธ เนเธเธฐเธเธณเธ•เธดเธ”เธ•เธฒเธก View เน€เธเธทเนเธญเธเธดเธ”เธเนเธญเธเนเธซเธงเนเธเธญเธ Conversion",
      action: "เน€เธเธดเธ” Analytics โ’",
      zone: "zone-reference",
    });
  }
  if (f.clicks > f.purchases && f.convClickPurchase != null && f.convClickPurchase < 100) {
    insights.push({
      tone: "warn",
      icon: "trending_down",
      title: "เธเธธเธ”เธฃเธฑเนเธงเธซเธฅเธฑเธ Click",
      body: `${f.clicks} เธเธฅเธดเธ โ’ ${f.purchases} เธเธฒเธฃเธเธทเนเธญ (${f.convClickPurchase}%) โ€” เน€เธเนเธเธซเธเนเธฒ destination เธงเนเธฒเธเธณเธฃเธฐเธชเธณเน€เธฃเนเธเนเธซเธก`,
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
          <small>MRR ยท เธฃเธฒเธขเน€เธ”เธทเธญเธ</small>
          <b>เธฟ{fmtMoney(k.mrr)}</b>
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
              <span className={styles.trendGood}>+{k.paidDelta} เน€เธเธดเนเธกเนเธ 30 เธงเธฑเธเธเธตเน</span>
            ) : (
              <span className={styles.trendMuted}>{k.paidUsers > 0 ? "เนเธกเนเธกเธตเน€เธเธดเนเธกเนเธ 30 เธงเธฑเธ" : "เธขเธฑเธเนเธกเนเธกเธตเธเธนเนเธเนเธฒเธข"}</span>
            )}
          </span>
          <Spark values={m.series.map((d) => d.mrr)} />
        </div>
        <div className={styles.revKpi}>
          <small>ARPU</small>
          <b>เธฟ{fmtMoney(k.arpu)}</b>
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
              <span className={styles.farrow}>โ’</span>
              <small>{f.convViewClick != null ? `${f.convViewClick}%` : "โ€”"}</small>
            </div>
            <div className={styles.fstep}>
              <b>Click</b>
              <strong>{f.clicks.toLocaleString("th-TH")}</strong>
              <small>เธเนเธญเธเธ—เธฒเธเน€เธเนเธฒเธฅเธดเธเธเน</small>
            </div>
            <div className={styles.fconn}>
              <span className={styles.farrow}>โ’</span>
              <small>{f.convClickPurchase != null ? `${f.convClickPurchase}%` : "โ€”"}</small>
            </div>
            <div className={styles.fstep}>
              <b>Purchase</b>
              <strong>{f.purchases.toLocaleString("th-TH")}</strong>
              <small>เนเธเนเธเน€เธเธ ACTIVE</small>
            </div>
          </div>
          <p className={styles.revNote}>
            Funnel เธชเธฐเธชเธกเธ—เธฑเนเธเธซเธกเธ” ยท เธญเธฑเธเน€เธ”เธ• {fetchedAt}
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
                  <b>เนเธกเนเธกเธตเธเธธเธ”เธ•เธดเธ”เธเธฑเธ”</b>
                  <small>เธ—เธธเธเธชเธ–เธฒเธเธฐเธญเธขเธนเนเนเธเน€เธเธ“เธ‘เนเธ—เธตเนเธเธฒเธ”เนเธงเน</small>
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
            {m.totalUsers.toLocaleString("th-TH")} users เธ—เธฑเนเธเธซเธกเธ” ยท{" "}
            {k.paidUsers > 0
              ? `${Math.round((k.paidUsers / m.totalUsers) * 100).toLocaleString("th-TH", { maximumFractionDigits: 0 })}% เธเนเธฒเธขเน€เธเธดเธ (${k.paidUsers} เนเธ ${m.totalUsers})`
              : "เธขเธฑเธเนเธกเนเธกเธตเธเธนเนเธเนเธฒเธขเน€เธเธดเธ"}
          </p>
        </section>

        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Revenue Mix</h3>
          <ul className={styles.bars}>
            {m.revenueMix.length === 0 ? (
              <li className={styles.revNote} style={{ margin: "0 0 8px" }}>เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเนเธ”เนเนเธขเธเธ•เธฒเธกเนเธเนเธเน€เธเธ</li>
            ) : (
              m.revenueMix.map((p) => (
                <li key={p.plan} className={styles.barRow}>
                  <span className={styles.barName}>{p.label}</span>
                  <span className={styles.barTrack} aria-hidden>
                    <i style={{ width: `${Math.max(2, p.pct)}%` }} />
                  </span>
                  <span className={styles.barNum}>เธฟ{fmtMoney(p.amount)}</span>
                </li>
              ))
            )}
          </ul>
          <p className={styles.revNote}>
            MRR เธฟ{fmtMoney(k.mrr)}/เน€เธ”เธทเธญเธ ยท Creator ร— เธฟ199 เธ•เนเธญเธเธนเนเธเนเธฒเธข ยท Plus เธขเธฑเธเนเธกเนเธ•เธฑเนเธเธฃเธฒเธเธฒ
          </p>
        </section>
      </div>

      <div className={styles.revGrid} style={{ marginTop: 22 }}>
        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Revenue Sources</h3>
          <ul className={styles.kvList}>
            {m.revenueMix.length === 0 ? (
              <li className={styles.revNote}>เธขเธฑเธเนเธกเนเธกเธตเนเธเนเธเน€เธเธเธ—เธตเนเธเธฒเธขเนเธ”เน</li>
            ) : (
              m.revenueMix.map((p) => (
                <li key={p.plan} className={styles.kvRow}>
                  <span>{p.label}</span>
                  <b>เธฟ{fmtMoney(p.amount)}</b>
                </li>
              ))
            )}
            <li className={styles.kvRow}>
              <span>เธฃเธงเธกเธ•เนเธญเน€เธ”เธทเธญเธ</span>
              <b>เธฟ{fmtMoney(k.mrr)}</b>
            </li>
          </ul>
        </section>

        <section className={styles.revCol}>
          <h3 className={styles.secLabel}>Retention</h3>
          <div className={styles.retGrid}>
            <div className={styles.retBlock}>
              <b>{m.retention.d7.pct != null ? `${m.retention.d7.pct}%` : "โ€”"}</b>
              <small>D7</small>
              <span>{m.retention.d7.total > 0 ? `${m.retention.d7.active} เนเธ ${m.retention.d7.total} เธเธฅเธฑเธเธกเธฒ` : "Not enough data"}</span>
            </div>
            <div className={styles.retBlock}>
              <b>{m.retention.d30.pct != null ? `${m.retention.d30.pct}%` : "โ€”"}</b>
              <small>D30</small>
              <span>{m.retention.d30.total > 0 ? `${m.retention.d30.active} เนเธ ${m.retention.d30.total} เธเธฅเธฑเธเธกเธฒ` : "Not enough data"}</span>
            </div>
          </div>
          <p className={styles.revNote}>cohort เธ•เธฒเธกเธญเธฒเธขเธธเธเธฑเธเธเธต ยท เธขเธฑเธเนเธกเนเธกเธต cohort เธเธฃเธเน€เธเธ“เธ‘เนเธเธเธเธงเนเธฒเธกเธตเธเธนเนเนเธเนเน€เธเธดเธ 7/30 เธงเธฑเธ</p>
        </section>
      </div>

      <p className={styles.source}>
        Source ยท NeonDB เธเนเธฒเธ /api/dev/metrics (เธเนเธญเธกเธนเธฅเธเธฃเธดเธเน€เธ—เนเธฒเธเธฑเนเธ) ยท เธฃเธฒเธเธฒ CREATOR เธฟ199 (lib/funnel PLAN_MRR) ยท{" "}
        <span className={styles.fresh}>
          <span className="ms" aria-hidden>schedule</span> เนเธซเธฅเธ”เนเธฅเนเธง {fetchedAt}
        </span>
      </p>
    </div>
  );
}