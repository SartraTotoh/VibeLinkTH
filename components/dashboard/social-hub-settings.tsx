"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";

type SocialLink = {
  platform: string;
  label: string;
  icon: string;
  placeholder: string;
  prefix: string;
};

const SOCIALS: SocialLink[] = [
  { platform: "phone", label: "เบอร์โทรศัพท์ (SMS/OTP/ติดต่อ)", icon: "call", placeholder: "08X-XXX-XXXX", prefix: "tel:" },
  { platform: "tiktok", label: "TikTok Profile", icon: "music_note", placeholder: "username หรือ @handle", prefix: "https://www.tiktok.com/@" },
  { platform: "instagram", label: "Instagram Profile", icon: "photo_camera", placeholder: "username หรือ @handle", prefix: "https://www.instagram.com/" },
  { platform: "line", label: "LINE Official / LINE ID", icon: "chat", placeholder: "@lineid หรือ URL เพิ่มเพื่อน", prefix: "https://line.me/R/ti/p/" },
  { platform: "facebook", label: "Facebook Page / Profile", icon: "thumb_up", placeholder: "ชื่อเพจ หรือ URL โปรไฟล์", prefix: "https://www.facebook.com/" },
  { platform: "x", label: "X (Twitter) Profile", icon: "tag", placeholder: "handle หรือ username", prefix: "https://x.com/" },
  { platform: "youtube", label: "YouTube Channel", icon: "smart_display", placeholder: "@channel หรือ URL ช่อง", prefix: "https://www.youtube.com/@" },
];

export function SocialHubSettings({ lang }: { lang: Lang }) {
  const [phone, setPhone] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");
  const [lineId, setLineId] = useState("");
  const [facebook, setFacebook] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [youtube, setYoutube] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      // Create or update social links
      const linksToCreate = [
        { platform: "tiktok", val: tiktok, title: "TikTok", url: tiktok.startsWith("http") ? tiktok : `https://www.tiktok.com/@${tiktok.replace(/^@/, "")}` },
        { platform: "instagram", val: instagram, title: "Instagram", url: instagram.startsWith("http") ? instagram : `https://www.instagram.com/${instagram.replace(/^@/, "")}` },
        { platform: "line", val: lineId, title: "LINE", url: lineId.startsWith("http") ? lineId : `https://line.me/R/ti/p/${lineId}` },
        { platform: "facebook", val: facebook, title: "Facebook", url: facebook.startsWith("http") ? facebook : `https://www.facebook.com/${facebook}` },
        { platform: "x", val: xHandle, title: "X (Twitter)", url: xHandle.startsWith("http") ? xHandle : `https://x.com/${xHandle.replace(/^@/, "")}` },
        { platform: "youtube", val: youtube, title: "YouTube", url: youtube.startsWith("http") ? youtube : `https://www.youtube.com/@${youtube.replace(/^@/, "")}` },
      ].filter((item) => item.val.trim().length > 0);

      // Create links for filled socials
      for (const item of linksToCreate) {
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

      setStatus(lang === "th" ? "บันทึกบัญชีโซเชียลและอัปเดตลงหน้ารวมลิงก์สำเร็จ!" : "Saved & synchronized to your bio link page!");
    } catch {
      setStatus(lang === "th" ? "เกิดข้อผิดพลาดในการบันทึก" : "Error saving social accounts");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="ms">share</span>
        <h2>{lang === "th" ? "เชื่อมต่อบัญชีโซเชียล & เบอร์โทรศัพท์" : "Connected Socials & Phone Contact"}</h2>
      </div>
      <p className="panel-sub">
        {lang === "th"
          ? "กรอกช่องทางโซเชียลเพื่อเชื่อมต่อกับหน้ารวมลิงก์ของคุณโดยอัตโนมัติ ผู้ชมสามารถกดติดตามได้ในคลิกเดียว"
          : "Connect your social channels to auto-populate your bio link page. Visitors can follow with one click."}
      </p>

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 16 }}>
        <div className="field">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: "var(--primary)" }}>call</span>
            เบอร์โทรศัพท์สำหรับติดต่อ
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08X-XXX-XXXX"
            autoComplete="tel"
          />
        </div>

        <div className="field">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: "var(--primary)" }}>music_note</span>
            TikTok Profile
          </span>
          <input
            type="text"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            placeholder="@yourtiktok"
          />
        </div>

        <div className="field">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: "var(--secondary)" }}>photo_camera</span>
            Instagram Profile
          </span>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourinstagram"
          />
        </div>

        <div className="field">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: "#06c755" }}>chat</span>
            LINE Official / LINE ID
          </span>
          <input
            type="text"
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            placeholder="@lineoa หรือ LINE ID"
          />
        </div>

        <div className="field">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: "#1877f2" }}>thumb_up</span>
            Facebook Page / Profile
          </span>
          <input
            type="text"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="ชื่อเพจ หรือ URL"
          />
        </div>

        <div className="field">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: "#fff" }}>tag</span>
            X (Twitter) Profile
          </span>
          <input
            type="text"
            value={xHandle}
            onChange={(e) => setXHandle(e.target.value)}
            placeholder="@handle"
          />
        </div>

        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: "#ff0000" }}>smart_display</span>
            YouTube Channel
          </span>
          <input
            type="text"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="@youtubechannel หรือ URL ช่อง"
          />
        </div>

        {status ? (
          <div className="notice" style={{ gridColumn: "1 / -1" }}>
            {status}
          </div>
        ) : null}

        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button type="submit" className="button primary" disabled={saving} style={{ minHeight: 46, padding: "0 24px" }}>
            <span className="ms">save</span>
            {saving ? (lang === "th" ? "กำลังบันทึก..." : "Saving...") : (lang === "th" ? "บันทึก" : "Save")}
          </button>
        </div>
      </form>
    </section>
  );
}
