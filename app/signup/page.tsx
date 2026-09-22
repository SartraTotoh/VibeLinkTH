"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { t } from "@/lib/i18n";
import { useLang, LangSwitcher } from "@/components/i18n/language";

export default function SignupPage() {
  const router = useRouter();
  const [lang] = useLang();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName.trim() || undefined,
          acceptedTerms: accepted,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        return;
      }

      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setError(t(lang, "auth.registerDup"));
        return;
      }
      router.push("/dashboard");
      router.refresh();
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
        <h1>{t(lang, "auth.signupTitle")}</h1>
        <p className="auth-sub">{t(lang, "auth.signupSub")}</p>

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
          <label className="field">
            <span>{t(lang, "auth.nickname")}</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="mintmood"
              maxLength={60}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            <span>{t(lang, "auth.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(lang, "auth.passwordPh")}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="consent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              required
            />
            <span>
              {t(lang, "auth.consent")} <Link href="/terms" target="_blank">{t(lang, "auth.terms")}</Link> {lang === "th" ? "และ" : "and"}{" "}
              <Link href="/privacy" target="_blank">{t(lang, "auth.privacy")}</Link>
            </span>
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" className="button primary" disabled={loading || !accepted}>
            {loading ? t(lang, "auth.signingUp") : t(lang, "auth.signupBtn")}
          </button>
        </form>

        <div className="auth-alt" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>
            {t(lang, "auth.hasAccount")} <Link href="/login">{t(lang, "auth.toLogin")}</Link>
          </span>
          <LangSwitcher />
        </div>
        <div className="auth-back">
          <Link href="/">← {t(lang, "nav.home")}</Link>
        </div>
      </div>
    </main>
  );
}
