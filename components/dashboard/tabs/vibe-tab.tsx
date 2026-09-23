"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import type { VibeUser } from "./types";
import styles from "./tabs.module.css";

type Props = {
  vibe: VibeUser;
  activeLinks: number;
  lang: Lang;
};

export function VibeTab({ vibe, activeLinks, lang }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(vibe.vibeSlug ?? "");
  const [displayName, setDisplayName] = useState(vibe.displayName ?? "");
  const [title, setTitle] = useState(vibe.vibeTitle ?? "");
  const [bio, setBio] = useState(vibe.vibeBio ?? "");
  const [emoji, setEmoji] = useState(vibe.vibeEmoji ?? "⚡");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const previewUrl = slug ? `/vibe/${slug.toLowerCase()}` : null;

  async function save() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/vibe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibeSlug: slug, displayName, vibeTitle: title, vibeBio: bio, vibeEmoji: emoji }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(data?.error ?? "บันทึกไม่สำเร็จ ลองใหม่");
        return;
      }
      setSlug(data.vibe.vibeSlug ?? "");
      setOk(previewUrl ? "บันทึกแล้ว — หน้า Vibe เปิดใช้งาน" : "บันทึกแล้ว — ยังไม่ได้ตั้ง slug");
      router.refresh();
    } catch {
      setErr("เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${previewUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr("คัดลอกไม่สำเร็จ");
    }
  }

  const published = Boolean(vibe.vibeSlug || slug);

  return (
    <div className={styles.pane}>
      <p className={styles.paneSub}>
        {lang === "th"
          ? "หน้าเดียวรวมโปรไฟล์ + ลิงก์ทั้งหมดของคุณ ใช้แชร์ให้ผู้ชมเข้าเดียวจบ เปิดใช้งาน = ตั้ง slug"
          : "One page combining your profile + links. Enable by setting a slug"}
      </p>

      <div className={styles.vibeFrame}>
        <div className="panel" style={{ flex: 1, minWidth: 280, borderColor: "var(--line-pink)" }}>
          <div className="panel-head">
            <span className="ms">auto_awesome</span>
            <h2>{lang === "th" ? "ตั้งค่าหน้า Vibe" : "Vibe Page setup"}</h2>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <span>{lang === "th" ? "slug (ใช้เปิดหน้า — พิมพ์เล็ก/ตัวเลข/-)" : "slug (that opens the page)"}</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="mintmood"
              maxLength={30}
            />
            <small>
              {previewUrl ? `${window.location.origin}${previewUrl}` : lang === "th" ? "ยังไม่เปิด — ตั้ง slug แล้วบันทึก" : "not published yet"}
            </small>
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <span>{lang === "th" ? "ชื่อ" : "Name"}</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="@mintmood" maxLength={60} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <span>Emoji / avatar</span>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="⚡" maxLength={4} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <span>{lang === "th" ? "คำโปรย" : "Headline"}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="สายแชร์ลิงก์วาร์ป" maxLength={120} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <span>{lang === "th" ? "แนะนำตัว / bio" : "Bio"}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="รวมลิงก์ร้านค้าและคอนเทนต์ที่ต้องแชร์ ไว้หน้าเดียว"
              rows={3}
              maxLength={400}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid var(--line)",
                background: "var(--input)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
          <div className="rowbtns" style={{ marginTop: 14 }}>
            <button type="button" className="button primary" onClick={save} disabled={busy}>
              <span className="ms">check_circle</span>
              {busy ? (lang === "th" ? "กำลังบันทึก..." : "Saving...") : lang === "th" ? "บันทึก" : "Save"}
            </button>
            <button type="button" className="mini-btn" onClick={copyUrl} disabled={!previewUrl || copied}>
              <span className="ms">{copied ? "check" : "copy_link"}</span>
              {copied ? (lang === "th" ? "คัดลอกแล้ว" : "Copied") : lang === "th" ? "คัดลอกลิงก์" : "Copy link"}
            </button>
            {published ? (
              <a className="mini-btn" href={previewUrl!} target="_blank" rel="noopener noreferrer">
                <span className="ms">open_in_new</span>
                {lang === "th" ? "เปิดหน้า" : "Open"}
              </a>
            ) : null}
          </div>
          {err ? <div className="auth-error" style={{ marginTop: 12 }}>{err}</div> : null}
          {ok ? <div className="notice" style={{ marginTop: 12 }}>{ok}</div> : null}
        </div>

        <div className={styles.vibeCard}>
          <div className={styles.vibeAvatar}>{emoji || "⚡"}</div>
          <h3 className={styles.vibeName}>{displayName || "คุณ"}</h3>
          {title ? <p className={styles.vibeTitle}>{title}</p> : null}
          {bio ? <p className={styles.vibeBio}>{bio}</p> : null}
          <div className={styles.vibeLinks}>
            <span className={styles.vibeUrl}>
              {activeLinks} {lang === "th" ? "ลิงก์พร้อมแสดงอัตโนมัติ" : "links auto-listed"}
            </span>
            {previewUrl ? (
              <a className={styles.vibeLink} href={previewUrl} target="_blank" rel="noopener noreferrer">
                <span className="ms" style={{ fontSize: 14, verticalAlign: -2 }}>open_in_new</span>{" "}
                {previewUrl}
              </a>
            ) : (
              <span className={styles.vibeLink} style={{ opacity: 0.6, cursor: "default" }}>
                {lang === "th" ? "ยังไม่ได้ตั้ง slug" : "slug not set"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}