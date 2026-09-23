"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";
import type { CrmUser } from "@/lib/mock-users";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtNum(n: number) {
  return n.toLocaleString("th-TH");
}

type Overview = {
  totalUsers: number;
  verified: number;
  new7d: number;
  new30d: number;
} | null;

const PAGE_SIZES = [10, 50, 100];

export function UsersCrm({ fetchedAt }: { fetchedAt?: string } = {}) {
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<Overview>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  const load = useCallback(async (qq: string, pp: string, pg: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dev/users/list?q=${encodeURIComponent(qq)}&plan=${pp}&page=${pg}&pageSize=${ps}`,
      );
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setError(j?.error ?? "เนเธซเธฅเธ”เนเธกเนเธชเธณเน€เธฃเนเธ");
        return;
      }
      setUsers(j.users ?? []);
      setTotal(j.total ?? 0);
      setOverview(
        j.overview
          ? {
              totalUsers: j.overview.totalUsers ?? 0,
              verified: j.overview.verified ?? 0,
              new7d: j.overview.new7d ?? 0,
              new30d: j.overview.new30d ?? 0,
            }
          : null,
      );
    } catch {
      setError("เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("", "ALL", 1, 10);
  }, [load]);

  function search(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(q, plan, 1, pageSize);
  }

  function changePlan(p: string) {
    setPlan(p);
    setPage(1);
    load(q, p, 1, pageSize);
  }

  function changePage(pg: number) {
    setPage(pg);
    load(q, plan, pg, pageSize);
  }

  function changePageSize(ps: number) {
    setPageSize(ps);
    setPage(1);
    load(q, plan, 1, ps);
  }

  async function exportFull(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    setPinBusy(true);
    try {
      const res = await fetch("/api/dev/users/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPinError(data?.error ?? "เธ—เธณเธฃเธฒเธขเธเธฒเธฃเนเธกเนเธชเธณเน€เธฃเนเธ");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vibelink-users-full.json";
      a.click();
      URL.revokeObjectURL(a.href);
      setPin("");
      setPinOpen(false);
    } catch {
      setPinError("เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”");
    } finally {
      setPinBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {overview ? (
        <div className={styles.chips} style={{ marginBottom: 12 }} aria-label="เธ เธฒเธเธฃเธงเธกเธฅเธนเธเธเนเธฒ">
          <span className={styles.chip}>
            <span className="ms" aria-hidden>group</span>
            <small>เธ—เธฑเนเธเธซเธกเธ”</small>
            <b>{fmtNum(overview.totalUsers)}</b>
          </span>
          <span className={styles.chip}>
            <span className="ms" aria-hidden>verified</span>
            <small>เธขเธทเธเธขเธฑเธเนเธฅเนเธง</small>
            <b>{fmtNum(overview.verified)}</b>
          </span>
          <span className={styles.chip}>
            <span className="ms" aria-hidden>person_add</span>
            <small>เนเธซเธกเน 7 เธงเธฑเธ</small>
            <b>{fmtNum(overview.new7d)}</b>
          </span>
          <span className={styles.chip}>
            <span className="ms" aria-hidden>calendar_month</span>
            <small>เนเธซเธกเน 30 เธงเธฑเธ</small>
            <b>{fmtNum(overview.new30d)}</b>
          </span>
        </div>
      ) : null}

      <form onSubmit={search} className={styles.filterBar} style={{ marginTop: 0 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="เธเนเธเธซเธฒเธญเธตเน€เธกเธฅ / เธเธทเนเธญโ€ฆ"
          aria-label="เธเนเธเธซเธฒเธเธนเนเนเธเน"
        />
        <select value={plan} onChange={(e) => changePlan(e.target.value)} aria-label="เธเธฃเธญเธเนเธเนเธเน€เธเธ">
          <option value="ALL">เธ—เธธเธเนเธเนเธเน€เธเธ</option>
          <option value="FREE">Free</option>
          <option value="CREATOR">Creator</option>
          <option value="CREATOR_PLUS">Plus</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => changePageSize(Number(e.target.value))}
          aria-label="เธเธณเธเธงเธเธ•เนเธญเธซเธเนเธฒ"
        >
          {PAGE_SIZES.map((ps) => (
            <option key={ps} value={ps}>
              {ps}/เธซเธเนเธฒ
            </option>
          ))}
        </select>
        <button type="submit" className={styles.ghostBtn} style={{ width: "auto", padding: "0 16px", height: 38 }} aria-label="เธเนเธเธซเธฒ">
          <span className="ms">search</span>
        </button>
        <button
          type="button"
          className={styles.ghostBtn}
          style={{ width: "auto", padding: "0 16px", height: 38 }}
          onClick={() => {
            setPinError(null);
            setPinOpen(true);
          }}
        >
          <span className="ms">lock</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Export เน€เธ•เนเธก (PIN)</span>
        </button>
      </form>
      <p className={styles.cardSub} style={{ margin: "0 0 12px" }}>
        เธญเธตเน€เธกเธฅเธ–เธนเธเธเนเธญเธเน€เธเธทเนเธญเธเนเธญเธเธเธฑเธ PDPA ยท เธเนเธญเธกเธนเธฅเธเธฃเธดเธเธเธฃเธเน€เธเธเธฒเธฐเนเธเนเธเธฅเน export เธเธถเนเธเธ•เนเธญเธเนเธเน PIN 6 เธซเธฅเธฑเธ
      </p>

      {pinOpen ? (
        <div className={styles.kv} style={{ borderColor: "rgba(185,255,44,.3)" }}>
          <form onSubmit={exportFull} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%" }}>
            <b style={{ fontSize: 13 }}>เธเธฃเธญเธ PIN 6 เธซเธฅเธฑเธเน€เธเธทเนเธญเธ”เธฒเธงเธเนเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเน€เธ•เนเธก</b>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="โ€ขโ€ขโ€ขโ€ขโ€ขโ€ข"
              inputMode="numeric"
              autoComplete="off"
              required
              style={{
                width: 130,
                padding: "9px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(0,0,0,.5)",
                color: "#fff",
                fontSize: 15,
                letterSpacing: 4,
                textAlign: "center",
              }}
            />
            <button type="submit" className={styles.ghostBtn} style={{ width: "auto", padding: "0 16px", height: 38 }} disabled={pinBusy || pin.length !== 6}>
              <span className="ms">download</span>
            </button>
            <button type="button" className={styles.ghostBtn} style={{ width: "auto", padding: "0 14px", height: 38 }} onClick={() => setPinOpen(false)}>
              <span className="ms">close</span>
            </button>
            {pinError ? <span style={{ color: "#ff9b9b", fontSize: 12 }}>{pinError}</span> : null}
          </form>
        </div>
      ) : null}

      {loading ? <p className={styles.cardSub}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”โ€ฆ</p> : null}
      {error ? <p style={{ color: "#ff9b9b", fontSize: 13 }}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>เธเธนเนเนเธเน</th>
                  <th>เนเธเธ</th>
                  <th>เธขเธทเธเธขเธฑเธ</th>
                  <th>เธฅเธดเธเธเน</th>
                  <th>เธเธฅเธดเธ</th>
                  <th>เธชเธกเธฑเธเธฃ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <Fragment key={u.id}>
                    <tr
                      onClick={() => setOpenId(openId === u.id ? null : u.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <span className={styles.cellMono}>{u.email}</span>
                        {u.displayName ? <div style={{ fontSize: 11, color: "#8e8e96" }}>{u.displayName}</div> : null}
                      </td>
                      <td>{u.plan}</td>
                      <td>{u.emailVerified ? "โ“" : "โ€”"}</td>
                      <td>{u.linkCount}</td>
                      <td>{fmtNum(u.clickCount)}</td>
                      <td>{fmtDate(u.createdAt)}</td>
                    </tr>
                    {openId === u.id ? (
                      <tr>
                        <td colSpan={6} style={{ color: "#a1a1aa", fontSize: 12 }}>
                          id: <span className={styles.cellMono}>{u.id}</span> ยท เธชเธกเธฒเธเธดเธ:{" "}
                          {u.subscription ? `${u.subscription.plan} (${u.subscription.status})` : "โ€”"} ยท
                          เธขเธทเธเธขเธฑเธเน€เธกเธทเนเธญ: {u.emailVerified ? fmtDate(u.emailVerified) : "โ€”"}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#71717a" }}>เนเธกเนเธเธเธเนเธญเธกเธนเธฅ</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className={styles.pager}>
            <span>
              เธ—เธฑเนเธเธซเธกเธ” {fmtNum(total)} เธฃเธฒเธข ยท เธซเธเนเธฒ {Math.min(page, totalPages)} เธเธฒเธ {totalPages}
            </span>
            <span style={{ display: "inline-flex", gap: 6 }}>
              <button type="button" className={styles.ghostBtn} style={{ width: "auto", padding: "0 14px", height: 34 }} disabled={page <= 1} onClick={() => changePage(page - 1)}>
                โ เธเนเธญเธเธซเธเนเธฒ
              </button>
              <button type="button" className={styles.ghostBtn} style={{ width: "auto", padding: "0 14px", height: 34 }} disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
                เธ–เธฑเธ”เนเธ โ’
              </button>
            </span>
          </div>
        </>
      ) : null}

      <p className={styles.source} style={{ marginTop: 12 }}>
        Source ยท NeonDB เธเนเธฒเธ /api/dev/users/list (เธเนเธญเธกเธนเธฅเธเธฃเธดเธเน€เธ—เนเธฒเธเธฑเนเธ โ€” mock เธเธดเธ”เธญเธขเธนเน) ยท
        {fetchedAt ? (
          <>
            {" "}
            <span className={styles.fresh}>
              <span className="ms" aria-hidden>schedule</span> เธ•เธฃเธงเธเธฅเนเธฒเธชเธธเธ” {fetchedAt}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
