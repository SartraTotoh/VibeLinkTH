"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { useLang } from "@/components/i18n/language";
import { LinkStats } from "./link-stats";
import { LinkEditModal } from "./link-edit-modal";
import { LinkQrModal } from "./link-qr-modal";
import { UtmBuilderModal } from "./utm-builder-modal";
import { BulkImportModal } from "./bulk-import-modal";
import { OnboardingChecklist } from "./onboarding-checklist";

export type LinkItem = {
  id: string;
  title: string;
  slug: string;
  destinationUrl: string;
  platform: string | null;
  status: "ACTIVE" | "PAUSED";
  clicks: number;
  shortUrl: string;
  createdAt: string;
  expiresAt: string | null;
};

type Props = {
  initialLinks: LinkItem[];
  plan: string;
  maxActiveLinks: number | null;
};

function formatExpiry(lang: Lang, iso: string | null) {
  if (!iso) return t(lang, "lm.noExpiry");
  try {
    return new Date(iso).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LinkManager({ initialLinks, plan, maxActiveLinks }: Props) {
  const router = useRouter();
  const [lang] = useLang();
  const [items, setItems] = useState<LinkItem[]>(initialLinks);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statsId, setStatsId] = useState<string | null>(null);
  const [editing, setEditing] = useState<LinkItem | null>(null);
  const [qr, setQr] = useState<LinkItem | null>(null);
  const [utm, setUtm] = useState<LinkItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => setItems(initialLinks), [initialLinks]);

  const activeCount = items.filter((i) => i.status === "ACTIVE").length;
  const totalClicks = items.reduce((sum, i) => sum + i.clicks, 0);
  const slugLen = slug.trim().length;

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl,
          title: title.trim() || undefined,
          slug: slug.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errCreate"));
        return;
      }
      setItems((prev) => [{ ...(data.link as LinkItem), expiresAt: null }, ...prev]);
      setDestinationUrl("");
      setTitle("");
      setSlug("");
      setNotice(`${t(lang, "lm.noticeCreated")} → ${data.link.shortUrl}`);
      router.refresh();
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  function applyUpdated(updated: LinkItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
    router.refresh();
  }

  async function toggleStatus(link: LinkItem) {
    const next = link.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setItems((prev) =>
      prev.map((i) => (i.id === link.id ? { ...i, status: next } : i)),
    );
    const res = await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === link.id ? { ...i, status: link.status } : i)),
      );
      setError(t(lang, "lm.errToggle"));
      return;
    }
    router.refresh();
  }

  async function removeLink(link: LinkItem) {
    if (!window.confirm(`${t(lang, "lm.confirmDelete")} ("${link.slug}")`)) return;
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== link.id));
    const res = await fetch(`/api/links/${link.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setItems(snapshot);
      setError(t(lang, "lm.errDelete"));
      return;
    }
    setNotice(`${t(lang, "lm.noticeDeleted")} (${link.slug})`);
    router.refresh();
  }

  async function downloadAllCsv() {
    setError(null);
    try {
      const res = await fetch("/api/account/export-csv");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vibelink-links.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError(t(lang, "lm.errGeneric"));
    }
  }

  async function copyUrl(link: LinkItem) {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError(t(lang, "lm.copyFail"));
    }
  }

  const planName = plan === "FREE" ? "Free" : plan === "CREATOR" ? "Creator" : "Creator Plus";
  const num = (n: number) => n.toLocaleString(lang === "th" ? "th-TH" : "en-US");

  return (
    <>
      <div className="stats">
        <div className="stat">
          <span className="stat-label"><span className="ms">link</span>{t(lang, "lm.statLinks")}</span>
          <b>{num(items.length)}</b>
        </div>
        <div className="stat">
          <span className="stat-label"><span className="ms">bolt</span>{t(lang, "lm.statActive")}</span>
          <b>{num(activeCount)}</b>
          {maxActiveLinks !== null && (
            <>
              <div className="quota-bar" role="progressbar" aria-label={t(lang, "lm.quota")} aria-valuenow={activeCount} aria-valuemax={maxActiveLinks}>
                <i className={activeCount / maxActiveLinks > 0.85 ? "warn" : ""} style={{ width: `${Math.min(100, (activeCount / maxActiveLinks) * 100)}%` }} />
              </div>
              <span className="quota-cap">{num(activeCount)}/{num(maxActiveLinks)} {t(lang, "lm.quota")}</span>
            </>
          )}
        </div>
        <div className="stat">
          <span className="stat-label"><span className="ms">trending_up</span>{t(lang, "lm.statClicks")}</span>
          <b>{num(totalClicks)}</b>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="ms">add_link</span><h2>{t(lang, "lm.createTitle")}</h2></div>
        <p className="panel-sub">{t(lang, "lm.createSub")}</p>
        <form onSubmit={createLink} className="link-form">
          <label className="field">
            <span>{t(lang, "lm.fDest")}</span>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://shopee.co.th/your-shop"
              required
            />
          </label>
          <label className="field">
            <span>{t(lang, "lm.fTitle")}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lang === "th" ? "รองเท้าคู่โปรด" : "Favorite sneakers"}
              maxLength={120}
            />
          </label>
          <label className="field slugf">
            <span>{t(lang, "lm.fSlug")}</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder={t(lang, "lm.slugAuto")}
              maxLength={30}
            />
            {slugLen > 0 ? (
              <small className={slugLen > 10 ? "slug-warn" : "slug-ok"}>
                {slugLen}/30 · {slugLen <= 7 ? t(lang, "lm.slugGood") : slugLen > 10 ? t(lang, "lm.slugWarn") : null}
              </small>
            ) : null}
          </label>
          <div className="field" style={{ flex: "0 0 auto", justifyContent: "flex-end" }}>
            <button type="submit" className="button primary" disabled={busy}>
              <span className="ms">bolt</span>
              {busy ? t(lang, "lm.btnCreating") : t(lang, "lm.btnCreate")}
            </button>
          </div>
        </form>
        <div className="rowbtns" style={{ marginTop: 12 }}>
          <button type="button" className="mini-btn" onClick={() => setBulkOpen(true)}>
            <span className="ms">upload</span>
            {t(lang, "lm.btnBulk")}
          </button>
          <button type="button" className="mini-btn" onClick={downloadAllCsv}>
            <span className="ms">download</span>
            {t(lang, "lm.csvAll")}
          </button>
        </div>
        {error ? <div className="auth-error" style={{ marginTop: 12 }}>{error}</div> : null}
        {notice ? <div className="notice">{notice}</div> : null}
        <p className="form-note">
          {t(lang, "set.plan")}: {planName} ·
          {lang === "th" ? " ลิงก์สั้นของคุณจะอยู่ที่ " : " Your short links live at "}
          {items[0]?.shortUrl.replace(/\/[^/]+$/, "") || "/go"}
        </p>
      </div>

      <OnboardingChecklist lang={lang} hasLinks={items.length > 0} />

      <div className="panel">
        <div className="panel-head"><span className="ms">format_list_bulleted</span><h2>{t(lang, "lm.linksTitle")}</h2></div>
        <p className="panel-sub">{t(lang, "lm.linksSub")}</p>
        {items.length === 0 ? (
          <div className="empty">{t(lang, "lm.empty")}</div>
        ) : (
          <div className="link-table">
            {items.map((link) => (
              <div key={link.id}>
                <div className="lrow">
                  <a
                    className="lurl"
                    href={link.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.shortUrl}
                  >
                    {link.shortUrl.replace(/^https?:\/\//, "")}
                  </a>
                  <button type="button" className="mini-btn copy-primary" onClick={() => copyUrl(link)}>
                    <span className="ms">content_copy</span>{copiedId === link.id ? t(lang, "lm.copied") : t(lang, "lm.copy")}
                  </button>
                  <div className="lt">
                    <b>{link.title}</b>
                    <small>{link.destinationUrl}</small>
                    {link.expiresAt ? (
                      <small>⏳ {t(lang, "lm.expires")}: {formatExpiry(lang, link.expiresAt)}</small>
                    ) : null}
                  </div>
                  <span className="lclicks">{num(link.clicks)} {t(lang, "lm.clicks")}</span>
                  <span className={`status-pill ${link.status === "ACTIVE" ? "on" : "off"}`}>
                    {link.status === "ACTIVE" ? t(lang, "lm.stActive") : t(lang, "lm.stPaused")}
                  </span>
                  <div className="rowbtns">
                    <button type="button" className="mini-btn" onClick={() => setStatsId(statsId === link.id ? null : link.id)} aria-expanded={statsId === link.id}>
                      <span className="ms">bar_chart</span>{t(lang, "lm.stats")}
                    </button>
                    <button type="button" className="mini-btn" onClick={() => setEditing(link)}>
                      <span className="ms">edit</span>{t(lang, "lm.edit")}
                    </button>
                    <button type="button" className="mini-btn" onClick={() => setQr(link)}>
                      <span className="ms">qr_code_2</span>{t(lang, "lm.qr")}
                    </button>
                    <button type="button" className="mini-btn" onClick={() => setUtm(link)}>
                      <span className="ms">campaign</span>UTM
                    </button>
                    <button type="button" className="mini-btn" onClick={() => toggleStatus(link)}>
                      <span className="ms">{link.status === "ACTIVE" ? "pause" : "play_arrow"}</span>
                      {link.status === "ACTIVE" ? t(lang, "lm.pause") : t(lang, "lm.resume")}
                    </button>
                    <button type="button" className="mini-btn danger" onClick={() => removeLink(link)}>
                      <span className="ms">delete</span>{t(lang, "lm.delete")}
                    </button>
                  </div>
                </div>
                {statsId === link.id ? (
                  <LinkStats linkId={link.id} slug={link.slug} lang={lang} onClose={() => setStatsId(null)} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {editing ? (
        <LinkEditModal link={editing} plan={plan} lang={lang} onSaved={applyUpdated} onClose={() => setEditing(null)} />
      ) : null}
      {qr ? (
        <LinkQrModal shortUrl={qr.shortUrl} slug={qr.slug} lang={lang} onClose={() => setQr(null)} />
      ) : null}
      {utm ? (
        <UtmBuilderModal link={utm} lang={lang} onSaved={applyUpdated} onClose={() => setUtm(null)} />
      ) : null}
      {bulkOpen ? (
        <BulkImportModal
          lang={lang}
          onDone={(created) => {
            if (created.length > 0) {
              setItems((prev) => [
                ...created.map((c) => ({ ...c, expiresAt: null })),
                ...prev,
              ]);
              router.refresh();
            }
          }}
          onClose={() => setBulkOpen(false)}
        />
      ) : null}
    </>
  );
}
