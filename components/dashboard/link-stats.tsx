"use client";

import { useEffect, useMemo, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

type Breakdown = { name: string; clicks: number };

type StatsData = {
  range: string;
  requested: string;
  limited: boolean;
  total: number;
  perDay: { date: string; clicks: number }[];
  byDevice: Breakdown[];
  byBrowser: Breakdown[];
  byOS: Breakdown[];
  byCountry: Breakdown[];
  topReferrers: Breakdown[];
};

const MAX_BARS = 31;

function bucketize(perDay: { date: string; clicks: number }[]) {
  if (perDay.length <= MAX_BARS) return perDay.map((p) => ({ ...p, span: 1 }));
  const size = Math.ceil(perDay.length / MAX_BARS);
  const out: { date: string; clicks: number; span: number }[] = [];
  for (let i = 0; i < perDay.length; i += size) {
    const chunk = perDay.slice(i, i + size);
    out.push({
      date: chunk[0]!.date,
      clicks: chunk.reduce((n, p) => n + p.clicks, 0),
      span: chunk.length,
    });
  }
  return out;
}

function BreakdownList({ title, rows, lang }: { title: string; rows: Breakdown[]; lang: Lang }) {
  const max = rows.reduce((m, r) => Math.max(m, r.clicks), 0);
  if (rows.length === 0) return null;
  return (
    <div className="breakdown">
      <h3>{title}</h3>
      <ul>
        {rows.slice(0, 8).map((r) => (
          <li key={r.name}>
            <span className="bname">{r.name}</span>
            <span className="bbar" aria-hidden>
              <i style={{ width: `${max ? Math.max(4, (r.clicks / max) * 100) : 0}%` }} />
            </span>
            <span className="bnum">{r.clicks.toLocaleString(lang === "th" ? "th-TH" : "en-US")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LinkStats({
  linkId,
  slug,
  lang,
  onClose,
}: {
  linkId: string;
  slug: string;
  lang: Lang;
  onClose: () => void;
}) {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/links/${linkId}/stats?range=${range}`)
      .then((res) => res.json().then((j) => ({ res, j })).catch(() => ({ res, j: null })))
      .then(({ res, j }) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(j?.error ?? t(lang, "lm.errGeneric"));
          return;
        }
        setData(j as StatsData);
      })
      .catch(() => {
        if (!cancelled) setError(t(lang, "lm.errGeneric"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linkId, range, lang]);

  const bars = useMemo(() => (data ? bucketize(data.perDay) : []), [data]);
  const maxBar = bars.reduce((m, b) => Math.max(m, b.clicks), 0);

  return (
    <div className="stats-panel" role="region" aria-label={`${t(lang, "st.title")} ${slug}`}>
      <div className="stats-head">
        <b>
          {t(lang, "st.title")} · /{slug}
        </b>
        <div className="stats-tools">
          <label className="range-label">
            {t(lang, "st.range")}
            <select value={range} onChange={(e) => setRange(e.target.value)} aria-label={t(lang, "st.range")}>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
            </select>
          </label>
          <a className="mini-btn" href={`/api/links/${linkId}/stats?range=${range}&format=csv`}>
            <span className="ms">download</span>
            {t(lang, "st.csv")}
          </a>
          <button type="button" className="mini-btn" onClick={onClose}>
            <span className="ms">close</span>
            {t(lang, "st.close")}
          </button>
        </div>
      </div>

      {loading ? <p className="panel-sub">{t(lang, "st.loading")}</p> : null}
      {error ? <div className="auth-error">{error}</div> : null}

      {data ? (
        <>
          {data.limited ? <div className="notice">{t(lang, "st.limited")}</div> : null}
          <div className="stats-total">
            <span>{t(lang, "st.total")}</span>
            <b>{data.total.toLocaleString(lang === "th" ? "th-TH" : "en-US")}</b>
          </div>
          <h3 className="chart-title">{t(lang, "st.daily")}</h3>
          {data.total === 0 ? (
            <p className="panel-sub">{t(lang, "st.noData")}</p>
          ) : (
            <div
              className="chart"
              role="img"
              aria-label={`${t(lang, "st.daily")}: ${data.total}`}
            >
              {bars.map((b) => (
                <div
                  key={b.date}
                  className="bar"
                  title={`${b.date}: ${b.clicks}`}
                  style={{ height: `${maxBar ? Math.max(3, (b.clicks / maxBar) * 100) : 0}%` }}
                />
              ))}
            </div>
          )}
          <div className="breakdowns">
            <BreakdownList title={t(lang, "st.device")} rows={data.byDevice} lang={lang} />
            <BreakdownList title={t(lang, "st.browser")} rows={data.byBrowser} lang={lang} />
            <BreakdownList title={t(lang, "st.os")} rows={data.byOS} lang={lang} />
            <BreakdownList title={t(lang, "st.country")} rows={data.byCountry} lang={lang} />
            <BreakdownList title={t(lang, "st.referrer")} rows={data.topReferrers} lang={lang} />
          </div>
        </>
      ) : null}
    </div>
  );
}
