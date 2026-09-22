"use client";

import { useState } from "react";
import styles from "@/app/dev/dev-console.module.css";

export type VaultItem = { key: string; label: string; value: string };

function mask(value: string) {
  if (!value) return "— ยังไม่ตั้ง —";
  if (value.length <= 10) return "••••••••";
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export function SecretVault({ items }: { items: VaultItem[] }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  function toggle(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onCopy(key: string, value: string) {
    const ok = await copyText(value);
    setCopied(ok ? key : `fail:${key}`);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  }

  const ready = items.filter((i) => i.value).length;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">key</span>
        <h2>Secret Vault</h2>
        <span className={`${styles.pill} ${ready === items.length ? styles.pillOn : styles.pillWarn}`}>
          {ready}/{items.length} ตั้งแล้ว
        </span>
      </div>
      <p className={styles.cardSub}>ค่าลับถูก mask เสมอ — กดรูปตาเพื่อดูทีละค่า กด copy เพื่อคัดลอก</p>
      <div className={styles.vault} style={{ marginTop: 12 }}>
      {items.map((item, i) => {
        const isOpen = revealed.has(item.key);
        const hasValue = Boolean(item.value);
        return (
          <div
            key={item.key}
            className={styles.vaultRow}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={`${styles.dot} ${hasValue ? styles.dotOn : styles.dotOff}`} />
            <div className={styles.vaultMeta}>
              <b>{item.label}</b>
              <small className={styles.mono}>{item.key}</small>
            </div>
            <code className={styles.secretValue} title={isOpen ? item.value : undefined}>
              {isOpen && hasValue ? item.value : mask(item.value)}
            </code>
            <div className={styles.vaultActions}>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => toggle(item.key)}
                disabled={!hasValue}
                aria-label={isOpen ? "ซ่อนค่า" : "แสดงค่า"}
              >
                <span className="ms">{isOpen ? "visibility_off" : "visibility"}</span>
              </button>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => onCopy(item.key, item.value)}
                disabled={!hasValue}
                aria-label="คัดลอก"
              >
                <span className="ms">{copied === item.key ? "check" : "content_copy"}</span>
              </button>
            </div>
          </div>
        );
      })}
      </div>
      <p className={styles.source}>Source · Worker secrets ขณะรัน · ค่าจริงไม่ถูกบันทึกใน log</p>
    </div>
  );
}
