"use client";

import { useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

export type VaultItem = { key: string; label: string; value: string };

function mask(value: string) {
  if (!value) return "โ€” เธขเธฑเธเนเธกเนเธ•เธฑเนเธ โ€”";
  if (value.length <= 10) return "โ€ขโ€ขโ€ขโ€ขโ€ขโ€ขโ€ขโ€ข";
  return `${value.slice(0, 6)}โ€ขโ€ขโ€ขโ€ขโ€ขโ€ขโ€ขโ€ข${value.slice(-4)}`;
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
          {ready}/{items.length} เธ•เธฑเนเธเนเธฅเนเธง
        </span>
      </div>
      <p className={styles.cardSub}>เธเนเธฒเธฅเธฑเธเธ–เธนเธ mask เน€เธชเธกเธญ โ€” เธเธ”เธฃเธนเธเธ•เธฒเน€เธเธทเนเธญเธ”เธนเธ—เธตเธฅเธฐเธเนเธฒ เธเธ” copy เน€เธเธทเนเธญเธเธฑเธ”เธฅเธญเธ</p>
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
                aria-label={isOpen ? "เธเนเธญเธเธเนเธฒ" : "เนเธชเธ”เธเธเนเธฒ"}
              >
                <span className="ms">{isOpen ? "visibility_off" : "visibility"}</span>
              </button>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => onCopy(item.key, item.value)}
                disabled={!hasValue}
                aria-label="เธเธฑเธ”เธฅเธญเธ"
              >
                <span className="ms">{copied === item.key ? "check" : "content_copy"}</span>
              </button>
            </div>
          </div>
        );
      })}
      </div>
      <p className={styles.source}>Source ยท Worker secrets เธเธ“เธฐเธฃเธฑเธ ยท เธเนเธฒเธเธฃเธดเธเนเธกเนเธ–เธนเธเธเธฑเธเธ—เธถเธเนเธ log</p>
    </div>
  );
}
