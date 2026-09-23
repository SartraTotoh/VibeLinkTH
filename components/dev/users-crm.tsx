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
        setError(j?.error ?? "โหลดไม่สำเร็จ");
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
      setError("เกิดข้อผิดพลาด");
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
        setPinError(data?.error ?? "ทำรายการไม่สำเร็จ");
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
      setPinError("เกิดข้อผิดพลาด");
    } finally {
      setPinBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {overview ? (
        <div className={styles.chips} style={{ marginBottom: 12 }} aria-label="ภาพรวมลูกค้า">
          <span className={styles.chip}>
            <span className="ms" aria-hidden>group</span>
            <small>ทั้งหมด</small>
            <b>{fmtNum(overview.totalUsers)}</b>
          </span>
          <span className={styles.chip}>
            <span className="ms" aria-hidden>verified</span>
            <small>ยืนยันแล้ว</small>
            <b>{fmtNum(overview.verified)}</b>
          </span>
          <span className={styles.chip}>
            <span className="ms" aria-hidden>person_add</span>
            <small>ใหม่ 7 วัน</small>
            <b>{fmtNum(overview.new7d)}</b>
          </span>
          <span className={styles.chip}>
            <span className="ms" aria-hidden>calendar_month</span>
            <small>ใหม่ 30 วัน</small>
            <b>{fmtNum(overview.new30d)}</b>
          </span>
        </div>
      ) : null}

      <form onSubmit={search} className={styles.filterBar} style={{ marginTop: 0 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาอีเมล / ชื่อ…"
          aria-label="ค้นหาผู้ใช้"
        />
        <select value={plan} onChange={(e) => changePlan(e.target.value)} aria-label="กรองแพ็กเกจ">
          <option value="ALL">ทุกแพ็กเกจ</option>
          <option value="FREE">Free</option>
          <option value="CREATOR">Creator</option>
          <option value="CREATOR_PLUS">Plus</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => changePageSize(Number(e.target.value))}
          aria-label="จำนวนต่อหน้า"
        >
          {PAGE_SIZES.map((ps) => (
            <option key={ps} value={ps}>
              {ps}/หน้า
            </option>
          ))}
        </select>
        <button type="submit" className={styles.ghostBtn} style={{ width: "auto", padding: "0 16px", height: 38 }} aria-label="ค้นหา">
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
          <span style={{ fontSize: 12, fontWeight: 700 }}>Export เต็ม (PIN)</span>
        </button>
      </form>
      <p className={styles.cardSub} style={{ margin: "0 0 12px" }}>
        อีเมลถูกซ่อนเพื่อป้องกัน PDPA · ข้อมูลจริงครบเฉพาะในไฟล์ export ซึ่งต้องใช้ PIN 6 หลัก
      </p>

      {pinOpen ? (
        <div className={styles.kv} style={{ borderColor: "rgba(185,255,44,.3)" }}>
          <form onSubmit={exportFull} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%" }}>
            <b style={{ fontSize: 13 }}>กรอก PIN 6 หลักเพื่อดาวน์โหลดข้อมูลเต็ม</b>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
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

      {loading ? <p className={styles.cardSub}>กำลังโหลด…</p> : null}
      {error ? <p style={{ color: "#ff9b9b", fontSize: 13 }}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ผู้ใช้</th>
                  <th>แผน</th>
                  <th>ยืนยัน</th>
                  <th>ลิงก์</th>
                  <th>คลิก</th>
                  <th>สมัคร</th>
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
                      <td>{u.emailVerified ? "✓" : "—"}</td>
                      <td>{u.linkCount}</td>
                      <td>{fmtNum(u.clickCount)}</td>
                      <td>{fmtDate(u.createdAt)}</td>
                    </tr>
                    {openId === u.id ? (
                      <tr>
                        <td colSpan={6} style={{ color: "#a1a1aa", fontSize: 12 }}>
                          id: <span className={styles.cellMono}>{u.id}</span> · สมาชิก:{" "}
                          {u.subscription ? `${u.subscription.plan} (${u.subscription.status})` : "—"} ·
                          ยืนยันเมื่อ: {u.emailVerified ? fmtDate(u.emailVerified) : "—"}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#71717a" }}>ไม่พบข้อมูล</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className={styles.pager}>
            <span>
              ทั้งหมด {fmtNum(total)} ราย · หน้า {Math.min(page, totalPages)} จาก {totalPages}
            </span>
            <span style={{ display: "inline-flex", gap: 6 }}>
              <button type="button" className={styles.ghostBtn} style={{ width: "auto", padding: "0 14px", height: 34 }} disabled={page <= 1} onClick={() => changePage(page - 1)}>
                ← ก่อนหน้า
              </button>
              <button type="button" className={styles.ghostBtn} style={{ width: "auto", padding: "0 14px", height: 34 }} disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
                ถัดไป →
              </button>
            </span>
          </div>
        </>
      ) : null}

      <p className={styles.source} style={{ marginTop: 12 }}>
        Source · NeonDB ผ่าน /api/dev/users/list (ข้อมูลจริงเท่านั้น — mock ปิดอยู่) ·
        {fetchedAt ? (
          <>
            {" "}
            <span className={styles.fresh}>
              <span className="ms" aria-hidden>schedule</span> ตรวจล่าสุด {fetchedAt}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
