"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

type Rule = {
  id: string;
  enabled: boolean;
  priority: number;
  keywords: string;
  replyTh: string;
  replyEn: string;
  faqTh: string | null;
  faqEn: string | null;
  category: string;
  hitCount: number;
};

type RuleFeed = {
  rules: Rule[];
  totalHits: number;
};

type Editable = Omit<Rule, "id" | "hitCount">;

export function RulesManagerModule() {
  const [feed, setFeed] = useState<RuleFeed | null>(null);
  const [editing, setEditing] = useState<Editable | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllExpanded() {
    if (expandedIds.size === rules.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(rules.map((r) => r.id)));
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/support/rules", { cache: "no-store" });
      if (!res.ok) return;
      setFeed((await res.json()) as RuleFeed);
    } catch {
      // transient
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function blank(): Editable {
    return {
      enabled: true,
      priority: 100,
      keywords: "",
      replyTh: "",
      replyEn: "",
      faqTh: "",
      faqEn: "",
      category: "general",
    };
  }

  function startEdit(rule: Rule) {
    setEditing({
      enabled: rule.enabled,
      priority: rule.priority,
      keywords: rule.keywords,
      replyTh: rule.replyTh,
      replyEn: rule.replyEn,
      faqTh: rule.faqTh ?? "",
      faqEn: rule.faqEn ?? "",
      category: rule.category,
    });
    setEditingId(rule.id);
    setCreating(false);
    setError(null);
    setNotice(null);
  }

  function startCreate() {
    setEditing(blank());
    setEditingId(null);
    setCreating(true);
    setError(null);
    setNotice(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(editingId ?? "new");
    setError(null);
    setNotice(null);
    try {
      const res = creating
        ? await fetch("/api/dev/support/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editing),
          })
        : await fetch(`/api/dev/support/rules/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editing),
          });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      setEditing(null);
      setCreating(false);
      setNotice(creating ? "สร้างกฎแล้ว" : "บันทึกกฎแล้ว");
      load();
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(rule: Rule) {
    setBusy(rule.id);
    setError(null);
    try {
      const res = await fetch(`/api/dev/support/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "เปลี่ยนสถานะไม่สำเร็จ");
        return;
      }
      load();
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  }

  async function remove(rule: Rule) {
    if (notice === `ลบ ${rule.id}?`) {
      setBusy(rule.id);
      try {
        const res = await fetch(`/api/dev/support/rules/${rule.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "ลบไม่สำเร็จ");
          return;
        }
        setNotice("ลบกฎแล้ว");
        load();
      } catch {
        setError("เกิดข้อผิดพลาด");
      } finally {
        setBusy(null);
      }
      return;
    }
    setNotice(`ลบ ${rule.id}?`);
    setError(null);
  }

  async function seed() {
    setBusy("seed");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/dev/support/rules?action=seed", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "seed ไม่สำเร็จ");
        return;
      }
      setNotice(`สร้างกฎเริ่มต้น ${data.rules?.length ?? 0} ข้อแล้ว`);
      load();
    } catch {
      setError("เกิดข้อผิดพลาด");
    } finally {
      setBusy(null);
    }
  }

  const rules = feed?.rules ?? [];

  const field = (
    label: string,
    key: keyof Editable,
    textarea = false,
    hint?: string,
  ) => (
    <label style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <b style={{ fontSize: 15, color: "#8e8e96", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</b>
      {textarea ? (
        <textarea
          className={styles.devInput}
          rows={3}
          value={editing?.[key] as string}
          onChange={(e) => setEditing((v) => (v ? { ...v, [key]: e.target.value } : v))}
        />
      ) : (
        <input
          className={styles.devInput}
          value={editing?.[key] as string}
          onChange={(e) => setEditing((v) => (v ? { ...v, [key]: e.target.value } : v))}
        />
      )}
      {hint ? (
        <span style={{ fontSize: 15, color: "#71717a", lineHeight: 1.5 }}>{hint}</span>
      ) : null}
    </label>
  );

  return (
    <div className={styles.card} id="mod-support-rules">
      <div className={styles.cardHead}>
        <span className="ms">auto_awesome</span>
        <h2>กฎ Auto Message · FAQ อัตโนมัติ</h2>
        <span className={`${styles.pill} ${rules.length > 0 ? styles.pillOn : styles.pillWarn}`}>
          {rules.filter((r) => r.enabled).length}/{rules.length} ใช้งาน · ถูกใช้ {feed?.totalHits ?? 0} ครั้ง
        </span>
      </div>
      <p className={styles.cardSub}>
        สมาชิกพิมพ์ข้อความ → ระบบหา “คำค้น” ที่ตรงในลำดับ priority → ตอบกลับอัตโนมัติทันที · แก้ได้เองทั้งหมดที่นี่
      </p>

      <div className={styles.chips} style={{ marginTop: 12 }}>
        <button type="button" className={`${styles.chip} ${styles.chipInfo}`} onClick={startCreate} disabled={busy === "new"}>
          <span className="ms">add</span> เพิ่มกฎใหม่
        </button>
        <button type="button" className={styles.chip} onClick={toggleAllExpanded} disabled={rules.length === 0}>
          <span className="ms">{expandedIds.size === rules.length ? "unfold_less" : "unfold_more"}</span>
          {expandedIds.size === rules.length ? "ย่อทั้งหมด" : "ขยายทั้งหมด"}
        </button>
        <button type="button" className={styles.chip} onClick={seed} disabled={busy === "seed" || rules.length > 0}>
          <span className="ms">restart_alt</span> Seed ชุดเริ่มต้น 12 ข้อ{rules.length > 0 ? " (ลบกฎทั้งหมดก่อน)" : ""}
        </button>
      </div>

      {editing ? (
        <div className={styles.stack} style={{ marginTop: 12, padding: 14, border: "none", borderRadius: 14, boxShadow: "inset 0 1px 1.5px rgba(255,255,255,0.15), 0 0 24px -4px rgba(146,112,255,0.3)" }}>
          <div className={styles.cardHead}>
            <span className="ms">edit_note</span>
            <h2 style={{ fontSize: 18 }}>{creating ? "กฎใหม่" : "แก้ไขกฎ"}</h2>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => { setEditing(null); setCreating(false); }}
              aria-label="ปิด"
              disabled={busy !== null}
            >
              <span className="ms">close</span>
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 8 }}>
            {field("คำค้น (คั่นด้วย ,)", "keywords", false, "เช่น: ราคา,payment,อัปเกรด — เจอคำไหนก่อนในลำดับ priority ตอบอันนั้น")}
            {field("หมวดหมู่", "category")}
            {field("Priority (น้อย = ก่อน)", "priority")}
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) => setEditing((v) => (v ? { ...v, enabled: e.target.checked } : v))}
              />
              <b style={{ fontSize: 15, color: "#d4d4d8" }}>เปิดใช้งานกฎนี้</b>
            </label>
            {field("คำตอบภาษาไทย", "replyTh", true)}
            {field("คำตอบภาษาอังกฤษ", "replyEn", true)}
            {field("หัวข้อ FAQ ไทย (ไม่บังคับ)", "faqTh")}
            {field("หัวข้อ FAQ อังกฤษ (ไม่บังคับ)", "faqEn")}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className={styles.ghostBtn} onClick={save} disabled={busy !== null} style={{ width: "auto", padding: "0 16px", height: 38, fontWeight: 800 }}>
              <span className="ms">save</span> {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            {error ? <p className={styles.errorNote} role="alert">{error}</p> : null}
          </div>
        </div>
      ) : null}

      <div className={styles.stack} style={{ marginTop: 12 }}>
        {rules.map((r) => {
          const isExpanded = expandedIds.has(r.id);
          return (
            <div key={r.id} className={styles.kv} style={{ opacity: r.enabled ? 1 : 0.55 }}>
              <div
                style={{ minWidth: 0, flex: 1, cursor: "pointer" }}
                onClick={() => toggleExpand(r.id)}
                title={isExpanded ? "คลิกเพื่อย่อ" : "คลิกเพื่อดูคำตอบ"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b style={{ fontSize: 15 }}>
                    P{r.priority} · {r.category} · {r.enabled ? "เปิด" : "ปิด"} · ใช้ {r.hitCount} ครั้ง
                  </b>
                  <span style={{ fontSize: 14, color: isExpanded ? "var(--primary-text)" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                    <span className="ms" style={{ fontSize: 16 }}>{isExpanded ? "expand_less" : "expand_more"}</span>
                    {isExpanded ? "ย่อ" : "ดูคำตอบ"}
                  </span>
                </div>
                <div style={{ color: "#b9ff2c", fontSize: 15, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isExpanded ? "normal" : "nowrap" }}>
                  ค: {r.keywords}
                </div>
                {isExpanded ? (
                  <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(0,0,0,0.25)", border: "none" }}>
                    <div style={{ fontSize: 15, color: "#d4d4d8", lineHeight: 1.55 }}>
                      <span className={styles.cellMono}>TH</span> {r.replyTh}
                    </div>
                    <div style={{ fontSize: 15, color: "#a1a1aa", lineHeight: 1.55, marginTop: 6 }}>
                      <span className={styles.cellMono}>EN</span> {r.replyEn}
                    </div>
                  </div>
                ) : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "none" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => toggleExpand(r.id)}
                    aria-label={isExpanded ? "ย่อ" : "ขยาย"}
                    title={isExpanded ? "ย่อ" : "ขยายคำตอบ"}
                  >
                    <span className="ms">{isExpanded ? "expand_less" : "expand_more"}</span>
                  </button>
                  <button type="button" className={styles.ghostBtn} onClick={() => toggle(r)} disabled={busy === r.id} aria-label={r.enabled ? "ปิดกฎ" : "เปิดกฎ"} title={r.enabled ? "ปิด" : "เปิด"}>
                    <span className="ms">{r.enabled ? "pause" : "play_arrow"}</span>
                  </button>
                  <button type="button" className={styles.ghostBtn} onClick={() => startEdit(r)} disabled={busy === r.id} aria-label="แก้ไข" title="แก้ไข">
                    <span className="ms">edit</span>
                  </button>
                  <button type="button" className={`${styles.ghostBtn} ${notice === `ลบ ${r.id}?` ? styles.ghostDanger : ""}`} onClick={() => remove(r)} disabled={busy === r.id} aria-label="ลบ" title={notice === `ลบ ${r.id}?` ? "กดยืนยันลบ" : "ลบ"}>
                    <span className="ms">delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {notice ? (
        <p className={styles.resultNote} role="status">
          <span className="ms" aria-hidden>check_circle</span> {notice}
        </p>
      ) : null}
      {error && !editing ? <p className={styles.errorNote} role="alert">{error}</p> : null}

      <p className={styles.source}>
        กฎถูกใช้ทั้งกับหน้า /support (สมาชิก) และ Feed แชทของ admin · ทุกการแก้บันทึก audit log ·
        priority น้อย = ตรวจก่อน
      </p>
    </div>
  );
}