"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

type Sender = "MEMBER" | "ADMIN" | "AUTO";
type TicketStatus = "OPEN" | "RESOLVED";
type View = "inbox" | "all" | "resolved";

type TicketRow = {
  id: string;
  status: TicketStatus;
  needsAdmin: boolean;
  subjectPreview: string | null;
  lastMessageAt: string;
  lastSender: Sender;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  user: { email: string; displayName: string | null; plan: string };
};

type Message = {
  id: string;
  sender: Sender;
  body: string;
  ruleId: string | null;
  createdAt: string;
};

type TicketDetail = {
  id: string;
  status: TicketStatus;
  needsAdmin: boolean;
  subjectPreview: string | null;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    plan: string;
    vibeSlug: string | null;
    createdAt: string;
  };
  messages: Message[];
};

type Feed = {
  openCount: number;
  inboxCount: number;
  settings: { autoReplyOn: boolean; faqOn: boolean; hoursTh: string | null; hoursEn: string | null; emailNotify: boolean } | null;
  tickets: TicketRow[];
};

const POLL_MS = 8000;

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

export type SupportChatModuleProps = {
  initialUnread: number;
};

export function SupportChatModule({ initialUnread }: SupportChatModuleProps) {
  const [view, setView] = useState<View>("inbox");
  const [feed, setFeed] = useState<Feed | null>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const unread = feed?.inboxCount ?? initialUnread;

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/dev/support?view=${view}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Feed;
      setFeed(data);
      if (ticket) {
        const still = data.tickets.find((t) => t.id === ticket.id);
        if (!still) {
          if (view !== "resolved") setTicket(null);
        }
      }
    } catch {
      // transient
    }
  }, [view, ticket?.id]);

  useEffect(() => {
    loadFeed();
    const timer = setInterval(loadFeed, POLL_MS);
    return () => clearInterval(timer);
  }, [loadFeed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ticket?.messages.length]);

  async function openTicket(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dev/support/tickets/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "เปิดเธรดไม่สำเร็จ");
        return;
      }
      setTicket(data.ticket as TicketDetail);
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function act(action: "reply" | "resolve" | "reopen") {
    if (!ticket) return;
    if (action === "reply" && !draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ticketId: ticket.id, body: action === "reply" ? draft : undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "ทำรายการไม่สำเร็จ");
        return;
      }
      setTicket(data.ticket as TicketDetail);
      setDraft("");
      loadFeed();
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function applySettings(patch: { autoReplyOn?: boolean; faqOn?: boolean; emailNotify?: boolean }) {
    try {
      const res = await fetch("/api/dev/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      loadFeed();
    } catch {
      setError("บันทึกไม่สำเร็จ");
    }
  }

  const tickets = feed?.tickets ?? [];
  const showTickets = view === "resolved" ? tickets : tickets.filter((t) => t.status === "OPEN");

  return (
    <div className={`${styles.card} ${unread > 0 ? styles.cardWarn : ""}`} id="mod-support-chat">
      <div className={styles.cardHead}>
        <span className="ms">forum</span>
        <h2>แชทช่วยเหลือ · สนทนากับสมาชิก</h2>
        {unread > 0 ? (
          <span className={`${styles.pill} ${styles.pillWarn}`}>{unread} รอตอบ</span>
        ) : (
          <span className={`${styles.pill} ${styles.pillOn}`}>inbox โล่ง</span>
        )}
      </div>
      <p className={styles.cardSub}>
        สมาชิกส่งคำถาม → auto-reply ตอบได้ ตอบอัตโนมัติทันที ถ้าตอบไม่ได้ขึ้นเป็นงานรอแอดมิน · กดเธรดเพื่อเปิด/ตอบ/ปิดงาน
      </p>

      <div className={styles.hairline} style={{ marginTop: 12 }} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,360px) 1fr", gap: 12, marginTop: 14 }}>
        {/* Left: ticket list */}
        <div>
          <div className={styles.chips} style={{ marginBottom: 10 }}>
            <button
              type="button"
              className={`${styles.chip} ${view === "inbox" ? styles.chipOk : ""}`}
              onClick={() => { setView("inbox"); setTicket(null); }}
            >
              <span className="ms">inbox</span> รอตอบ {feed ? feed.inboxCount : "…"}
            </button>
            <button
              type="button"
              className={`${styles.chip} ${view === "all" ? styles.chipOk : ""}`}
              onClick={() => { setView("all"); setTicket(null); }}
            >
              <span className="ms">chat</span> เปิดทั้งหมด
            </button>
            <button
              type="button"
              className={`${styles.chip} ${view === "resolved" ? styles.chipOk : ""}`}
              onClick={() => { setView("resolved"); setTicket(null); }}
            >
              <span className="ms">task_alt</span> ปิดแล้ว
            </button>
          </div>

          <div className={styles.stack}>
            {showTickets.slice(0, 40).map((tk) => (
              <button
                key={tk.id}
                type="button"
                onClick={() => openTicket(tk.id)}
                className={styles.kv}
                style={{ width: "100%", textAlign: "left", cursor: "pointer", borderColor: ticket?.id === tk.id ? "rgba(146,112,255,0.6)" : undefined }}
              >
                <div style={{ minWidth: 0 }}>
                  <b>
                    {tk.user.displayName?.trim() ? tk.user.displayName : tk.user.email}
                    {tk.needsAdmin && tk.status === "OPEN" ? " · รอตอบ" : ""} · {tk.user.plan}
                  </b>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {tk.subjectPreview ?? "(ไม่มีหัวข้อ)"}
                  </span>
                  <span style={{ color: "#71717a", fontSize: 11, marginTop: 4 }}>
                    {fmtTime(tk.lastMessageAt)} · {tk.messageCount} ข้อความ · {tk.status === "RESOLVED" ? "ปิดแล้ว" : "เปิดอยู่"}
                  </span>
                </div>
              </button>
            ))}
            {showTickets.length === 0 ? (
              <div className={styles.cardSub} style={{ marginLeft: 0 }}>
                {view === "resolved" ? "ยังไม่มีเธรดที่ปิด" : "ไม่มีงานใน inbox — สมาชิกทุกคนได้คำตอบอัตโนมัติแล้ว"}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: thread view */}
        <div style={{ minWidth: 0 }}>
          {ticket ? (
            <div className={styles.card} style={{ marginTop: 0 }}>
              <div className={styles.cardHead}>
                <span className="ms">record_voice_over</span>
                <h2 style={{ fontSize: 15 }}>
                  {ticket.user.displayName?.trim() ? ticket.user.displayName : ticket.user.email} · {ticket.user.plan}
                  <span style={{ fontSize: 11, color: "#71717a", marginLeft: 8 }}>
                    {ticket.user.email} · {ticket.user.vibeSlug ? `/${ticket.user.vibeSlug}` : "ไม่มีหน้า vibe"}
                  </span>
                </h2>
                <span className={`${styles.pill} ${ticket.status === "RESOLVED" ? styles.pillOn : styles.pillWarn}`}>
                  {ticket.status === "RESOLVED" ? "ปิดแล้ว" : "ยังตอบอยู่"}
                </span>
              </div>

              <div
                className={styles.stack}
                style={{
                  marginTop: 12,
                  maxHeight: 360,
                  overflowY: "auto",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                {ticket.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender === "MEMBER" ? "flex-end" : "flex-start",
                      background:
                        m.sender === "MEMBER" ? "#2e2547" : m.sender === "ADMIN" ? "#242424" : "#16231d",
                      color: m.sender === "AUTO" ? "#9aef80" : "#e4e4e7",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12,
                      padding: "9px 12px",
                      maxWidth: "80%",
                      fontSize: 12.5,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: "0.04em" }}>
                      {m.sender === "MEMBER" ? "สมาชิก" : m.sender === "ADMIN" ? "แอดมิน" : "Auto-bot"}
                      {m.ruleId ? " · จับคู่กฎ" : ""} · {fmtTime(m.createdAt)}
                    </span>
                    <div style={{ marginTop: 3 }}>{m.body}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {ticket.status === "OPEN" ? (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="พิมพ์คำตอบ… (Enter ส่ง)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (draft.trim() && !busy) act("reply");
                      }
                    }}
                    className={styles.devInput}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => act("reply")}
                    disabled={busy || !draft.trim()}
                    aria-label="ส่งคำตอบ"
                    style={{ width: "auto", padding: "0 16px", height: 44, fontWeight: 800 }}
                  >
                    <span className="ms">send</span> ส่ง
                  </button>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => act("resolve")}
                    disabled={busy}
                    aria-label="ปิดงาน"
                    style={{ width: "auto", padding: "0 14px", height: 44, whiteSpace: "nowrap" }}
                  >
                    <span className="ms" style={{ color: "#9aef80" }}>check</span> ปิดงาน
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => act("reopen")}
                    disabled={busy}
                    style={{ width: "auto", padding: "0 14px", height: 40 }}
                  >
                    <span className="ms">replay</span> เปิดใหม่
                  </button>
                </div>
              )}

              {error ? <p className={styles.errorNote} role="alert">{error}</p> : null}
            </div>
          ) : (
            <div className={styles.cardSub} style={{ marginLeft: 0 }}>
              เลือกเธรดจากซ้ายเพื่ออ่านและตอบ — มี {feed?.openCount ?? 0} เธรดเปิดในระบบ
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className={styles.ghostBtn}
          onClick={() => setSettingsOpen((v) => !v)}
          style={{ width: "auto", padding: "0 14px", height: 38 }}
        >
          <span className="ms">tune</span> {settingsOpen ? "ปิดการตั้งค่า" : "ตั้งค่าระบบอัตโนมัติ"}
        </button>

        {settingsOpen ? (
          <div className={styles.stack} style={{ marginTop: 12 }}>
            <div className={styles.kv}>
              <div>
                <b>Auto-reply</b>
                <span style={{ color: "#8e8e96" }}>ตอบอัตโนมัติเมื่อข้อความตรงกฎคำค้น</span>
              </div>
              <button
                type="button"
                className={`${styles.ghostBtn} ${feed?.settings?.autoReplyOn ? "" : styles.ghostDanger}`}
                style={{ width: "auto", padding: "0 14px", height: 36 }}
                onClick={() => applySettings({ autoReplyOn: !(feed?.settings?.autoReplyOn ?? true) })}
              >
                {feed?.settings?.autoReplyOn ? "เปิดอยู่" : "ปิด"}
              </button>
            </div>

            <div className={styles.kv}>
              <div>
                <b>แสดงคำถามยอดฮิตบนหน้า /support</b>
                <span style={{ color: "#8e8e96" }}>แถว FAQ ที่สมาชิกกดถามได้เอง</span>
              </div>
              <button
                type="button"
                className={`${styles.ghostBtn} ${feed?.settings?.faqOn ? "" : styles.ghostDanger}`}
                style={{ width: "auto", padding: "0 14px", height: 36 }}
                onClick={() => applySettings({ faqOn: !(feed?.settings?.faqOn ?? true) })}
              >
                {feed?.settings?.faqOn ? "แสดง" : "ซ่อน"}
              </button>
            </div>

            <div className={styles.kv}>
              <div>
                <b>เวลาทำการ</b>
                <span style={{ color: "#8e8e96" }}>
                  {feed?.settings?.hoursTh || feed?.settings?.hoursEn ? (feed.settings.hoursTh ?? feed.settings.hoursEn) : "ยังไม่ตั้ง — ไม่แสดงแจ้งเตือนเวลาทำการ"}
                </span>
              </div>
            </div>

            <p className={styles.source}>
              แก้ไขข้อความ greeting/no-match ได้ชั่วคราวจาก Mission Control · ภาษาไทย/อังกฤษจัดการในโมดูล Rules
            </p>
          </div>
        ) : null}
      </div>

      <p className={styles.source}>
        Source · NeonDB ผ่าน /api/dev/support (admin only) · สมาชิกส่งข้อความผ่าน /api/support ·{" "}
        <a className={styles.freshLink} href="/support" target="_blank" rel="noreferrer noopener">
          เปิด หน้า /support (สมาชิกก็เห็นแบบนี้) <span className="ms" aria-hidden>open_in_new</span>
        </a>
      </p>
    </div>
  );
}