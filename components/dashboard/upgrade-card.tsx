"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  currentPlan: string;
  lang: Lang;
};

export function UpgradeCard({ currentPlan, lang }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMember = currentPlan === "CREATOR" || currentPlan === "CREATOR_PLUS";

  async function upgrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "CREATOR" }),
      });
      const data = await res.json().catch(() => null);
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data?.error ?? t(lang, "lm.errGeneric"));
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data?.error ?? t(lang, "lm.errGeneric"));
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="member-strip">
      <span className={`status-dot${isMember ? "" : " free"}`} aria-hidden />
      <div>
        <b>{isMember ? t(lang, "up.active") : t(lang, "up.title")}</b>
        <small>{isMember ? t(lang, "up.activeSub") : t(lang, "up.desc")}</small>
        <small className="secure">
          <span className="ms">lock</span>
          {isMember ? t(lang, "up.manage") : t(lang, "up.secure")}
        </small>
      </div>
      {isMember ? (
        <button className="button ghost" onClick={openPortal} disabled={busy}>
          {busy ? t(lang, "set.opening") : t(lang, "up.portal")}
        </button>
      ) : (
        <button className="button secondary" onClick={upgrade} disabled={busy}>
          <span className="ms">bolt</span>
          {busy ? t(lang, "up.busy") : t(lang, "up.btn")}
        </button>
      )}
      {error ? <p className="bill-error">{error}</p> : null}
    </div>
  );
}
