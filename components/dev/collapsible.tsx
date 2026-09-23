"use client";

import { useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

export function Collapsible({
  id,
  icon,
  title,
  tag,
  defaultOpen = false,
  source,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  tag?: string;
  defaultOpen?: boolean;
  source: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className={styles.card}>
      <button
        type="button"
        className={styles.repHead}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`${id}-body`}
      >
        <span className="ms" aria-hidden>{icon}</span>
        <span className={styles.repTitle}>{title}</span>
        {tag ? <span className={`${styles.pill} ${styles.pillWarn}`}>{tag}</span> : null}
        <span className={`ms ${styles.chev} ${open ? styles.chevOpen : ""}`} aria-hidden>
          expand_more
        </span>
      </button>
      {open ? (
        <div id={`${id}-body`} className={styles.repBody}>
          {children}
        </div>
      ) : null}
      <p className={styles.source}>Source · {source}</p>
    </section>
  );
}