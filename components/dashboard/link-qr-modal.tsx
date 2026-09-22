"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { t, type Lang } from "@/lib/i18n";

export function LinkQrModal({
  shortUrl,
  slug,
  lang,
  onClose,
}: {
  shortUrl: string;
  slug: string;
  lang: Lang;
  onClose: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(shortUrl, { width: 640, margin: 1 })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [shortUrl]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card modal-narrow"
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, "qr.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{t(lang, "qr.title")}</h2>
          <button type="button" className="mini-btn" onClick={onClose} aria-label={t(lang, "st.close")}>
            <span className="ms">close</span>
          </button>
        </div>
        <p className="panel-sub">/{slug} — {t(lang, "qr.sub")}</p>
        {error ? (
          <div className="auth-error">{t(lang, "lm.errGeneric")}</div>
        ) : src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`QR ${shortUrl}`} className="qr-img" width={320} height={320} />
            <a className="button secondary" href={src} download={`vibelink-${slug}-qr.png`}>
              <span className="ms">download</span>
              {t(lang, "qr.download")}
            </a>
          </>
        ) : (
          <p className="panel-sub">{t(lang, "st.loading")}</p>
        )}
      </div>
    </div>
  );
}
