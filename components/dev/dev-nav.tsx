"use client";

import { useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

type Mod = { id: string; label: string; zone: string; keys: string };

const ZONES = [
  { id: "zone-check", icon: "monitor_heart", label: "เธ•เธฃเธงเธ", en: "CHECK" },
  { id: "zone-understand", icon: "insights", label: "เน€เธเนเธฒเนเธ", en: "UNDERSTAND" },
  { id: "zone-act", icon: "construction", label: "เธฅเธเธกเธทเธญ", en: "ACT" },
  { id: "zone-control", icon: "settings", label: "เธ”เธนเนเธฅ", en: "CONTROL" },
  { id: "zone-reference", icon: "menu_book", label: "เธญเนเธฒเธเธญเธดเธ", en: "REFERENCE" },
] as const;

const MODULES: Mod[] = [
  { id: "mod-exceptions", label: "เธชเธดเนเธเธ—เธตเนเธ•เนเธญเธเธฃเธนเน", zone: "zone-check", keys: "exceptions alert stripe test dns pending เธเธดเธ”เธเธเธ•เธด" },
  { id: "mod-health", label: "เธฃเธฐเธเธเธซเธฅเธฑเธ", zone: "zone-check", keys: "health worker db neon auth online" },
  { id: "mod-resend", label: "Resend เธญเธตเน€เธกเธฅ", zone: "zone-check", keys: "resend email dns delivery domain" },
  { id: "mod-overview", label: "เธ เธฒเธเธฃเธงเธก", zone: "zone-understand", keys: "overview stats users links clicks" },
  { id: "mod-users", label: "เธฅเธนเธเธเนเธฒ ยท CRM", zone: "zone-understand", keys: "crm funnel mrr export pin customer" },
  { id: "mod-revenue", label: "เธฃเธฒเธขเนเธ”เน ยท เน€เธเธดเธ", zone: "zone-understand", keys: "revenue mrr arpu payments money income" },
  { id: "mod-support", label: "เธเนเธเธซเธฒ ยท เธฃเธฐเธเธฑเธ", zone: "zone-act", keys: "support lookup user link pause archive เธฃเธฐเธเธฑเธ" },
  { id: "mod-config", label: "Runtime config", zone: "zone-control", keys: "config env vars runtime" },
  { id: "mod-vault", label: "Secret Vault", zone: "zone-control", keys: "secret vault key reveal เธเนเธฒเธฅเธฑเธ" },
  { id: "mod-deploy", label: "Deploy", zone: "zone-control", keys: "deploy commands cf wrangler" },
  { id: "mod-checklist", label: "เน€เธเนเธเธฅเธดเธชเธ•เนเน€เธเธดเธ”เธ•เธฑเธง", zone: "zone-control", keys: "checklist launch stripe webhook" },
  { id: "mod-governance", label: "เธเธงเธฒเธกเน€เธชเธตเนเธขเธ & audit", zone: "zone-control", keys: "governance risk audit pdpa rotate" },
  { id: "mod-roadmap", label: "เนเธเธเธฑเธชเธเนเธฒเธเธซเธเนเธฒ", zone: "zone-reference", keys: "roadmap phase plans" },
  { id: "mod-milestones", label: "เธงเธฑเธเธ—เธตเนเธชเธณเธเธฑเธ", zone: "zone-reference", keys: "milestones anniversary dates" },
  { id: "mod-links", label: "เธฅเธดเธเธเนเธ”เนเธงเธ", zone: "zone-reference", keys: "links dashboards stripe neon cloudflare resend" },
  { id: "mod-design", label: "เธเธตเธก ยท Blink / Pank", zone: "zone-reference", keys: "design theme blink pank dark light เธชเธต color เธเธตเธก" },
  { id: "mod-incident", label: "เธฃเธฒเธขเธเธฒเธ ยท .env", zone: "zone-reference", keys: "incident report env sign-off เธฃเธฒเธขเธเธฒเธ เนเธเธฅเนเธฅเธฑเธ .env" },
  { id: "mod-notes", label: "เธเธฑเธเธ—เธถเธเน€เธ•เธทเธญเธเนเธ", zone: "zone-reference", keys: "notes warnings design" },
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
    <div className={styles.cmdbar} role="navigation" aria-label="เธเธฃเธฐเนเธ”เธ”เนเธเธขเธฑเธเน€เธเธทเนเธญเธซเธฒ">
      <div className={styles.cmdsearch}>
        <span className="ms" aria-hidden>search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="เธเนเธเธซเธฒ: mrr, secret, deployโ€ฆ"
          aria-label="เธเนเธเธซเธฒเนเธกเธ”เธนเธฅ"
        />
        {q ? (
          <div className={styles.cmdresults} role="listbox" aria-label="เธเธฅเธเนเธเธซเธฒ">
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
              <span className={styles.cmdempty}>เนเธกเนเธเธ โ€{query}โ€</span>
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