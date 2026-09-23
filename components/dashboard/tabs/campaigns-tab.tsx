"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import type { CampaignItem, AnalyticsPayload } from "./types";
import { FileCharsetGuard } from "@/components/charset/file-charset-guard";
import styles from "./tabs.module.css";

const fmt = (n: number) => n.toLocaleString("en-US");

type Props = {
  initialCampaigns: CampaignItem[];
  perf: AnalyticsPayload["perf"];
  lang: Lang;
};

const EMPTY = { name: "", source: "tiktok", medium: "bio", content: "", linkId: "" };

export function CampaignsTab({ initialCampaigns, perf, lang }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CampaignItem[]>(initialCampaigns);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const activeLinks = perf.filter((l) => l.status === "ACTIVE");

  const set = (k: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const isEdit = Boolean(editingId);
      const res = await fetch(`${isEdit ? `/api/campaigns/${editingId}` : "/api/campaigns"}`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          source: form.source,
          medium: form.medium,
          content: form.content || null,
          linkId: form.linkId || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(data?.error ?? (lang === "th" ? "บันทึกแคมเปญไม่สำเร็จ" : "Save failed"));
        return;
      }
      const c = data.campaign as CampaignItem;
      if (isEdit) {
        setItems((prev) => prev.map((x) => (x.id === c.id ? c : x)));
        setOk(lang === "th" ? "แก้ไขแคมเปญแล้ว" : "Campaign updated");
      } else {
        setItems((prev) => [c, ...prev]);
        setOk(lang === "th" ? "สร้างแคมเปญแล้ว" : "Campaign created");
      }
      setForm(EMPTY);
      setEditingId(null);
      router.refresh();
    } catch {
      setErr(lang === "th" ? "เกิดข้อผิดพลาด ลองอีกครั้ง" : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: CampaignItem) {
    setEditingId(c.id);
    setForm({ name: c.name, source: c.source, medium: c.medium, content: c.content ?? "", linkId: c.linkId ?? "" });
    setErr(null);
    setOk(null);
  }

  async function remove(c: CampaignItem) {
    if (!window.confirm(`${lang === "th" ? "ลบแคมเปญ" : "Delete campaign"} "${c.name}"?`)) return;
    setItems((prev) => prev.filter((x) => x.id !== c.id));
    const res = await fetch(`/api/campaigns/${c.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setItems((prev) => [...prev, c]);
      setErr(lang === "th" ? "ลบไม่สำเร็จ" : "Delete failed");
      return;
    }
    if (editingId === c.id) {
      setEditingId(null);
      setForm(EMPTY);
    }
    router.refresh();
  }

  return (
    <div className={styles.pane}>
      <div className="panel" style={{ borderColor: "var(--line-pink)" }}>
        <div className="panel-head">
          <span className="ms">campaign</span>
          <h2>
            {editingId
              ? lang === "th" ? "แก้ไขแคมเปญ" : "Edit campaign"
              : lang === "th" ? "สร้างแคมเปญใหม่" : "New campaign"}
          </h2>
        </div>
        <p className={styles.paneSub}>
          {lang === "th"
            ? "ลิงก์ UTM ของคุณลงทะเบียนเป็นแคมเปญ — เพื่อติดตามว่าช่องทางไหนขายดี"
            : "Register UTM campaigns to track which channels convert"}
        </p>
        <form onSubmit={submit} className={styles.campForm} style={{ marginTop: 12 }}>
          <label className="field">
            <span>{lang === "th" ? "ชื่อแคมเปญ" : "Campaign name"}</span>
            <input value={form.name} onChange={set("name")} placeholder="โปรโมชัน 9.9" required maxLength={80} />
            <FileCharsetGuard value={form.name} field={lang === "th" ? "ชื่อแคมเปญ" : "Campaign name"} />
          </label>
          <label className="field">
            <span>utm_source</span>
            <input value={form.source} onChange={set("source")} placeholder="tiktok" required maxLength={40} />
          </label>
          <label className="field">
            <span>utm_medium</span>
            <input value={form.medium} onChange={set("medium")} placeholder="bio" required maxLength={40} />
          </label>
          <label className="field">
            <span>utm_content</span>
            <input value={form.content} onChange={set("content")} placeholder="banner-01" maxLength={80} />
          </label>
          <label className={`field ${styles.campFormWide}`}>
            <span>{lang === "th" ? "ลิงก์ปลายทาง (ไม่บังคับ)" : "Linked short link (optional)"}</span>
            <select value={form.linkId} onChange={set("linkId")}>
              <option value="">—</option>
              {activeLinks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} (/{l.slug})
                </option>
              ))}
            </select>
          </label>
          <div className={styles.campFormWide} style={{ display: "flex", gap: 8 }}>
            <button className="button primary" type="submit" disabled={busy}>
              <span className="ms">save</span>
              {busy
                ? lang === "th" ? "กำลังบันทึก..." : "Saving..."
                : editingId
                  ? lang === "th" ? "บันทึกการแก้ไข" : "Save changes"
                  : lang === "th" ? "สร้างแคมเปญ" : "Create"}
            </button>
            {editingId ? (
              <button
                className="mini-btn"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY);
                }}
              >
                {lang === "th" ? "ยกเลิก" : "Cancel"}
              </button>
            ) : null}
          </div>
        </form>
        {err ? <div className="auth-error" style={{ marginTop: 12 }}>{err}</div> : null}
        {ok ? <div className="notice" style={{ marginTop: 12 }}>{ok}</div> : null}
      </div>

      <div className="panel" style={{ borderColor: "var(--line-pink)" }}>
        <div className="panel-head">
          <span className="ms">list</span>
          <h2>{lang === "th" ? "แคมเปญของคุณ" : "Your campaigns"}</h2>
        </div>
        {items.length === 0 ? (
          <div className="empty">
            {lang === "th" ? "ยังไม่มีแคมเปญ — สร้างแรกเลย แล้วฉีกพอกันยอด" : "No campaigns yet — create one to start tracking"}
          </div>
        ) : (
          <div className={styles.pane}>
            {items.map((c) => (
              <div className={styles.campCard} key={c.id}>
                <div className={styles.campHead}>
                  <b>{c.name}</b>
                  <span className={styles.campClicks}>
                    <span className="ms" style={{ fontSize: 14, verticalAlign: -2 }}>bolt</span> {fmt(c.clicks)} {lang === "th" ? "คลิก" : "clicks"}
                  </span>
                </div>
                <div className={styles.campMeta}>
                  <span className={styles.tag}>source: {c.source}</span>
                  <span className={styles.tag}>medium: {c.medium}</span>
                  {c.content ? <span className={`${styles.tag} ${styles.tagNeutral}`}>content: {c.content}</span> : null}
                </div>
                <p className={styles.campNote}>
                  {c.linkSlug
                    ? lang === "th" ? `ผูกกับลิงก์ /${c.linkSlug}${c.linkTitle ? ` (${c.linkTitle})` : ""}` : `Linked to /${c.linkSlug}`
                    : lang === "th" ? "ยังไม่ได้ผูกกับลิงก์ไหน" : "No link attached"}
                  {" · "}
                  {new Date(c.createdAt).toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className="rowbtns" style={{ marginTop: 10 }}>
                  <button type="button" className="mini-btn" onClick={() => startEdit(c)}>
                    <span className="ms">edit</span>
                    {lang === "th" ? "แก้ไข" : "Edit"}
                  </button>
                  <button type="button" className="mini-btn danger" onClick={() => remove(c)}>
                    <span className="ms">delete</span>
                    {lang === "th" ? "ลบ" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}