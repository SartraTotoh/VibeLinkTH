"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export function SupportChatModule({ initialUnread: _initialUnread }: SupportChatModuleProps) {
  const [view, setView] = useState<View>("inbox");
  const [feed, setFeed] = useState<Feed | null>(null);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/dev/support?view=${view}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Feed;
      setFeed(data);
      if (ticket) {
        const still = data.tickets.find((t) => t.id === ticket.id);
        if (!still && view !== "resolved") {
          setTicket(null);
        }
      }
    } catch {
      // transient
    }
  }, [view, ticket]);

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
        setError(data?.error ?? "ดำเนินการไม่สำเร็จ");
        return;
      }
      if (action === "reply") {
        setDraft("");
        if (data.ticket) setTicket(data.ticket as TicketDetail);
      } else {
        await loadFeed();
        if (data.ticket) setTicket(data.ticket as TicketDetail);
      }
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function applySettings(patch: Partial<NonNullable<Feed["settings"]>>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/support/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "บันทึกการตั้งค่าไม่สำเร็จ");
        return;
      }
      await loadFeed();
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  const showTickets = feed?.tickets ?? [];

  return (
    <div
      style={{
        borderRadius: 24,
        background: "radial-gradient(130% 130% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(14, 17, 24, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.14), 0 24px 60px -15px rgba(0, 0, 0, 0.75)",
        border: "none",
        padding: 26,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Admin Desk Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "rgba(185, 255, 44, 0.12)",
              boxShadow: "inset 0 1px 1px rgba(185, 255, 44, 0.3)",
              display: "grid",
              placeItems: "center",
              color: "var(--primary, #b9ff2c)",
            }}
          >
            <span className="ms" style={{ fontSize: 154 }}>support_agent</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 150, fontWeight: 700, color: "#ffffff" }}>
              ศูนย์ควบคุมการตอบคำถาม (Admin Desk)
            </h2>
            <div style={{ fontSize: 15, color: "#94a3b8", marginTop: 2 }}>
              จัดการเธรดคำถามสมาชิก ตอบกลับโดยตรง และตรวจสอบสถานะระบบ
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 12,
            background: "rgba(255, 255, 255, 0.05)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12)",
            border: "none",
            color: "#e2e8f0",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span className="ms" style={{ fontSize: 158, color: "var(--primary, #b9ff2c)" }}>tune</span>
          <span>{settingsOpen ? "ปิดการตั้งค่า" : "ตั้งค่าบอทอัตโนมัติ"}</span>
        </button>
      </div>

      {/* Settings Drawer */}
      {settingsOpen ? (
        <div
          style={{
            padding: 20,
            borderRadius: 18,
            background: "rgba(255, 255, 255, 0.03)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 155, color: "#ffffff" }}>Auto-reply Bot</b>
              <div style={{ fontSize: 15, color: "#94a3b8" }}>ตอบอัตโนมัติทันทีเมื่อข้อความของสมาชิกตรงกับคีย์เวิร์ด</div>
            </div>
            <button
              type="button"
              onClick={() => applySettings({ autoReplyOn: !(feed?.settings?.autoReplyOn ?? true) })}
              disabled={busy}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                border: "none",
                background: feed?.settings?.autoReplyOn
                  ? "radial-gradient(120% 120% at 30% 20%, #d4ff6b, var(--primary, #b9ff2c))"
                  : "rgba(255, 255, 255, 0.1)",
                color: feed?.settings?.autoReplyOn ? "#080a0f" : "#94a3b8",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {feed?.settings?.autoReplyOn ? "✓ เปิดใช้งาน" : "ปิดใช้งาน"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 155, color: "#ffffff" }}>แสดงคำถามยอดฮิต (FAQ) บนหน้า /support</b>
              <div style={{ fontSize: 15, color: "#94a3b8" }}>คำถามที่สมาชิกสามารถคลิกเพื่อถามระบบได้ทันที</div>
            </div>
            <button
              type="button"
              onClick={() => applySettings({ faqOn: !(feed?.settings?.faqOn ?? true) })}
              disabled={busy}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                border: "none",
                background: feed?.settings?.faqOn
                  ? "radial-gradient(120% 120% at 30% 20%, #d4ff6b, var(--primary, #b9ff2c))"
                  : "rgba(255, 255, 255, 0.1)",
                color: feed?.settings?.faqOn ? "#080a0f" : "#94a3b8",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {feed?.settings?.faqOn ? "✓ แสดงคำถาม" : "ซ่อนคำถาม"}
            </button>
          </div>
        </div>
      ) : null}

      {/* 2 Columns: Inbox List & Thread View */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.4fr)", gap: 20 }}>
        {/* Left Column: Tickets Queue */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* View Filter Switcher */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              padding: 4,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.04)",
              boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => { setView("inbox"); setTicket(null); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: view === "inbox" ? "rgba(185, 255, 44, 0.18)" : "transparent",
                color: view === "inbox" ? "var(--primary, #b9ff2c)" : "#94a3b8",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: view === "inbox" ? "inset 0 1px 1px rgba(185, 255, 44, 0.3)" : "none",
                fontFamily: "inherit",
              }}
            >
              <span className="ms" style={{ fontSize: 156 }}>inbox</span>
              <span>รอตอบ ({feed ? feed.inboxCount : "…"})</span>
            </button>

            <button
              type="button"
              onClick={() => { setView("all"); setTicket(null); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: view === "all" ? "rgba(185, 255, 44, 0.18)" : "transparent",
                color: view === "all" ? "var(--primary, #b9ff2c)" : "#94a3b8",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: view === "all" ? "inset 0 1px 1px rgba(185, 255, 44, 0.3)" : "none",
                fontFamily: "inherit",
              }}
            >
              <span className="ms" style={{ fontSize: 156 }}>chat</span>
              <span>ทั้งหมด</span>
            </button>

            <button
              type="button"
              onClick={() => { setView("resolved"); setTicket(null); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: view === "resolved" ? "rgba(185, 255, 44, 0.18)" : "transparent",
                color: view === "resolved" ? "var(--primary, #b9ff2c)" : "#94a3b8",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: view === "resolved" ? "inset 0 1px 1px rgba(185, 255, 44, 0.3)" : "none",
                fontFamily: "inherit",
              }}
            >
              <span className="ms" style={{ fontSize: 156 }}>task_alt</span>
              <span>ปิดแล้ว</span>
            </button>
          </div>

          {/* Ticket Cards Stream */}
          <div
            style={{
              maxHeight: 480,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingRight: 4,
            }}
          >
            {showTickets.map((tk) => {
              const isSelected = ticket?.id === tk.id;
              return (
                <button
                  key={tk.id}
                  type="button"
                  onClick={() => openTicket(tk.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "14px 18px",
                    borderRadius: 16,
                    border: "none",
                    background: isSelected
                      ? "radial-gradient(130% 130% at 20% 0%, rgba(185, 255, 44, 0.16), rgba(18, 24, 32, 0.95))"
                      : "rgba(255, 255, 255, 0.03)",
                    boxShadow: isSelected
                      ? "inset 0 1px 1px rgba(185, 255, 44, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4)"
                      : "inset 0 1px 1px rgba(255, 255, 255, 0.06)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <b style={{ fontSize: 155, color: isSelected ? "var(--primary, #b9ff2c)" : "#ffffff" }}>
                      {tk.user.displayName?.trim() ? tk.user.displayName : tk.user.email}
                    </b>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: tk.status === "OPEN" ? "rgba(185, 255, 44, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        color: tk.status === "OPEN" ? "var(--primary, #b9ff2c)" : "#94a3b8",
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      {tk.status === "OPEN" ? "เปิดอยู่" : "ปิดแล้ว"}
                    </span>
                  </div>

                  <div style={{ fontSize: 15, color: "#cbd5e1", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {tk.subjectPreview ?? "(ไม่มีหัวข้อ)"}
                  </div>

                  <div style={{ fontSize: 15, color: "#71717a", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span>{fmtTime(tk.lastMessageAt)}</span>
                    <span>·</span>
                    <span>{tk.messageCount} ข้อความ</span>
                    <span>·</span>
                    <span>{tk.user.plan}</span>
                  </div>
                </button>
              );
            })}

            {showTickets.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 15 }}>
                {view === "resolved" ? "ยังไม่มีเธรดที่ปิดแล้ว" : "ไม่มีงานใน Inbox — ทุกเธรดได้รับการดูแลแล้ว"}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Ticket Conversation Thread */}
        <div style={{ minWidth: 0 }}>
          {ticket ? (
            <div
              style={{
                borderRadius: 20,
                background: "rgba(18, 22, 32, 0.75)",
                boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Thread Info Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 158, fontWeight: 700, color: "#ffffff" }}>
                    {ticket.user.displayName?.trim() ? ticket.user.displayName : ticket.user.email}
                  </h3>
                  <div style={{ fontSize: 15, color: "#94a3b8", marginTop: 2 }}>
                    {ticket.user.email} · แผน {ticket.user.plan} {ticket.user.vibeSlug ? `· /${ticket.user.vibeSlug}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {ticket.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => act("resolve")}
                      disabled={busy}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        borderRadius: 10,
                        border: "none",
                        background: "radial-gradient(120% 120% at 30% 20%, rgba(185, 255, 44, 0.2), rgba(185, 255, 44, 0.05))",
                        color: "var(--primary, #b9ff2c)",
                        boxShadow: "inset 0 1px 1px rgba(185, 255, 44, 0.3)",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <span className="ms" style={{ fontSize: 156 }}>check</span>
                      <span>ปิดงาน</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => act("reopen")}
                      disabled={busy}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        borderRadius: 10,
                        border: "none",
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "#ffffff",
                        boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12)",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <span className="ms" style={{ fontSize: 156 }}>replay</span>
                      <span>เปิดใหม่</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message List */}
              <div
                style={{
                  maxHeight: 340,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: "14px 10px",
                }}
              >
                {ticket.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender === "ADMIN" ? "flex-end" : "flex-start",
                      background:
                        m.sender === "ADMIN"
                          ? "radial-gradient(130% 130% at 85% 0%, rgba(255, 79, 216, 0.18), rgba(28, 18, 36, 0.95))"
                          : m.sender === "MEMBER"
                          ? "radial-gradient(130% 130% at 15% 0%, rgba(110, 231, 255, 0.18), rgba(16, 24, 40, 0.95))"
                          : "radial-gradient(130% 130% at 15% 0%, rgba(185, 255, 44, 0.12), rgba(18, 24, 20, 0.95))",
                      color: "#ffffff",
                      boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 4px 14px rgba(0, 0, 0, 0.3)",
                      borderRadius: 14,
                      padding: "12px 16px",
                      maxWidth: "85%",
                      fontSize: 15,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <div style={{ fontSize: 15, opacity: 0.7, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{m.sender === "ADMIN" ? "ทีมงาน" : m.sender === "MEMBER" ? "สมาชิก" : "VibeLink AI Bot"}</span>
                      <span>·</span>
                      <span>{fmtTime(m.createdAt)}</span>
                    </div>
                    <div>{m.body}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply Box */}
              {ticket.status === "OPEN" ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="พิมพ์ข้อความตอบกลับสมาชิก… (กด Enter เพื่อส่ง)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (draft.trim() && !busy) act("reply");
                      }
                    }}
                    style={{
                      flex: 1,
                      background: "rgba(10, 13, 20, 0.8)",
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                      color: "#ffffff",
                      fontSize: 15,
                      padding: "10px 14px",
                      resize: "none",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => act("reply")}
                    disabled={busy || !draft.trim()}
                    style={{
                      height: 44,
                      padding: "0 18px",
                      borderRadius: 12,
                      border: "none",
                      background: "radial-gradient(120% 120% at 30% 20%, #d4ff6b 0%, var(--primary, #b9ff2c) 100%)",
                      color: "#080a0f",
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: busy || !draft.trim() ? "default" : "pointer",
                      boxShadow: "0 0 16px rgba(185, 255, 44, 0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "inherit",
                    }}
                  >
                    <span className="ms" style={{ fontSize: 156 }}>send</span>
                    <span>ส่ง</span>
                  </button>
                </div>
              ) : null}

              {error ? <p style={{ margin: 0, color: "#fca5a5", fontSize: 15 }}>{error}</p> : null}
            </div>
          ) : (
            <div
              style={{
                borderRadius: 20,
                background: "rgba(18, 22, 32, 0.4)",
                boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                padding: "48px 24px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 155,
              }}
            >
              เลือกเธรดจากคอลัมน์ซ้ายเพื่อเริ่มอ่านและตอบกลับคำถาม
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
