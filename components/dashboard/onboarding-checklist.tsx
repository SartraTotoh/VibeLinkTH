"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

const KEY = "vibelink-onboard-dismissed";

export function OnboardingChecklist({ lang, hasLinks }: { lang: Lang; hasLinks: boolean }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  const steps = [t(lang, "ob.s1"), t(lang, "ob.s2"), t(lang, "ob.s3")];
  const done = [hasLinks, false, false];

  return (
    <section className="panel onboard" aria-label={t(lang, "ob.title")}>
      <div className="panel-head">
        <span className="ms">rocket_launch</span>
        <h2>{t(lang, "ob.title")}</h2>
      </div>
      <ol className="onboard-steps">
        {steps.map((s, i) => (
          <li key={s} className={done[i] ? "done" : ""}>
            <span className="ms">{done[i] ? "check_circle" : "radio_button_unchecked"}</span>
            {s}
          </li>
        ))}
      </ol>
      <button type="button" className="mini-btn" onClick={dismiss}>
        {t(lang, "ob.dismiss")}
      </button>
    </section>
  );
}
