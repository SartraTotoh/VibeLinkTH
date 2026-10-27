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

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Account & Vibe Slug
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [vibeSlug, setVibeSlug] = useState("");
  const [accepted, setAccepted] = useState(false);

  // Step 2: Contact & Social Handles
  const [phone, setPhone] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");
  const [lineId, setLineId] = useState("");
  const [facebook, setFacebook] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [youtube, setYoutube] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(lang === "th" ? "กรุณากรอกอีเมลและรหัสผ่าน" : "Please enter email and password");
      return;
    }
    if (password.length < 8) {
      setError(lang === "th" ? "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" : "Password must be at least 8 characters");
      return;
    }
    if (!accepted) {
      setError(lang === "th" ? "กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว" : "Please accept terms and privacy policy");
      return;
    }
    setStep(2);
  }

  async function completeRegistration(skipSocials = false) {
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
          vibeSlug: vibeSlug.trim() || undefined,
          acceptedTerms: accepted,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t(lang, "lm.errGeneric"));
        setStep(1);
        return;
      }

      // Auto sign-in
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setError(t(lang, "auth.registerDup"));
        return;
      }

      // If user filled socials in Step 2, register them as links
      if (!skipSocials) {
        const socialItems = [
          { platform: "tiktok", val: tiktok, title: "TikTok", url: tiktok.startsWith("http") ? tiktok : `https://www.tiktok.com/@${tiktok.replace(/^@/, "")}` },
          { platform: "instagram", val: instagram, title: "Instagram", url: instagram.startsWith("http") ? instagram : `https://www.instagram.com/${instagram.replace(/^@/, "")}` },
          { platform: "line", val: lineId, title: "LINE", url: lineId.startsWith("http") ? lineId : `https://line.me/R/ti/p/${lineId}` },
          { platform: "facebook", val: facebook, title: "Facebook", url: facebook.startsWith("http") ? facebook : `https://www.facebook.com/${facebook}` },
          { platform: "x", val: xHandle, title: "X (Twitter)", url: xHandle.startsWith("http") ? xHandle : `https://x.com/${xHandle.replace(/^@/, "")}` },
          { platform: "youtube", val: youtube, title: "YouTube", url: youtube.startsWith("http") ? youtube : `https://www.youtube.com/@${youtube.replace(/^@/, "")}` },
        ].filter((item) => item.val.trim().length > 0);

        for (const item of socialItems) {
          await fetch("/api/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.title,
              destinationUrl: item.url,
              platform: item.platform,
            }),
          }).catch(() => null);
        }
      }

      router.push("/dashboard/overview");
      router.refresh();
    } catch {
      setError(t(lang, "lm.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <div className="auth-card" style={{ width: step === 2 ? "min(560px, 100%)" : "min(480px, 100%)" }}>
        {/* Step Indicator Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="eyebrow">
            <span>{step === 1 ? "STEP 1 OF 2 · ACCOUNT SETUP" : "STEP 2 OF 2 · CONNECT SOCIALS"}</span>
          </div>
          <LangSwitcher />
        </div>

        {step === 1 ? (
          <>
            <h1>{t(lang, "auth.signupTitle")}</h1>
            <p className="auth-sub">{t(lang, "auth.signupSub")}</p>

            <form onSubmit={handleNextStep} className="auth-form">
              <label className="field">
                <span>{t(lang, "auth.email")} *</span>
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
                <span>{t(lang, "auth.nickname")} (ชื่อแสดงบนหน้าโปรไฟล์)</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น มิ้นท์ มู้ดดี"
                  maxLength={60}
                  autoComplete="nickname"
                />
              </label>

              <label className="field">
                <span>จองชื่อ Vibe Link ประจำตัว (Claim your link slug)</span>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={vibeSlug}
                    onChange={(e) => setVibeSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="mintmood"
                    maxLength={30}
                    style={{ paddingLeft: 14 }}
                  />
                </div>
                <small style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
                  {vibeSlug ? `ลิงก์ของคุณ: vibelinkth.com/vibe/${vibeSlug}` : "ลิงก์ของคุณ: vibelinkth.com/vibe/ชื่อคุณ"}
                </small>
              </label>

              <label className="field">
                <span>{t(lang, "auth.password")} *</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="consent" style={{ marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  required
                />
                <span>
                  {t(lang, "auth.consent")}{" "}
                  <Link href="/terms" target="_blank" style={{ color: "var(--primary-text)", fontWeight: 800 }}>
                    {t(lang, "auth.terms")}
                  </Link>{" "}
                  {lang === "th" ? "และ" : "and"}{" "}
                  <Link href="/privacy" target="_blank" style={{ color: "var(--primary-text)", fontWeight: 800 }}>
                    {t(lang, "auth.privacy")}
                  </Link>
                </span>
              </label>

              {error ? <div className="auth-error">{error}</div> : null}

              <button type="submit" className="button primary" disabled={!accepted} style={{ marginTop: 8 }}>
                <span>ต่อไป: เชื่อมต่อบัญชีโซเชียล & เบอร์โทร</span>
                <span className="ms">arrow_forward</span>
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>เชื่อมต่อโซเชียล & เบอร์โทร</h1>
            <p className="auth-sub">
              กรอกช่องทางที่คุณมีเพื่อให้ระบบสร้างปุ่มติดตามลงบน Vibe Page อัตโนมัติ (สามารถแก้ไขภายหลังใน Settings ได้ตลอดเวลา)
            </p>

            <div className="auth-form">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <label className="field">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="ms" style={{ fontSize: 17, color: "var(--primary)" }}>call</span>
                    เบอร์โทรศัพท์ (SMS / ติดต่อ)
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                  />
                </label>

                <label className="field">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="ms" style={{ fontSize: 17, color: "var(--primary)" }}>music_note</span>
                    TikTok Handle
                  </span>
                  <input
                    type="text"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="@username"
                  />
                </label>

                <label className="field">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="ms" style={{ fontSize: 17, color: "var(--secondary)" }}>photo_camera</span>
                    Instagram Handle
                  </span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@username"
                  />
                </label>

                <label className="field">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="ms" style={{ fontSize: 17, color: "#06c755" }}>chat</span>
                    LINE ID หรือ LINE OA
                  </span>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="@lineoa"
                  />
                </label>

                <label className="field">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="ms" style={{ fontSize: 17, color: "#1877f2" }}>thumb_up</span>
                    Facebook Page
                  </span>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="ชื่อเพจหรือ URL"
                  />
                </label>

                <label className="field">
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="ms" style={{ fontSize: 17, color: "#fff" }}>tag</span>
                    X (Twitter) Handle
                  </span>
                  <input
                    type="text"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="@username"
                  />
                </label>
              </div>

              <label className="field" style={{ marginTop: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="ms" style={{ fontSize: 17, color: "#ff0000" }}>smart_display</span>
                  YouTube Channel (URL หรือ @channel)
                </span>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="@youtubechannel หรือ URL"
                />
              </label>

              {error ? <div className="auth-error">{error}</div> : null}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="button primary"
                  disabled={loading}
                  onClick={() => completeRegistration(false)}
                >
                  <span className="ms">check_circle</span>
                  {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี & ซิงค์ลง Vibe Page ทันที ✨"}
                </button>

                <button
                  type="button"
                  className="button secondary"
                  disabled={loading}
                  onClick={() => completeRegistration(true)}
                  style={{ minHeight: 44, fontSize: 14 }}
                >
                  <span>ข้ามขั้นตอนนี้ไปก่อน (จัดการใน Dashboard ทีหลัง)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, marginTop: 4 }}
                >
                  ← ย้อนกลับไปแก้ไขข้อมูลบัญชี
                </button>
              </div>
            </div>
          </>
        )}

        <div className="auth-alt" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <span>
            {t(lang, "auth.hasAccount")}{" "}
            <Link href="/login" style={{ color: "var(--primary-text)", fontWeight: 800 }}>
              {t(lang, "auth.toLogin")} ↗
            </Link>
          </span>
          <Link href="/" style={{ color: "var(--muted)", fontSize: 14 }}>
            ← {t(lang, "nav.home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
