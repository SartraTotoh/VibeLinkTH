"use client";

import { useState } from "react";
import styles from "@/app/dev/dev-console.module.css";

export function CopyButton({ text, label = "คัดลอก" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1400);
  }

  return (
    <button type="button" className={styles.ghostBtn} onClick={onCopy} aria-label={label} title={label}>
      <span className="ms">{done ? "check" : "content_copy"}</span>
    </button>
  );
}
