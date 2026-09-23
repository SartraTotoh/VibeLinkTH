"use client";

import { useEffect, useState } from "react";
import styles from "@/app/ceo/dev-console.module.css";

type Signoff = {
  key: string;
  action: string;
  detail: string;
};

const SIGNOFFS: Signoff[] = [
  {
    key: "purge-cache",
    action: "Purge Cloudflare edge cache",
    detail: "ล้าง cache edge เพื่อไม่ให้หน้า/asset เก่าค้างบน production — Vision → Caching → Configuration → Purge Everything",
  },
  {
    key: "roll-neon",
    action: "Reset / rotate Neon credential",
    detail: "เปลี่ยน password ของ DB user แล้วแทนค่า DATABASE_URL / DATABASE_URL_UNPOOLED ใหม่ทันที",
  },
  {
    key: "roll-stripe",
    action: "Roll Stripe test keys",
    detail: "rotate STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET ทุกตัวแล้ว deploy ใหม่",
  },
  {
    key: "pdpa",
    action: "PDPA breach assessment",
    detail: "จัดทำรายงานประเมินเหตุการณ์ข้อมูลส่วนบุคคลอย่างเป็นทางการ + ปรึกษากฎหมายเรื่องหน้าที่แจ้ง",
  },
];

const LS_KEY = "vibelink:ceo-signoffs:v1";

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function ApprovalModule() {
  const [done, setDone] = useState<Set<string>>(() => new Set(readStored()));

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify([...done]));
    } catch {
      // storage เต็มหรือไม่ให้สิทธิ์ — เก็บในความจำ session เท่านั้น
    }
  }, [done]);

  const toggle = (key: string) => {
    const next = new Set(done);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDone(next);
  };

  const allDone = SIGNOFFS.every((s) => done.has(s.key));

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">verified_user</span>
        <h2>Launch approval — ก่อนเปิดรับเงินจริง</h2>
        <span className={`${styles.pill} ${allDone ? styles.pillOn : styles.pillWarn}`}>
          {allDone ? "approved" : `${done.size}/${SIGNOFFS.length}`}
        </span>
      </div>
      <p className={styles.cardSub}>
        งานเหล่านี้ค้างจากเหตุการณ์ rotate/revoke credentials — เซ็นรับรองทีละข้อพร้อมหลักฐานก่อนเปิดจ่ายจริง
      </p>

      <div className={styles.stack} style={{ marginTop: 14 }}>
        {SIGNOFFS.map((s) => (
          <label className={styles.kv} key={s.key} style={{ cursor: "pointer" }}>
            <div>
              <b style={done.has(s.key) ? { textDecoration: "line-through", opacity: 0.65 } : undefined}>
                {s.action}
              </b>
              <span style={{ color: "#a1a1aa" }}>{s.detail}</span>
            </div>
            <input
              type="checkbox"
              checked={done.has(s.key)}
              onChange={() => toggle(s.key)}
              aria-label={s.action}
            />
          </label>
        ))}
      </div>

      <p className={styles.source}>
        Source · รายการค้างจาก Risk register (rotate credentials / PDPA) — สถานะบันทึกเฉพาะเบราว์เซอร์นี้ ไม่ใช่หลักฐาน audit ทางการ
      </p>
    </div>
  );
}