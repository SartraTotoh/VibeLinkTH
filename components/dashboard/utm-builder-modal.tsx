"use client";

import { useMemo, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { LinkItem } from "./link-manager";

export function UtmBuilderModal({
  link,
  lang,
  onSaved,
  onClose,
}: {
  link: LinkItem;
  lang: Lang;
  onSaved: (updated: LinkItem) => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState("tiktok");
  const [medium, setMedium] = useState("bio");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const preview = useMemo(() => {
    try {
      const url = new URL(link.destinationUrl);
      if (source.trim()) url.searchParams.set("utm_source", source.trim());
      if (medium.trim()) url.searchParams.set("utm_medium", medium.trim());
      if (campaign.trim()) url.searchParams.set("utm_campaign", campaign.trim());
      if (term.trim()) url.searchParams.set("utm_term", term.trim());
      if (content.trim()) url.searchParams.set("utm_content", content.trim());
      url.searchParams.set("ref", "vibelink");
      return url.toString();
    } catch {
      return link.destinationUrl;
    }
  }, [link.destinationUrl, source, medium, campaign, term, content]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(t(lang, "lm.copyFail"));
    }
  }

  async function save() {
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationUrl: preview }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        return;
      }
      onSaved({ ...link, ...data.link });
      setSaved(true);
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
        aria-label={t(lang, "utm.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t(lang, "utm.title")}</h2>
          <button type="button" className="mini-btn" onClick={onClose} aria-label={t(lang, "st.close")}>
            <span className="ms">close</span>
          </button>
        </div>
        <p className="panel-sub">/{link.slug} — {t(lang, "utm.sub")}</p>
        <div className="auth-form">
          <label className="field">
            <span>{t(lang, "utm.source")}</span>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            <span>{t(lang, "utm.medium")}</span>
            <input type="text" value={medium} onChange={(e) => setMedium(e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            <span>{t(lang, "utm.campaign")}</span>
            <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            <span>{t(lang, "utm.term")}</span>
            <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={80} />
          </label>
          <label className="field">
            <span>{t(lang, "utm.content")}</span>
            <input type="text" value={content} onChange={(e) => setContent(e.target.value)} maxLength={80} />
          </label>
          <div className="notice">
            <b>{t(lang, "utm.preview")}</b>
            <br />
            <span style={{ wordBreak: "break-all" }}>{preview}</span>
          </div>
          {error ? <div className="auth-error">{error}</div> : null}
          {saved ? <div className="notice">{t(lang, "utm.saved")}</div> : null}
          <div className="rowbtns">
            <button type="button" className="button ghost" onClick={copy}>
              <span className="ms">content_copy</span>
              {copied ? t(lang, "lm.copied") : t(lang, "lm.copy")}
            </button>
            <button type="button" className="button primary" onClick={save} disabled={busy}>
              {busy ? t(lang, "ed.saving") : t(lang, "utm.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
