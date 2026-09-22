"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { LinkItem } from "./link-manager";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LinkEditModal({
  link,
  plan,
  lang,
  onSaved,
  onClose,
}: {
  link: LinkItem;
  plan: string;
  lang: Lang;
  onSaved: (updated: LinkItem) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(link.title);
  const [destinationUrl, setDestinationUrl] = useState(link.destinationUrl);
  const [slug, setSlug] = useState(link.slug);
  const [expiresAt, setExpiresAt] = useState(toLocalInput(link.expiresAt));
  const [noExpiry, setNoExpiry] = useState(!link.expiresAt);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slugChanged = slug.trim().toLowerCase() !== link.slug;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || link.title,
          destinationUrl,
          slug: slug.trim().toLowerCase() || link.slug,
          expiresAt: noExpiry ? null : expiresAt || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        return;
      }
      onSaved({ ...link, ...data.link });
      onClose();
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, "ed.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t(lang, "ed.title")}</h2>
          <button type="button" className="mini-btn" onClick={onClose} aria-label={t(lang, "ed.cancel")}>
            <span className="ms">close</span>
          </button>
        </div>
        <form onSubmit={onSubmit} className="auth-form">
          <label className="field">
            <span>{t(lang, "ed.fTitle")}</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </label>
          <label className="field">
            <span>{t(lang, "ed.fDest")}</span>
            <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} required />
          </label>
          <label className="field">
            <span>{t(lang, "ed.fSlug")}</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              maxLength={30}
              required
              disabled={plan === "FREE"}
            />
            {plan === "FREE" ? <small className="slug-warn">{t(lang, "ed.slugLocked")}</small> : null}
          </label>
          {slugChanged ? <div className="notice">{t(lang, "ed.slugWarn")}</div> : null}
          <label className="field">
            <span>{t(lang, "ed.fExpiry")}</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={noExpiry}
            />
          </label>
          <label className="consent">
            <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} />
            <span>{t(lang, "ed.noExpiry")}</span>
          </label>
          {error ? <div className="auth-error">{error}</div> : null}
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? t(lang, "ed.saving") : t(lang, "ed.save")}
          </button>
        </form>
      </div>
    </div>
  );
}
