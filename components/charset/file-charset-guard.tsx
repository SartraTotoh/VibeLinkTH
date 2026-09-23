"use client";

import { useEffect, useRef, useState } from "react";
import { checkCharset } from "@/lib/client/charset";

type FileCharsetGuardProps = {
  value: string;
  field?: string;
};

/**
 * Warns the editor when a pasted value carries windows-874/UTF-8
 * double-encoding (Thai mojibake) before it can reach the database.
 * Renders nothing when the value is clean, so it is safe to drop into any
 * form without visual cost.
 */
export function FileCharsetGuard({ value, field = "ฟิลด์นี้" }: FileCharsetGuardProps) {
  const [checked, setChecked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = checkCharset(value);
      setDirty(r.dirty);
      setChecked(true);
    });
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  if (!checked || !dirty) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
        fontSize: 12,
        lineHeight: 1.4,
        color: "#b45309",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 6,
        padding: "4px 8px",
      }}
      role="alert"
    >
      {field} มีอักขระพัง (mojibake) — ตรวจพบ encoding ผิด แก้ให้ถูกต้องก่อนบันทึก
    </span>
  );
}