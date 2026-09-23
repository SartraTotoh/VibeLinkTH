"use client";

import { useEffect, useState } from "react";
import styles from "@/app/dev/dev-console.module.css";

type Mod = { id: string; label: string; zone: string; keys: string };

const ZONES = [
  { id: "zone-check", icon: "monitor_heart", label: "ตรวจ", en: "CHECK" },
  { id: "zone-understand", icon: "insights", label: "เข้าใจ", en: "UNDERSTAND" },
  { id: "zone-act", icon: "construction", label: "ลงมือ", en: "ACT" },
  { id: "zone-control", icon: "settings", label: "ดูแล", en: "CONTROL" },
  { id: "zone-reference", icon: "menu_book", label: "อ้างอิง", en: "REFERENCE" },
] as const;

const MODULES: Mod[] = [
  { id: "mod-exceptions", label: "สิ่งที่ต้องรู้", zone: "zone-check", keys: "exceptions alert stripe test dns pending ผิดปกติ" },
  { id: "mod-health", label: "ระบบหลัก", zone: "zone-check", keys: "health worker db neon auth online" },
  { id: "mod-resend", label: "Resend อีเมล", zone: "zone-check", keys: "resend email dns delivery domain" },
  { id: "mod-overview", label: "ภาพรวม", zone: "zone-understand", keys: "overview stats users links clicks" },
  { id: "mod-users", label: "ลูกค้า · CRM", zone: "zone-understand", keys: "crm funnel mrr export pin customer" },
  { id: "mod-revenue", label: "รายได้ · เงิน", zone: "zone-understand", keys: "revenue mrr arpu payments money income" },
  { id: "mod-support", label: "ค้นหา · ระงับ", zone: "zone-act", keys: "support lookup user link pause archive ระงับ" },
  { id: "mod-config", label: "Runtime config", zone: "zone-control", keys: "config env vars runtime" },
  { id: "mod-vault", label: "Secret Vault", zone: "zone-control", keys: "secret vault key reveal ค่าลับ" },
  { id: "mod-deploy", label: "Deploy", zone: "zone-control", keys: "deploy commands cf wrangler" },
  { id: "mod-checklist", label: "เช็กลิสต์เปิดตัว", zone: "zone-control", keys: "checklist launch stripe webhook" },
  { id: "mod-governance", label: "ความเสี่ยง & audit", zone: "zone-control", keys: "governance risk audit pdpa rotate" },
  { id: "mod-roadmap", label: "โฟกัสข้างหน้า", zone: "zone-reference", keys: "roadmap phase plans" },
  { id: "mod-milestones", label: "วันที่สำคัญ", zone: "zone-reference", keys: "milestones anniversary dates" },
  { id: "mod-links", label: "ลิงก์ด่วน", zone: "zone-reference", keys: "links dashboards stripe neon cloudflare resend" },
  { id: "mod-design", label: "ธีม · Blink / Pank", zone: "zone-reference", keys: "design theme blink pank dark light สี color ธีม" },
  { id: "mod-incident", label: "รายงาน · .env", zone: "zone-reference", keys: "incident report env sign-off รายงาน ไฟล์ลับ .env" },
  { id: "mod-notes", label: "บันทึกเตือนใจ", zone: "zone-reference", keys: "notes warnings design" },
];

function reduced() {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: reduced() ? "auto" : "smooth",
    block: "start",
  });
}

export function DevNav() {
  const [query, setQuery] = useState("");
  const [activeZone, setActiveZone] = useState<string>("zone-check");

  useEffect(() => {
    const sections = ZONES.map((z) => document.getElementById(z.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveZone(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const q = query.trim().toLowerCase();

  useEffect(() => {
    for (const m of MODULES) {
      const el = document.getElementById(m.id);
      if (!el) continue;
      const hit = !q || m.label.toLowerCase().includes(q) || m.keys.includes(q);
      el.classList.toggle(styles.dimmed, !hit);
    }
  }, [q]);

  const zoneLabel = (id: string) => ZONES.find((z) => z.id === id)?.label ?? "";

  const results = !q
    ? []
    : [
        ...MODULES.filter(
          (m) => m.label.toLowerCase().includes(q) || m.keys.includes(q),
        ).map((m) => ({ kind: "module" as const, id: m.id, label: m.label, zone: zoneLabel(m.zone), zoneId: m.zone })),
        ...ZONES.filter(
          (z) =>
            z.label.includes(q) ||
            z.en.toLowerCase().includes(q) ||
            z.id.includes(q),
        ).map((z) => ({ kind: "zone" as const, id: z.id, label: z.label, zone: z.en, zoneId: z.id })),
      ];

  function openZone(zoneId: string, targetId?: string) {
    window.dispatchEvent(new CustomEvent("vl:openzone", { detail: zoneId }));
    window.setTimeout(() => scrollTo(targetId ?? zoneId), 60);
  }

  return (
    <div className={styles.cmdbar} role="navigation" aria-label="กระโดดไปยังเนื้อหา">
      <div className={styles.cmdsearch}>
        <span className="ms" aria-hidden>search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหา: mrr, secret, deploy…"
          aria-label="ค้นหาโมดูล"
        />
        {q ? (
          <div className={styles.cmdresults} role="listbox" aria-label="ผลค้นหา">
            {results.length > 0 ? (
              results.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  className={styles.cmdresult}
                  role="option"
                  onClick={() => {
                    openZone(r.zoneId, r.id);
                    setQuery("");
                  }}
                >
                  <span className="ms" aria-hidden>
                    {r.kind === "zone" ? "grid_view" : "arrow_forward"}
                  </span>
                  <b>{r.label}</b>
                  <small>{r.zone}</small>
                </button>
              ))
            ) : (
              <span className={styles.cmdempty}>ไม่พบ “{query}”</span>
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.zonepills}>
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            className={activeZone === z.id ? styles.zonepillOn : styles.zonepill}
            aria-current={activeZone === z.id ? "true" : undefined}
            onClick={() => openZone(z.id)}
            title={z.en}
          >
            <span className="ms" aria-hidden>{z.icon}</span>
            {z.label}
          </button>
        ))}
      </div>
    </div>
  );
}