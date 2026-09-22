"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )vibelink-lang=(th|en)/);
    let initial: Lang = "th";
    try {
      const stored = window.localStorage.getItem("vibelink-lang");
      if (stored === "th" || stored === "en") initial = stored;
      else if (m?.[1] === "en") initial = "en";
    } catch {
      if (m?.[1] === "en") initial = "en";
    }
    setLangState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("vibelink-lang", l);
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  return [lang, setLang];
}

export function LangSwitcher() {
  const [lang, setLang] = useLang();
  return <LanguageToggle lang={lang} onChange={setLang} />;
}

export function NavLangSwitcher() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  return (
    <LanguageToggle
      lang={lang}
      onChange={(l) => {
        setLang(l);
        router.refresh();
      }}
    />
  );
}

export function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language / ภาษา">
      {(["th", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={lang === l ? "on" : ""}
        >
          {l === "th" ? "ไทย" : "EN"}
        </button>
      ))}
    </div>
  );
}
