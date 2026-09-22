"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

export function VerifyEmailBanner({ lang }: { lang: Lang }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function resend() {
    setState("busy");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="notice" style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <span>
        {state === "sent"
          ? t(lang, "auth.linkSent")
          : state === "error"
            ? t(lang, "lm.errGeneric")
            : t(lang, "auth.unverifiedBanner")}
      </span>
      {state !== "sent" ? (
        <button className="mini-btn" onClick={resend} disabled={state === "busy"}>
          <span className="ms">mail</span>
          {state === "busy" ? t(lang, "auth.sending") : t(lang, "auth.sendLink")}
        </button>
      ) : null}
    </div>
  );
}
