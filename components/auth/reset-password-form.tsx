"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { useLang } from "@/components/i18n/language";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [lang] = useLang();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t(lang, "auth.passMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-card">
        <div className="eyebrow">VibeLink Account</div>
        <h1>{t(lang, "auth.badToken")}</h1>
        <p className="auth-sub">{t(lang, "auth.badTokenSub")}</p>
        <div className="auth-alt">
          <Link href="/forgot-password">{t(lang, "auth.newLink")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="eyebrow">VibeLink Account</div>
      <h1>{t(lang, "auth.resetTitle")}</h1>
      <p className="auth-sub">{t(lang, "auth.resetSub")}</p>

      <form onSubmit={onSubmit} className="auth-form">
        <label className="field">
          <span>{t(lang, "auth.newPass")}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(lang, "auth.passwordPh")}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span>{t(lang, "auth.confirmPass")}</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t(lang, "auth.passwordPh")}
            autoComplete="new-password"
            required
          />
        </label>

        {error ? <div className="auth-error">{error}</div> : null}

        <button type="submit" className="button primary" disabled={loading}>
          {loading ? t(lang, "auth.saving") : t(lang, "auth.savePass")}
        </button>
      </form>

      <div className="auth-back">
        <Link href="/login">← {t(lang, "auth.toLogin")}</Link>
      </div>
    </div>
  );
}
