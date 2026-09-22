"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "vibelink-consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage unavailable */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="แจ้งเตือนคุกกี้">
      <p>
        เราใช้คุกกี้ที่จำเป็นต่อการเข้าสู่ระบบและจดจำการตั้งค่าเท่านั้น ไม่มีคุกกี้โฆษณา อ่านเพิ่มเติมได้ที่{" "}
        <Link href="/cookies">นโยบายคุกกี้</Link>
      </p>
      <button className="button secondary" onClick={accept}>
        ยอมรับ
      </button>
    </div>
  );
}
