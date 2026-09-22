"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { useLang } from "@/components/i18n/language";

export function RequestVerificationForm() {
  const [lang] = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        return;
      }
      setSent(true);
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="notice" style={{ marginTop: 14 }}>
        {t(lang, "auth.linkSent")}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="auth-form" style={{ marginTop: 14 }}>
      <label className="field">
        <span>{t(lang, "auth.needLink")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="mint@email.com"
          autoComplete="email"
          required
        />
      </label>
      {error ? <div className="auth-error">{error}</div> : null}
      <button type="submit" className="button primary" disabled={loading}>
        {loading ? t(lang, "auth.sending") : t(lang, "auth.sendLink")}
      </button>
    </form>
  );
}
