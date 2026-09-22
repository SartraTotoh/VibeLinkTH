"use client";

import { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useLang, LangSwitcher } from "@/components/i18n/language";

export default function ForgotPasswordPage() {
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
      const res = await fetch("/api/auth/forgot-password", {
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

  return (
    <main className="shell auth-shell">
      <div className="auth-card">
        <div className="eyebrow">VibeLink Account</div>
        <h1>{t(lang, "auth.forgotTitle")}</h1>
        <p className="auth-sub">{t(lang, "auth.forgotSub")}</p>

        {sent ? (
          <>
            <div className="notice">{t(lang, "auth.forgotSent")}</div>
            <div className="auth-alt">
              <Link href="/login">← {t(lang, "auth.toLogin")}</Link>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} className="auth-form">
            <label className="field">
              <span>{t(lang, "auth.email")}</span>
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
              {loading ? t(lang, "auth.forgotSending") : t(lang, "auth.forgotBtn")}
            </button>
          </form>
        )}

        <div className="auth-alt" style={{ display: "flex", justifyContent: "flex-end" }}>
          <LangSwitcher />
        </div>
        <div className="auth-back">
          <Link href="/">← {t(lang, "nav.home")}</Link>
        </div>
      </div>
    </main>
  );
}
