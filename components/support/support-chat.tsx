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

// Obsidian Radiant Bubbles — strictly zero colored borders, pure radial gradients & specular highlights
const bubbleStyle: Record<Sender, React.CSSProperties> = {
  MEMBER: {
    alignSelf: "flex-end",
    background: "radial-gradient(130% 130% at 85% 0%, rgba(110, 231, 255, 0.22) 0%, rgba(15, 23, 42, 0.95) 100%)",
    color: "#ffffff",
    boxShadow: "inset 0 1px 1px rgba(110, 231, 255, 0.3), 0 8px 24px -4px rgba(0, 0, 0, 0.5)",
    borderTopRightRadius: 4,
    border: "none",
  },
  ADMIN: {
    alignSelf: "flex-start",
    background: "radial-gradient(130% 130% at 15% 0%, rgba(255, 79, 216, 0.18) 0%, rgba(24, 16, 32, 0.95) 100%)",
    color: "#ffffff",
    boxShadow: "inset 0 1px 1px rgba(255, 79, 216, 0.25), 0 8px 24px -4px rgba(0, 0, 0, 0.5)",
    borderTopLeftRadius: 4,
    border: "none",
  },
  AUTO: {
    alignSelf: "flex-start",
    background: "radial-gradient(130% 130% at 15% 0%, rgba(185, 255, 44, 0.15) 0%, rgba(18, 24, 20, 0.95) 100%)",
    color: "#f4f4f6",
    boxShadow: "inset 0 1px 1px rgba(185, 255, 44, 0.25), 0 8px 24px -4px rgba(0, 0, 0, 0.5)",
    borderTopLeftRadius: 4,
    border: "none",
  },
};

const bubbleMeta: Record<Sender, { label: string; icon: string; color: string; badgeBg: string }> = {
  MEMBER: {
    label: "คุณ",
    icon: "person",
    color: "#6ee7ff",
    badgeBg: "rgba(110, 231, 255, 0.12)",
  },
  ADMIN: {
    label: "ทีมงาน VibeLink",
    icon: "support_agent",
    color: "#ffade3",
    badgeBg: "rgba(255, 79, 216, 0.14)",
  },
  AUTO: {
    label: "VibeLink AI Bot",
    icon: "smart_toy",
    color: "#b9ff2c",
    badgeBg: "rgba(185, 255, 44, 0.14)",
  },
};

const DEFAULT_SUGGESTIONS = [
  { icon: "bolt", textTh: "วิธีสร้าง Dynamic QR Code ที่เปลี่ยนปลายทางได้", textEn: "How to create an editable Dynamic QR Code" },
  { icon: "link", textTh: "วิธีรวมปุ่ม TikTok Shop & Shopee ใน Bio Link", textEn: "How to add TikTok Shop & Shopee in Bio Link" },
  { icon: "calendar_month", textTh: "ระบบจองคิว 1:1 VibeBook ใช้งานอย่างไร", textEn: "How to use VibeBook 1:1 Booking Calendar" },
  { icon: "workspace_premium", textTh: "แพ็กเกจ Creator มีฟีเจอร์อะไรบ้าง ราคาเท่าไหร่", textEn: "What features are included in Creator plan" },
];

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
    if (!body.trim() || busy) return;
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
        setError(data?.error ?? t("ส่งข้อความไม่สำเร็จ", "Failed to send message"));
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
      setError(t("เกิดข้อผิดพลาด ลองอีกครั้ง", "An error occurred. Please try again."));
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
    <div style={{ display: "flex", flexDirection: "column", gap: 32, width: "100%" }}>
      {/* 1. Main Obsidian Glass Chat Canvas */}
      <div
        style={{
          borderRadius: 24,
          background: "radial-gradient(130% 130% at 50% 0%, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(14, 17, 24, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.14), 0 24px 60px -15px rgba(0, 0, 0, 0.75)",
          border: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: "20px 24px",
            background: "radial-gradient(130% 130% at 20% 0%, rgba(185, 255, 44, 0.1) 0%, transparent 70%), rgba(18, 22, 32, 0.95)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 4px 20px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(185, 255, 44, 0.12)",
                boxShadow: "inset 0 1px 1px rgba(185, 255, 44, 0.3), 0 0 20px rgba(185, 255, 44, 0.2)",
                display: "grid",
                placeItems: "center",
                color: "var(--primary, #b9ff2c)",
              }}
            >
              <span className="ms" style={{ fontSize: 24 }}>smart_toy</span>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <b style={{ fontSize: 18, color: "#ffffff", fontWeight: 700 }}>
                  {t("VibeLink AI Smart Assistant", "VibeLink AI Smart Assistant")}
                </b>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(185, 255, 44, 0.15)",
                    color: "var(--primary, #b9ff2c)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary, #b9ff2c)" }} />
                  24/7 ONLINE
                </span>
              </div>
              <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 3 }}>
                {s?.autoReplyOn
                  ? t("ตอบอัตโนมัติทันทีใน 0.04 วินาที · ส่งต่อทีมงานเมื่อต้องการความช่วยเหลือเชิงลึก", "Instant 0.04s auto-reply · team escalates when needed")
                  : t("ช่องทางสนทนากับฝ่ายบริการลูกค้า", "Direct customer support channel")}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.05)",
                boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <span className="ms" style={{ fontSize: 16, color: "var(--primary, #b9ff2c)" }}>bolt</span>
              {t("ตอบไวใน 0.04s", "Instant 0.04s")}
            </span>
          </div>
        </div>

        {/* Message Stream Area */}
        <div
          style={{
            minHeight: 360,
            maxHeight: 520,
            overflowY: "auto",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {!loaded ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "#94a3b8", fontSize: 15, gap: 10 }}>
              <span className="ms" style={{ fontSize: 24, animation: "spin 1s infinite linear" }}>progress_activity</span>
              <span>{t("กำลังเชื่อมต่อระบบแชท…", "Connecting to support chat…")}</span>
            </div>
          ) : active?.messages.length ? (
            active.messages.map((m) => {
              const meta = bubbleMeta[m.sender];
              return (
                <div
                  key={m.id}
                  style={{
                    maxWidth: "82%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    ...bubbleStyle[m.sender],
                    padding: "14px 18px",
                    borderRadius: 18,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "2px 8px",
                        borderRadius: 8,
                        background: meta.badgeBg,
                        color: meta.color,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      <span className="ms" style={{ fontSize: 15 }}>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </div>

                  <div style={{ fontSize: 15, lineHeight: 1.65 }}>
                    {m.body}
                  </div>

                  <span style={{ fontSize: 14, opacity: 0.65, alignSelf: "flex-end", marginTop: 2 }}>
                    {fmtTime(m.createdAt)}
                  </span>
                </div>
              );
            })
          ) : (
            /* Welcome Hero Box inside Chat */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "32px 20px",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "radial-gradient(120% 120% at 30% 20%, rgba(185, 255, 44, 0.25), rgba(185, 255, 44, 0.05))",
                  boxShadow: "inset 0 1px 1px rgba(185, 255, 44, 0.4), 0 0 30px rgba(185, 255, 44, 0.25)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--primary, #b9ff2c)",
                }}
              >
                <span className="ms" style={{ fontSize: 32 }}>smart_toy</span>
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#ffffff" }}>
                  {t("ยินดีต้อนรับสู่ VibeLink Support Hub", "Welcome to VibeLink Support Hub")}
                </h3>
                <p style={{ margin: "8px auto 0", fontSize: 15, color: "#94a3b8", maxWidth: 580, lineHeight: 1.6 }}>
                  {s?.greetingTh && lang === "th"
                    ? s.greetingTh
                    : (s?.greetingEn ?? t("พิมพ์คำถามได้เลย หรือคลิกหัวข้อยอดนิยมด้านล่างเพื่อเริ่มการสนทนาครับ", "Type your question below or click any popular topic to start."))}
                </p>
              </div>

              {/* Quick Topic Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 660, marginTop: 8 }}>
                {DEFAULT_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(lang === "en" ? item.textEn : item.textTh)}
                    disabled={busy}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px",
                      borderRadius: 14,
                      background: "rgba(255, 255, 255, 0.04)",
                      boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                      border: "none",
                      color: "#e2e8f0",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(185, 255, 44, 0.14)";
                      e.currentTarget.style.color = "var(--primary, #b9ff2c)";
                      e.currentTarget.style.boxShadow = "inset 0 1px 1px rgba(185, 255, 44, 0.3), 0 4px 14px rgba(0,0,0,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                      e.currentTarget.style.color = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "inset 0 1px 1px rgba(255, 255, 255, 0.1)";
                    }}
                  >
                    <span className="ms" style={{ fontSize: 16, color: "var(--primary, #b9ff2c)" }}>{item.icon}</span>
                    <span>{lang === "en" ? item.textEn : item.textTh}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer Area */}
        <div
          style={{
            padding: "18px 24px 22px",
            background: "rgba(10, 13, 20, 0.75)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: 16,
              background: "rgba(18, 22, 32, 0.8)",
              boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
            }}
          >
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
              placeholder={t("พิมพ์คำถามของคุณที่นี่… (กด Enter เพื่อส่งข้อความ)", "Type your question here… (Press Enter to send)")}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: 15,
                lineHeight: 1.5,
                fontFamily: "inherit",
                resize: "none",
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => draft.trim() && sendMessage(draft)}
            disabled={busy || !draft.trim()}
            style={{
              flex: "none",
              height: 48,
              padding: "0 22px",
              borderRadius: 14,
              border: "none",
              background: busy
                ? "rgba(255, 255, 255, 0.1)"
                : "radial-gradient(120% 120% at 30% 20%, #d4ff6b 0%, var(--primary, #b9ff2c) 100%)",
              color: busy ? "#71717a" : "#080a0f",
              fontWeight: 700,
              fontSize: 14,
              cursor: busy || !draft.trim() ? "default" : "pointer",
              boxShadow: busy ? "none" : "0 0 20px rgba(185, 255, 44, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
          >
            <span className="ms" style={{ fontSize: 18 }}>{busy ? "progress_activity" : "send"}</span>
            <span>{busy ? t("กำลังส่ง…", "Sending…") : t("ส่งข้อความ", "Send")}</span>
          </button>
        </div>

        {error ? (
          <div style={{ padding: "10px 24px 16px", background: "rgba(239, 68, 68, 0.1)" }}>
            <p style={{ margin: 0, color: "#fca5a5", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="ms" style={{ fontSize: 16 }}>error</span>
              {error}
            </p>
          </div>
        ) : null}
      </div>

      {/* 2. Previous Tickets / Sessions (if any) */}
      {loaded && loaded.tickets.length > 1 ? (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            background: "radial-gradient(130% 130% at 50% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 100%), rgba(17, 20, 28, 0.6)",
            backdropFilter: "blur(12px)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.1)",
            border: "none",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 16 }}>history</span>
            {t("ประวัติการสนทนาก่อนหน้า:", "Previous chats:")}
          </span>
          {loaded.tickets.map((tk) => {
            const isSelected = activeId === tk.id;
            return (
              <button
                key={tk.id}
                type="button"
                onClick={() => setActiveId(tk.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: isSelected
                    ? "radial-gradient(120% 120% at 30% 20%, rgba(185, 255, 44, 0.22), rgba(185, 255, 44, 0.08))"
                    : "rgba(255, 255, 255, 0.04)",
                  color: isSelected ? "var(--primary, #b9ff2c)" : "#cbd5e1",
                  boxShadow: isSelected
                    ? "inset 0 1px 1px rgba(185, 255, 44, 0.35), 0 2px 8px rgba(0, 0, 0, 0.3)"
                    : "inset 0 1px 1px rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.18s ease",
                }}
              >
                <span className="ms" style={{ fontSize: 15 }}>
                  {tk.status === "RESOLVED" ? "check_circle" : "chat_bubble"}
                </span>
                <span>{tk.subjectPreview ?? tk.id.slice(0, 8)}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 3. Curated FAQ Accordion (Clean 4 Top Items matching Landing Page) */}
      {loaded && s?.faqOn && loaded.faq.length > 0 ? (
        <div
          style={{
            padding: "26px",
            borderRadius: 22,
            background: "radial-gradient(130% 130% at 50% 0%, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(17, 20, 28, 0.75)",
            backdropFilter: "blur(16px)",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 20px 40px -15px rgba(0, 0, 0, 0.5)",
            border: "none",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="ms" style={{ color: "var(--primary, #b9ff2c)", fontSize: 22 }}>quiz</span>
                {t("คำถามที่พบบ่อยยอดฮิต", "Popular Frequently Asked Questions")}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 14.5, color: "#94a3b8" }}>
                {t("คลิกหัวข้อเพื่อดูคำอธิบาย หรือกดส่งคำถามให้ผู้ช่วย AI ตอบเพิ่มเติมได้ทันที", "Click a topic to view details or send it directly to the AI assistant")}
              </p>
            </div>
            <span
              style={{
                fontSize: 14,
                color: "var(--primary, #b9ff2c)",
                background: "rgba(185, 255, 44, 0.1)",
                padding: "4px 12px",
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              TOP 4 CURATED
            </span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {loaded.faq.slice(0, 4).map((item) => {
              const open = expanded === item.id;
              const q = lang === "en" ? item.qEn : item.qTh;
              const a = lang === "en" ? item.aEn : item.aTh;
              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 14,
                    background: open ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.02)",
                    boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
                    border: "none",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "16px 20px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 15,
                      fontWeight: 700,
                      color: open ? "var(--primary, #b9ff2c)" : "#ffffff",
                      textAlign: "left",
                    }}
                  >
                    <span className="ms" style={{ fontSize: 18, color: "var(--primary, #b9ff2c)" }}>help_outline</span>
                    <span style={{ flex: 1 }}>{q}</span>
                    <span
                      className="ms"
                      style={{
                        fontSize: 20,
                        color: "#94a3b8",
                        transform: open ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      expand_more
                    </span>
                  </button>

                  {open ? (
                    <div
                      style={{
                        padding: "0 20px 20px 50px",
                        fontSize: 14.5,
                        color: "#cbd5e1",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <div>{a}</div>
                      <div style={{ marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => askFaq(item)}
                          disabled={busy}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: "radial-gradient(120% 120% at 30% 20%, rgba(185, 255, 44, 0.2), rgba(185, 255, 44, 0.06))",
                            color: "var(--primary, #b9ff2c)",
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: busy ? "default" : "pointer",
                            boxShadow: "inset 0 1px 1px rgba(185, 255, 44, 0.3)",
                            transition: "all 0.18s ease",
                          }}
                        >
                          <span className="ms" style={{ fontSize: 16 }}>chat</span>
                          <span>{t("ถามคำถามนี้ในแชท ↗", "Ask this question in chat ↗")}</span>
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
    </div>
  );
}
