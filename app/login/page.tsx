"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { t } from "@/lib/i18n";
import { useLang, LangSwitcher } from "@/components/i18n/language";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifyBlock, setVerifyBlock] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") setNotice(t(lang, "auth.verifiedLogin"));
    else if (params.get("reset") === "1") setNotice(t(lang, "auth.resetDoneLogin"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifyBlock(false);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        if ((res as { code?: string }).code === "EmailNotVerified") {
          setVerifyBlock(true);
          return;
        }
        setError(t(lang, "auth.badCreds"));
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
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
        <h1>{t(lang, "auth.loginTitle")}</h1>
        <p className="auth-sub">{t(lang, "auth.loginSub")}</p>

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
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {t(lang, "auth.password")}
              <Link href="/forgot-password" style={{ color: "var(--primary-text)", fontWeight: 700 }}>
                {t(lang, "auth.forgot")}
              </Link>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(lang, "auth.passwordPh")}
              autoComplete="current-password"
              required
            />
          </label>

          {notice ? <div className="notice">{notice}</div> : null}
          {verifyBlock ? (
            <div className="notice">
              {t(lang, "auth.verifyNeeded")}{" "}
              <Link href="/verify-email" style={{ color: "var(--primary-text)", fontWeight: 700 }}>
                {t(lang, "auth.resendLink")}
              </Link>
            </div>
          ) : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" className="button primary" disabled={loading}>
            {loading ? t(lang, "auth.loggingIn") : t(lang, "auth.loginBtn")}
          </button>
        </form>

        <div className="auth-alt" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>
            {t(lang, "auth.noAccount")} <Link href="/signup">{t(lang, "auth.signupHere")}</Link>
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
