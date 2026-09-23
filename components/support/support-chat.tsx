"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";

type Sender = "MEMBER" | "ADMIN" | "AUTO";
type TicketStatus = "OPEN" | "RESOLVED";

type Message = {
  id: string;
  sender: Sender;
  body: string;
  ruleId: string | null;
  createdAt: string;
};

type Ticket = {
  id: string;
  status: TicketStatus;
  needsAdmin: boolean;
  subjectPreview: string | null;
  lastMessageAt: string;
  lastSender: Sender;
  messages: Message[];
};

type FaqItem = {
  id: string;
  priority: number;
  category: string;
  qTh: string;
  qEn: string;
  aTh: string;
  aEn: string;
  hitCount: number;
};

type Settings = {
  autoReplyOn: boolean;
  faqOn: boolean;
  greetingTh: string;
  greetingEn: string;
  noMatchTh: string;
  noMatchEn: string;
  hoursTh: string | null;
  hoursEn: string | null;
  emailNotify: boolean;
};

type Loaded = {
  settings: Settings;
  faq: FaqItem[];
  tickets: Ticket[];
};

const POLL_MS = 6000;

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

const bubble: Record<Sender, React.CSSProperties> = {
  MEMBER: { alignSelf: "flex-end", background: "#4f3d8e", color: "#f4f4f5", borderTopRightRadius: 4 },
  ADMIN: { alignSelf: "flex-start", background: "#2a2a2e", color: "#e4e4e7", borderTopLeftRadius: 4 },
  AUTO: { alignSelf: "flex-start", background: "#20302b", color: "#9aef80", borderTopLeftRadius: 4 },
};

const bubbleLabel: Record<Sender, string> = {
  MEMBER: "คุณ",
  ADMIN: "ทีมงาน",
  AUTO: "VibeLink Bot",
};

export function SupportChat({ lang }: { lang: Lang }) {
  const t = (th: string, en: string) => (lang === "en" ? en : th);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const active = activeId
    ? loaded?.tickets.find((tk) => tk.id === activeId) ?? null
    : loaded?.tickets[0] ?? null;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/support", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Loaded;
      setLoaded(data);
      if (data.tickets.length > 0 && !activeId) setActiveId(data.tickets[0]!.id);
    } catch {
      // transient — keep last state
    }
  }, [activeId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages.length, activeId]);

  async function sendMessage(body: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, lang }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "ส่งข้อความไม่สำเร็จ");
        return;
      }
      setLoaded((prev) => {
        if (!prev) return prev;
        const ticket = data.ticket as Ticket;
        const exists = prev.tickets.some((tk) => tk.id === ticket.id);
        const tickets = exists
          ? prev.tickets.map((tk) => (tk.id === ticket.id ? ticket : tk))
          : [ticket, ...prev.tickets];
        return { ...prev, tickets };
      });
      setActiveId(data.ticket.id as string);
      setDraft("");
    } catch {
      setError("เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function askFaq(item: FaqItem) {
    if (busy) return;
    const q = lang === "en" ? item.qEn : item.qTh;
    await sendMessage(q);
    setExpanded(null);
  }

  const s = loaded?.settings;

  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0,1fr)", maxWidth: 900 }}>
      <div
        style={{
          border: "1px solid rgba(24,24,27,0.08)",
          borderRadius: 18,
          background: "#fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(24,24,27,0.08)",
            background: "linear-gradient(135deg,#ff4fd8,#9270ff)",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ms" style={{ fontSize: 22 }}>support_agent</span>
            <div>
              <b style={{ fontSize: 16 }}>{t("พูดคุยกับทีมงาน", "Chat with our team")}</b>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {s
                  ? s.autoReplyOn
                    ? t("ตอบอัตโนมัติทันที · ทีมงานช่วยต่อเมื่อจำเป็น", "Instant auto-replies · humans jump in when needed")
                    : t("แชทกับทีมงาน", "Direct support chat")
                  : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Conversation history & messages */}
        <div
          style={{
            maxHeight: 460,
            overflowY: "auto",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: 240,
          }}
        >
          {!loaded ? (
            <div style={{ color: "#737373", fontSize: 13 }}>{t("กำลังโหลดแชท…", "Loading chat…")}</div>
          ) : active?.messages.length ? (
            active.messages.map((m) => (
              <div key={m.id} style={{ maxWidth: "82%", display: "flex", flexDirection: "column", gap: 2, ...bubble[m.sender], padding: "9px 13px", borderRadius: 14, whiteSpace: "pre-wrap" }}>
                <span style={{ fontSize: 10.5, opacity: 0.75, letterSpacing: "0.03em" }}>{bubbleLabel[m.sender]}</span>
                {m.body}
                <span style={{ fontSize: 10.5, opacity: 0.6, alignSelf: "flex-end" }}>{fmtTime(m.createdAt)}</span>
              </div>
            ))
          ) : (
            <div style={{ color: "#737373", fontSize: 13, lineHeight: 1.7 }}>
              {s?.greetingTh && lang === "th" ? s.greetingTh : s?.greetingEn ?? ""}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div style={{ padding: "14px 18px 18px", borderTop: "1px solid rgba(24,24,27,0.08)", display: "flex", gap: 10, alignItems: "center" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim() && !busy) sendMessage(draft);
              }
            }}
            rows={2}
            placeholder={t("พิมพ์คำถาม… (Enter ส่ง)", "Type your question… (Enter to send)")}
            style={{
              flex: 1,
              resize: "none",
              border: "1px solid rgba(24,24,27,0.14)",
              borderRadius: 12,
              padding: "10px 13px",
              fontSize: 13.5,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => draft.trim() && sendMessage(draft)}
            disabled={busy || !draft.trim()}
            style={{
              flex: "none",
              height: 42,
              padding: "0 18px",
              borderRadius: 12,
              border: 0,
              background: busy ? "#a1a1aa" : "#9270ff",
              color: "#fff",
              fontWeight: 800,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? t("ส่ง…", "Sending…") : t("ส่ง", "Send")}
          </button>
        </div>

        {error ? (
          <div style={{ padding: "0 18px 14px" }}>
            <p style={{ margin: 0, color: "#b91c1c", fontSize: 12.5 }}>{error}</p>
          </div>
        ) : null}
      </div>

      {/* FAQ — popular questions */}
      {loaded && s?.faqOn && loaded.faq.length > 0 ? (
        <div
          style={{
            border: "1px solid rgba(24,24,27,0.08)",
            borderRadius: 18,
            background: "#fff",
            padding: "18px 22px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, color: "#111" }}>
            {t("คำถามยอดฮิตจากลูกค้าจริง", "Popular questions from real customers")}
          </h2>
          <p style={{ margin: "4px 0 14px", fontSize: 12.5, color: "#737373" }}>
            {t("กดคำถามเพื่อส่งให้ระบบตอบอัตโนมัติ", "Tap a question to send it to auto-reply")}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {loaded.faq.slice(0, 10).map((item) => {
              const open = expanded === item.id;
              return (
                <div key={item.id} style={{ border: "1px solid rgba(24,24,27,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "11px 14px",
                      border: 0,
                      background: open ? "#faf7ff" : "#fff",
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "#18181b",
                      textAlign: "left",
                    }}
                  >
                    <span className="ms" style={{ fontSize: 17, color: "#9270ff" }}>quiz</span>
                    <span style={{ flex: 1 }}>{(lang === "en" ? item.qEn : item.qTh)}</span>
                    <span className="ms" style={{ fontSize: 16, color: "#a1a1aa", transform: open ? "rotate(180deg)" : "none" }}>expand_more</span>
                  </button>
                  {open ? (
                    <div style={{ padding: "2px 14px 13px 41px", fontSize: 13, color: "#3f3f46", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {lang === "en" ? item.aEn : item.aTh}
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => askFaq(item)}
                          disabled={busy}
                          style={{
                            padding: "7px 14px",
                            borderRadius: 10,
                            border: "1px solid #9270ff",
                            background: "#faf7ff",
                            color: "#6d28d9",
                            fontWeight: 800,
                            fontSize: 12.5,
                            cursor: busy ? "default" : "pointer",
                          }}
                        >
                          {t("ถามคำถามนี้กับระบบ", "Ask this question now")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {loaded && loaded.tickets.length > 1 ? (
        <div style={{ color: "#737373", fontSize: 12.5 }}>
          <b>{t("แชทก่อนหน้า:", "Previous chats:")}</b>
          {loaded.tickets.map((tk) => (
            <button
              key={tk.id}
              type="button"
              onClick={() => setActiveId(tk.id)}
              style={{
                marginLeft: 8,
                padding: "4px 10px",
                borderRadius: 8,
                border: activeId === tk.id ? "1px solid #9270ff" : "1px solid rgba(24,24,27,0.12)",
                background: activeId === tk.id ? "#faf7ff" : "#fff",
                color: "#3f3f46",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {tk.status === "RESOLVED" ? `✔ ${tk.subjectPreview ?? tk.id.slice(0, 6)}` : `${tk.subjectPreview ?? tk.id.slice(0, 6)}`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}