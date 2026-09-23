"use client";

import { useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

type UserResult = {
  user: {
    email: string;
    displayName: string | null;
    emailVerified: string | null;
    plan: string;
    createdAt: string;
  };
  subscription: { plan: string; status: string } | null;
  links: { id: string; slug: string; title: string; status: string; clicks: number }[];
};

type LinkResult = {
  link: {
    slug: string;
    title: string;
    destinationUrl: string;
    status: string;
    clicks: number;
    user: { email: string; plan: string };
  };
};

type ActionStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

const ACTION_LABEL: Record<ActionStatus, string> = {
  ACTIVE: "เปิดใช้",
  PAUSED: "หยุดชั่วคราว",
  ARCHIVED: "เก็บถาวร",
};

type Tab = "user" | "link";

export function SupportModule() {
  const [tab, setTab] = useState<Tab>("user");
  const [email, setEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [user, setUser] = useState<UserResult | null>(null);
  const [found, setFound] = useState<LinkResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaiting, setAwaiting] = useState<ActionStatus | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function lookupUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy("user");
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/dev/users?email=${encodeURIComponent(email)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "ค้นหาไม่สำเร็จ");
        setUser(null);
        return;
      }
      setUser(data as UserResult);
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  }

  async function lookupLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy("link");
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/dev/links?slug=${encodeURIComponent(slug.trim().toLowerCase())}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "ค้นหาไม่สำเร็จ");
        setFound(null);
        return;
      }
      setFound(data as LinkResult);
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  }

  async function requestAction(status: ActionStatus) {
    setError(null);
    setResult(null);
    if (awaiting !== status) {
      setAwaiting(status);
      return;
    }
    setAwaiting(null);
    setBusy("action");
    try {
      const res = await fetch("/api/dev/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: found!.link.slug, status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "ทำรายการไม่สำเร็จ");
        return;
      }
      setFound({ link: { ...found!.link, status: data.link.status } });
      setResult(`ตั้ง /${found!.link.slug} เป็น ${status} เรียบร้อย · บันทึก audit log แล้ว`);
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  }

  const hasResult = tab === "user" ? user !== null : found !== null;
  const stage = awaiting !== null || result !== null ? 3 : hasResult ? 2 : 1;

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setResult(null);
    setAwaiting(null);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">support_agent</span>
        <h2>ค้นหา · ระงับ</h2>
      </div>
      <p className={styles.cardSub}>เลือกงาน → ค้นหา → ตรวจสอบ → ลงมือ (กระทบข้อมูลจริงต้องยืนยัน 2 ครั้ง)</p>

      <div className={styles.chips} style={{ marginTop: 12 }} aria-label="ขั้นตอน">
        <span className={`${styles.chip} ${stage >= 1 ? styles.chipOk : ""}`}>
          <span className="ms" aria-hidden>search</span>
          <b>1 · ค้นหา</b>
        </span>
        <span className={`${styles.chip} ${stage >= 2 ? styles.chipOk : ""}`}>
          <span className="ms" aria-hidden>fact_check</span>
          <b>2 · ตรวจสอบ</b>
        </span>
        <span className={`${styles.chip} ${stage >= 3 ? styles.chipWarn : ""}`}>
          <span className="ms" aria-hidden>gavel</span>
          <b>3 · ลงมือ</b>
        </span>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="เลือกงาน" style={{ marginTop: 12 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "user"}
          className={`${styles.tab} ${tab === "user" ? styles.tabOn : ""}`}
          onClick={() => switchTab("user")}
        >
          <span className="ms" aria-hidden>person_search</span>
          จัดการผู้ใช้
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "link"}
          className={`${styles.tab} ${tab === "link" ? styles.tabOn : ""}`}
          onClick={() => switchTab("link")}
        >
          <span className="ms" aria-hidden>link</span>
          จัดการลิงก์
        </button>
      </div>

      <div className={styles.stack} style={{ marginTop: 12 }}>
        {tab === "user" ? (
          <>
            <form onSubmit={lookupUser} className={styles.kv}>
              <div style={{ flex: 1 }}>
                <b>ค้นหาผู้ใช้ด้วยอีเมล</b>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@email.com"
                  required
                  className={styles.devInput}
                />
              </div>
              <button type="submit" className={styles.ghostBtn} disabled={busy === "user"} aria-label="ค้นหาผู้ใช้" style={{ width: "auto", padding: "0 16px", height: 38 }}>
                <span className="ms">search</span>
              </button>
            </form>

            {user ? (
              <div className={styles.kv}>
                <div>
                  <b>{user.user.email} · {user.user.plan} · {user.user.emailVerified ? "verified ✓" : "unverified"}</b>
                  <span style={{ color: "#a1a1aa" }}>
                    สมัคร {new Date(user.user.createdAt).toLocaleDateString("th-TH")} · สมาชิก:{" "}
                    {user.subscription ? `${user.subscription.plan} (${user.subscription.status})` : "—"}
                  </span>
                  <span style={{ color: "#a1a1aa" }}>
                    {user.links.slice(0, 8).map((l) => `/${l.slug} (${l.clicks})`).join(" · ") || "—"}
                  </span>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <form onSubmit={lookupLink} className={styles.kv}>
              <div style={{ flex: 1 }}>
                <b>ค้นหาลิงก์ด้วย slug</b>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="promo-99"
                  required
                  className={styles.devInput}
                />
              </div>
              <button type="submit" className={styles.ghostBtn} disabled={busy === "link"} aria-label="ค้นหาลิงก์" style={{ width: "auto", padding: "0 16px", height: 38 }}>
                <span className="ms">search</span>
              </button>
            </form>

            {found ? (
              <div className={styles.kv}>
                <div style={{ minWidth: 0 }}>
                  <b>/{found.link.slug} · {found.link.status} · {found.link.clicks} คลิก</b>
                  <span style={{ color: "#a1a1aa", wordBreak: "break-all" }}>{found.link.destinationUrl}</span>
                  <span style={{ color: "#a1a1aa" }}>เจ้าของ: {found.link.user.email} ({found.link.user.plan})</span>
                </div>
                <div style={{ display: "flex", gap: 6, flex: "none", flexWrap: "wrap" }}>
                  {(["ACTIVE", "PAUSED", "ARCHIVED"] as ActionStatus[]).map((s) => {
                    const isCurrent = found.link.status === s;
                    const isArmed = awaiting === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.ghostBtn} ${isArmed ? styles.ghostDanger : ""}`}
                        style={{ width: "auto", padding: "0 14px", height: 36 }}
                        disabled={busy === "action" || isCurrent}
                        onClick={() => requestAction(s)}
                      >
                        {isCurrent
                          ? `${ACTION_LABEL[s]} ✓`
                          : isArmed
                            ? `ยืนยัน ${ACTION_LABEL[s]}?`
                            : ACTION_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}

        {awaiting ? (
          <p className={styles.confirmNote}>
            <span className="ms" aria-hidden>warning</span>
            กดยืนยันอีกครั้งเพื่อดำเนินการ — ทุกครั้งถูกบันทึกใน audit log (ใคร / ทำอะไร / เมื่อไหร่ / ผลลัพธ์)
          </p>
        ) : null}

        {result ? (
          <p className={styles.resultNote} role="status">
            <span className="ms" aria-hidden>check_circle</span> {result}
          </p>
        ) : null}

        {error ? <p className={styles.errorNote} role="alert">{error}</p> : null}
      </div>

      <p className={styles.source}>
        Source · NeonDB ผ่าน /api/dev/users + /api/dev/links (admin only) ·{" "}
        <a className={styles.freshLink} href="/api/dev/audit?limit=30" target="_blank" rel="noreferrer noopener">
          ดู audit log <span className="ms" aria-hidden>open_in_new</span>
        </a>
      </p>
    </div>
  );
}
