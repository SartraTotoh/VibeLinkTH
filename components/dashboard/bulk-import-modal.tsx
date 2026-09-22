"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { LinkItem } from "./link-manager";

type RowResult = { line: string; ok: boolean; slug?: string; error?: string };

export function BulkImportModal({
  lang,
  onDone,
  onClose,
}: {
  lang: Lang;
  onDone: (created: LinkItem[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<RowResult[] | null>(null);

  async function runImport() {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0 || lines.length > 50) {
      setResults([
        {
          line: "",
          ok: false,
          error: lines.length === 0 ? t(lang, "lm.errGeneric") : "สูงสุด 50 บรรทัดต่อครั้ง / max 50 lines per batch",
        },
      ]);
      return;
    }
    setBusy(true);
    const out: RowResult[] = [];
    const created: LinkItem[] = [];
    for (const raw of lines) {
      let title: string | undefined;
      let destinationUrl = raw;
      const pipe = raw.indexOf("|");
      if (pipe >= 0) {
        title = raw.slice(0, pipe).trim() || undefined;
        destinationUrl = raw.slice(pipe + 1).trim();
      }
      try {
        const res = await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destinationUrl, title }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          out.push({ line: raw, ok: false, error: data?.error ?? t(lang, "lm.errGeneric") });
        } else {
          out.push({ line: raw, ok: true, slug: data.link.slug as string });
          created.push(data.link as LinkItem);
        }
      } catch {
        out.push({ line: raw, ok: false, error: t(lang, "lm.errGeneric") });
      }
      setResults([...out]);
    }
    setBusy(false);
    onDone(created);
  }

  const okCount = results?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, "bk.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t(lang, "bk.title")}</h2>
          <button type="button" className="mini-btn" onClick={onClose} aria-label={t(lang, "st.close")}>
            <span className="ms">close</span>
          </button>
        </div>
        <p className="panel-sub">{t(lang, "bk.sub")}</p>
        <label className="field">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(lang, "bk.ph")}
            rows={6}
            disabled={busy}
          />
        </label>
        {results ? (
          <div className="bulk-results" aria-live="polite">
            <b>
              {t(lang, "bk.done")}: {okCount}/{results.length} {t(lang, "bk.ok")}
            </b>
            <ul>
              {results.map((r, i) => (
                <li key={`${i}-${r.line}`} className={r.ok ? "ok" : "fail"}>
                  <span className="ms">{r.ok ? "check_circle" : "error"}</span>
                  <span>
                    {r.ok ? `/${r.slug}` : r.line || r.error}
                    {!r.ok && r.line ? ` — ${r.error}` : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="rowbtns" style={{ marginTop: 12 }}>
          <button type="button" className="button primary" onClick={runImport} disabled={busy}>
            {busy ? t(lang, "bk.importing") : t(lang, "bk.import")}
          </button>
        </div>
      </div>
    </div>
  );
}
