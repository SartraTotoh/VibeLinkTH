"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { t } from "@/lib/i18n";
import { useLang, LangSwitcher } from "@/components/i18n/language";

export default function LoginPage() {
  const router = useRouter();
  const [lang] = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifyBlock, setVerifyBlock] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") setNotice(t(lang, "auth.verifiedLogin"));
    else if (params.get("reset") === "1") setNotice(t(lang, "auth.resetDoneLogin"));
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
      router.push(next && next.startsWith("/") ? next : "/dashboard/overview");
      router.refresh();
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>
        </Link>
        <div className="dash-actions">
          <LangSwitcher />
          <Link href="/qr" className="mini-btn">
            <span className="ms">qr_code_2</span>
            QR
          </Link>
          <Link href="/signup" className="mini-btn">
            <span className="ms">person_add</span>
            {lang === "th" ? "สมัคร" : "Sign Up"}
          </Link>
        </div>
      </nav>

      <div className="auth-shell">
        <div className="auth-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="eyebrow">
              <span>VIBELINK IDENTITY</span>
            </div>
          </div>

          <h1>{t(lang, "auth.loginTitle")}</h1>
          <p className="auth-sub">{t(lang, "auth.loginSub")}</p>

          <form onSubmit={onSubmit} className="auth-form">
            <label className="field">
              <span>{t(lang, "auth.email")}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@email.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {t(lang, "auth.password")}
                <Link href="/forgot-password" style={{ color: "var(--primary-text)", fontWeight: 700, fontSize: 15 }}>
                  {t(lang, "auth.forgot")}
                </Link>
              </span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(lang, "auth.passwordPh")}
                  autoComplete="current-password"
                  required
                  style={{ width: "100%", paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  style={{
                    position: "absolute",
                    right: 12,
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 4,
                  }}
                >
                  <span className="ms" style={{ fontSize: 20 }}>{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </label>

            {notice ? <div className="notice">{notice}</div> : null}
            {verifyBlock ? (
              <div className="notice">
                {t(lang, "auth.verifyNeeded")}{" "}
                <Link href="/verify-email" style={{ color: "var(--primary-text)", fontWeight: 800 }}>
                  {t(lang, "auth.resendLink")}
                </Link>
              </div>
            ) : null}
            {error ? <div className="auth-error">{error}</div> : null}

            <button type="submit" className="button primary" disabled={loading} style={{ marginTop: 8 }}>
              <span className="ms">login</span>
              {loading ? (lang === "th" ? "กำลังเข้า..." : "Signing in...") : (lang === "th" ? "เข้าสู่ระบบ" : "Sign In")}
            </button>
          </form>

          <div className="auth-alt" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <span>
              {t(lang, "auth.noAccount")}{" "}
              <Link href="/signup" style={{ color: "var(--primary-text)", fontWeight: 800 }}>
                {t(lang, "auth.signupHere")} ↗
              </Link>
            </span>
            <Link href="/" style={{ color: "var(--muted)", fontSize: 15 }}>
              ← {t(lang, "nav.home")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
