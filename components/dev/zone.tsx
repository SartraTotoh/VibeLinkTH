"use client";

import { useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

export function ZoneSection({
  id,
  icon,
  title,
  purpose,
  question,
  defaultOpen,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  purpose: string;
  question: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) setOpen(true);
    };
    window.addEventListener("vl:openzone", handler);
    return () => window.removeEventListener("vl:openzone", handler);
  }, [id]);

  return (
    <section id={id} className={`${styles.zone} ${open ? styles.zoneOpen : ""}`} aria-label={`${title} โ€” ${purpose}`}>
      <button
        type="button"
        className={styles.zoneHead}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`${id}-body`}
      >
        <span className={`ms ${styles.zoneIcon}`} aria-hidden>{icon}</span>
        <span className={styles.zoneTitle}>
          <b>{title}</b>
          <i>{purpose}</i>
        </span>
        <span className={styles.zoneQ}>
          <span className="ms" aria-hidden>help_outline</span>
          {question}
        </span>
        <span className={`ms ${styles.chev} ${open ? styles.chevOpen : ""}`} aria-hidden>
          expand_more
        </span>
      </button>
      {open ? (
        <div id={`${id}-body`} className={styles.zoneBody}>
          {children}
        </div>
      ) : null}
    </section>
  );
}