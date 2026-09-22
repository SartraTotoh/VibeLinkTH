"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { t } from "@/lib/i18n";
import { useLang } from "@/components/i18n/language";

export function SettingsActions({ hasSubscription }: { hasSubscription: boolean }) {
  const [lang] = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");

  async function openPortal() {
    setBusy("portal");
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
      setBusy(null);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        return;
      }
      await signOut({ redirect: false });
      window.location.assign("/?deleted=1");
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="settings-actions">
      <div className="settings-row">
        <div>
          <b>{t(lang, "set.export")}</b>
          <small>{t(lang, "set.exportSub")}</small>
        </div>
        <a className="mini-btn" href="/api/account/export">
          <span className="ms">download</span>
          {t(lang, "set.download")}
        </a>
      </div>

      <div className="settings-row">
        <div>
          <b>{t(lang, "set.billing")}</b>
          <small>{t(lang, "set.billingSub")}</small>
        </div>
        <button className="mini-btn" onClick={openPortal} disabled={!hasSubscription || busy === "portal"}>
          <span className="ms">credit_card</span>
          {busy === "portal" ? t(lang, "set.opening") : hasSubscription ? t(lang, "set.openBilling") : t(lang, "set.noSub")}
        </button>
      </div>

      <div className="settings-row danger">
        <div>
          <b>{t(lang, "set.danger")}</b>
          <small>{t(lang, "set.dangerSub")}</small>
        </div>
        {confirming ? (
          <form onSubmit={deleteAccount} className="delete-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(lang, "set.deletePh")}
              autoComplete="current-password"
              required
            />
            <button className="mini-btn danger" type="submit" disabled={busy === "delete"}>
              {busy === "delete" ? t(lang, "set.deleting") : t(lang, "set.deleteConfirm")}
            </button>
            <button className="mini-btn" type="button" onClick={() => setConfirming(false)}>
              {t(lang, "set.cancel")}
            </button>
          </form>
        ) : (
          <button className="mini-btn danger" onClick={() => setConfirming(true)}>
            <span className="ms">delete</span>
            {t(lang, "set.deleteAsk")}
          </button>
        )}
      </div>

      {error ? <p className="bill-error">{error}</p> : null}
    </div>
  );
}
