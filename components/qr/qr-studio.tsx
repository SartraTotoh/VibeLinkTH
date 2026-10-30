"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { NavLangSwitcher, useLang } from "@/components/i18n/language";
import { qrText, type QrTextKey } from "@/lib/qr/copy";
import { validateDestination, QR_UTM_KEYS, type QrUtmConfig, type QrUtmKey } from "@/lib/qr/destination";
import { evaluateQrHealth, type HealthResult } from "@/lib/qr/health";
import { createQrMatrixForStyle, renderQrRgba } from "@/lib/qr/matrix";
import { defaultQrStyle, QR_PRESETS, styleForPreset } from "@/lib/qr/presets";
import {
  canvasToRgba,
  composeQrCard,
  copyText,
  downloadCanvasPng,
  downloadQrSvg,
} from "@/lib/qr/export";
import { decodeQrImage } from "@/lib/qr/decode";
import type {
  QrExportSize,
  QrEye,
  QrFrame,
  QrLogoAsset,
  QrMatrix,
  QrPattern,
  QrPresetId,
  QrStyleConfig,
} from "@/lib/qr/types";
import styles from "./qr-studio.module.css";
import { BRAND, PRODUCTS } from "@/lib/products";
import { ProductNavigation } from "@/components/products/product-navigation";

type Mode = "url" | "vibe" | "booking" | "short";
type Surface = "white" | "dark" | "social";

type DestinationOption = { type: "vibe" | "booking"; label: string; url: string };
type ShortLinkOption = {
  id: string;
  title: string;
  slug: string;
  shortUrl: string;
  destinationUrl: string;
};
type DestinationsResponse = {
  destinations: DestinationOption[];
  shortLinks: ShortLinkOption[];
};

type ExportState =
  | { kind: "idle" }
  | { kind: "busy"; message: string }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

const MODES: Array<{ id: Mode; icon: string; key: QrTextKey }> = [
  { id: "url", icon: "link", key: "mode.url" },
  { id: "vibe", icon: "auto_awesome", key: "mode.vibe" },
  { id: "booking", icon: "calendar_month", key: "mode.booking" },
  { id: "short", icon: "bolt", key: "mode.short" },
];

const PATTERN_ICONS: Record<QrPattern, string> = {
  square: "crop_square",
  rounded: "rounded_corner",
  dots: "blur_on",
};

const EYE_ICONS: Record<QrEye, string> = {
  square: "filter_center_focus",
  rounded: "radio_button_unchecked",
};

const FRAME_KEYS: Record<QrFrame, QrTextKey> = {
  none: "frame.none",
  caption: "frame.caption",
  ticket: "frame.ticket",
};

const PATTERN_KEYS: Record<QrPattern, QrTextKey> = {
  square: "pattern.square",
  rounded: "pattern.rounded",
  dots: "pattern.dots",
};

const EYE_KEYS: Record<QrEye, QrTextKey> = {
  square: "eye.square",
  rounded: "eye.rounded",
};

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

function modeIsDestination(mode: Mode): mode is "vibe" | "booking" {
  return mode === "vibe" || mode === "booking";
}

export function QrStudio() {
  const [lang] = useLang();
  const t = useCallback((key: QrTextKey) => qrText(lang, key), [lang]);

  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [utmOpen, setUtmOpen] = useState(false);
  const [utm, setUtm] = useState<QrUtmConfig>({});
  const [style, setStyle] = useState<QrStyleConfig>(() => defaultQrStyle());
  const [logo, setLogo] = useState<QrLogoAsset | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [authState, setAuthState] = useState<"loading" | "anon" | "user" | "error">("loading");
  const [destData, setDestData] = useState<DestinationsResponse | null>(null);
  const [selectedDest, setSelectedDest] = useState<DestinationOption | null>(null);
  const [selectedShort, setSelectedShort] = useState<ShortLinkOption | null>(null);
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdShort, setCreatedShort] = useState<ShortLinkOption | null>(null);
  const [useCreatedShort, setUseCreatedShort] = useState(false);

  const [surface, setSurface] = useState<Surface>("white");
  const [anim, setAnim] = useState({ glow: false, gradient: false, cta: false });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [printWidthMm, setPrintWidthMm] = useState(40);

  const [health, setHealth] = useState<HealthResult | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const [serverError, setServerError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const utmKey = JSON.stringify(utm);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/qr/destinations", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) return { anon: true as const };
        if (!res.ok) throw new Error("destinations");
        const data = (await res.json()) as DestinationsResponse;
        return { anon: false as const, data };
      })
      .then((result) => {
        if (cancelled) return;
        if (result.anon) {
          setAuthState("anon");
          return;
        }
        setDestData(result.data);
        setAuthState("user");
      })
      .catch(() => {
        if (!cancelled) setAuthState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    setCreatedShort(null);
    setUseCreatedShort(false);
  }, [url, utmKey]);

  useEffect(() => {
    if (!destData) return;
    if (modeIsDestination(mode)) {
      const options = destData.destinations.filter((d) => d.type === mode);
      if (!selectedDest || selectedDest.type !== mode) {
        if (options[0]) setSelectedDest(options[0]);
        else setSelectedDest(null);
      }
    }
    if (mode === "short" && !selectedShort) {
      if (destData.shortLinks[0]) setSelectedShort(destData.shortLinks[0]);
    }
  }, [mode, destData, selectedDest, selectedShort]);

  const usingCreatedShort = mode === "url" && useCreatedShort && Boolean(createdShort);
  const destinationSource =
    mode === "url"
      ? usingCreatedShort && createdShort
        ? createdShort.shortUrl
        : url
      : mode === "short"
        ? (selectedShort?.shortUrl ?? "")
        : (selectedDest?.url ?? "");

  const effectiveUtm: QrUtmConfig | null =
    mode === "short" || usingCreatedShort ? null : utm;

  const local = useMemo(
    () => (destinationSource.trim() ? validateDestination(destinationSource, effectiveUtm) : null),
    [destinationSource, effectiveUtm],
  );

  const payload = local?.ok ? local.url : null;
  const isUsingShort = mode === "short" || usingCreatedShort;
  const relatedShort = mode === "short" ? selectedShort : usingCreatedShort ? createdShort : null;

  const matrix = useMemo<QrMatrix | null>(() => {
    if (!payload) return null;
    try {
      return createQrMatrixForStyle(payload, style);
    } catch {
      return null;
    }
  }, [payload, style]);

  // A validated URL can still exceed the QR byte capacity at ECC H (a logo forces H).
  const matrixTooLong = Boolean(payload) && !matrix;

  const render = useMemo(() => {
    if (!matrix) return null;
    return renderQrRgba({
      matrix,
      style,
      targetSize: style.exportSize,
      logo: logo?.image ?? null,
    });
  }, [matrix, style, logo]);

  const previewRender = useMemo(() => {
    if (!matrix) return null;
    return renderQrRgba({
      matrix,
      style,
      targetSize: 1024,
      logo: logo?.image ?? null,
    });
  }, [matrix, style, logo]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !previewRender) return;
    canvas.width = previewRender.width;
    canvas.height = previewRender.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(previewRender.width, previewRender.height);
    image.data.set(previewRender.data);
    ctx.putImageData(image, 0, 0);
  }, [previewRender]);

  useEffect(() => {
    if (!payload || !matrix || !render) {
      setHealth(null);
      setDecoding(false);
      return;
    }

    let cancelled = false;
    setDecoding(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const decodeSize = Math.min(1024, style.exportSize);
          const card = composeQrCard({
            source: render,
            style,
            matrixSize: matrix.size,
            size: decodeSize,
          });
          const decoded = await decodeQrImage(canvasToRgba(card));
          if (cancelled) return;
          const totalModules = matrix.size + style.margin * 2;
          const cardModulesWide = totalModules + 8;
          const qrPixelSize = (style.exportSize * totalModules) / cardModulesWide;
          const result = evaluateQrHealth({
            payload,
            style,
            matrixSize: matrix.size,
            exportSize: style.exportSize,
            qrPixelSize,
            printWidthMm,
            isProduction: !isLocalHost(window.location.hostname),
            decode: decoded,
            lang,
          });
          setHealth(result);
        } catch {
          if (cancelled) return;
          setHealth(
            evaluateQrHealth({
              payload,
              style,
              matrixSize: matrix.size,
              exportSize: style.exportSize,
              qrPixelSize: 0,
              printWidthMm,
              isProduction: !isLocalHost(window.location.hostname),
              decode: { ok: false, error: t("error.generic") },
              lang,
            }),
          );
        } finally {
          if (!cancelled) setDecoding(false);
        }
      })();
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payload, matrix, render, style, printWidthMm, lang, t]);

  const preset = QR_PRESETS[style.preset];
  const animActive = reduceMotion ? { glow: false, gradient: false, cta: false } : anim;
  const hasCta = style.frame !== "none" || style.cta.trim() !== "";

  const previewClassName = [
    styles.previewCard,
    surface === "dark" ? styles.surfaceDark : surface === "social" ? styles.surfaceSocial : styles.surfaceWhite,
    style.frame === "ticket" ? styles.frameTicket : style.frame === "caption" ? styles.frameCaption : "",
    animActive.glow ? styles.animGlow : "",
  ]
    .filter(Boolean)
    .join(" ");

  const previewVars = {
    "--qr-accent": preset.accent,
    "--qr-accent-ink": preset.accentInk,
    "--qr-glow": preset.glow,
    "--qr-bg": style.bg,
    "--qr-fg": style.fg,
  } as CSSProperties;

  function setPreset(next: QrPresetId) {
    setStyle((current) => styleForPreset(current, next));
  }

  function setUtmValue(key: QrUtmKey, value: string) {
    setUtm((current) => ({ ...current, [key]: value }));
  }

  async function handleLogo(file: File | null) {
    setLogoError(null);
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setLogoError(t("error.fileType"));
      return;
    }
    if (file.size > 512 * 1024) {
      setLogoError(t("error.fileSize"));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 1024 || bitmap.height > 1024) {
        bitmap.close();
        setLogoError(t("error.fileDims"));
        return;
      }
      const side = Math.min(512, Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.clearRect(0, 0, side, side);
      const scale = Math.min(side / bitmap.width, side / bitmap.height);
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      ctx.drawImage(bitmap, Math.round((side - w) / 2), Math.round((side - h) / 2), w, h);
      bitmap.close();
      const dataUrl = canvas.toDataURL("image/png");
      const image = ctx.getImageData(0, 0, side, side);
      setLogo({
        dataUrl,
        name: file.name,
        image: { width: side, height: side, data: image.data },
      });
      setStyle((current) => ({ ...current, logoRatio: current.logoRatio > 0 ? current.logoRatio : 0.14 }));
    } catch {
      setLogoError(t("error.fileRead"));
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function removeLogo() {
    setLogo(null);
    setLogoError(null);
    setStyle((current) => ({ ...current, logoRatio: 0 }));
  }

  async function handleCopy(value: string, short = false) {
    const ok = await copyText(value);
    if (!ok) {
      setServerError(t("actions.copyFail"));
      return;
    }
    if (short) {
      setShortCopied(true);
      window.setTimeout(() => setShortCopied(false), 1600);
    } else {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  async function handleCreateShort() {
    if (!local?.ok) {
      setCreateError(t("error.urlEmpty"));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: local.url,
          slug: slug.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCreateError(data?.error ?? t("actions.shortError"));
        return;
      }
      const link = data?.link;
      if (!link || typeof link.shortUrl !== "string" || !/^https?:\/\//i.test(link.shortUrl)) {
        setCreateError("ยังไม่ได้ตั้งค่า SHORT_LINK_URL — สร้าง short link ไม่ได้ในตอนนี้");
        return;
      }
      const item: ShortLinkOption = {
        id: String(link.id ?? link.slug),
        title: String(link.title ?? link.slug),
        slug: String(link.slug),
        shortUrl: String(link.shortUrl),
        destinationUrl: String(link.destinationUrl ?? local.url),
      };
      setCreatedShort(item);
      setUseCreatedShort(true);
      setSlug("");
      setDestData((current) =>
        current
          ? { ...current, shortLinks: [item, ...current.shortLinks.filter((l) => l.slug !== item.slug)] }
          : current,
      );
      setExportState({ kind: "ok", message: t("actions.shortDone") });
    } catch {
      setCreateError(t("actions.shortError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleExport(format: "png" | "svg") {
    setServerError(null);
    if (!local?.ok) {
      setExportState({ kind: "error", message: t("error.urlEmpty") });
      return;
    }
    if (!health?.canExport || !render || !matrix) {
      setExportState({ kind: "error", message: t("actions.blocked") });
      return;
    }

    setExportState({ kind: "busy", message: t("actions.serverChecking") });
    try {
      const res = await fetch("/api/qr/validate-destination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: destinationSource,
          utm: effectiveUtm ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.url !== "string") {
        const message = data?.error ?? t("actions.serverError");
        setServerError(message);
        setExportState({ kind: "error", message });
        return;
      }

      await document.fonts?.ready;
      const serverUrl: string = data.url;
      const serverHost: string = typeof data.host === "string" ? data.host : local.host;
      const exportMatrix = createQrMatrixForStyle(serverUrl, style);
      const exportRender = renderQrRgba({
        matrix: exportMatrix,
        style,
        targetSize: style.exportSize,
        logo: logo?.image ?? null,
      });
      const card = composeQrCard({
        source: exportRender,
        style,
        matrixSize: exportMatrix.size,
        size: style.exportSize,
      });

      // Verify the exact pixels that leave the browser. A stale health panel is
      // never enough to unlock a download.
      const decoded = await decodeQrImage(canvasToRgba(card));
      if (!decoded.ok || decoded.text !== serverUrl) {
        setExportState({
          kind: "error",
          message: `${t("health.blocked")}${decoded.ok ? "" : ` · ${decoded.error}`}`,
        });
        return;
      }

      const result =
        format === "png"
          ? await downloadCanvasPng(card, serverHost)
          : downloadQrSvg({
              matrix: exportMatrix,
              style,
              logoDataUrl: logo?.dataUrl ?? null,
              exportSize: style.exportSize,
              host: serverHost,
            });

      setExportState({ kind: "ok", message: `${t("actions.exported")} · ${result.filename}` });
    } catch {
      setExportState({ kind: "error", message: t("actions.exportError") });
    }
  }

  const urlError =
    local && !local.ok && (mode === "url" ? url.trim() !== "" : true) ? local.message : null;
  const canExport = Boolean(health?.canExport) && !decoding && exportState.kind !== "busy";

  return (
    <main className={`shell ${styles.page}`}>
      <header className="nav">
        <Link href="/" className="brand" prefetch={false}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>TH
        </Link>
        <div className="dash-actions">
          <NavLangSwitcher />
          <Link href="/dashboard" className="mini-btn" prefetch={false}>
            <span className="ms">dashboard</span>
            {lang === "th" ? "แดชบอร์ด" : "Dashboard"}
          </Link>
          <Link href="/support" className="mini-btn" prefetch={false}>
            <span className="ms">help</span>
            {lang === "th" ? "ช่วยเหลือ" : "Support"}
          </Link>
        </div>
      </header>
      <ProductNavigation active="qr" lang={lang} discovery />

      <header className={styles.hero}>
        <span className={styles.brandKicker}>{PRODUCTS.qr.name}</span>
        <h1>{t("hero.title")}</h1>
        <p>{t("hero.sub")}</p>
        <p>{BRAND.tagline}</p>
      </header>

      <div className={styles.studio}>
        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="qr-step-destination">
            <div className={styles.panelHead}>
              <span className={styles.stepIndex}>01</span>
              <h2 id="qr-step-destination">{t("step1.title")}</h2>
              <span className={styles.panelIcon}>
                <span className="ms">person_pin_circle</span>
              </span>
            </div>

            {authState === "user" ? (
              <div className={styles.segmented} role="group" aria-label={t("step1.title")}>
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.segment}${mode === item.id ? ` ${styles.segmentActive}` : ""}`}
                    aria-pressed={mode === item.id}
                    disabled={item.id === "booking" && PRODUCTS.booking.status === "development"}
                    title={item.id === "booking" ? PRODUCTS.booking.statusLabel[lang] : undefined}
                    onClick={() => setMode(item.id)}
                  >
                    <span className="ms">{item.icon}</span>
                    {t(item.key)}
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.authHint}>
                <span className="ms">lock</span>
                <span>{t("dest.login")}</span>
                <Link href="/login?next=/qr" className={styles.inlineLink}>
                  {t("nav.login")}
                </Link>
              </div>
            )}
            {authState === "user" && <p className={styles.hint}>{t("dest.emptyBooking")}</p>}

            {mode === "url" ? (
              <div className={styles.formBlock}>
                <label className="field">
                  <span>{t("field.url")}</span>
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder={t("field.urlPh")}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    aria-invalid={Boolean(urlError)}
                    aria-describedby="qr-url-hint"
                  />
                </label>
                <p id="qr-url-hint" className={styles.hint}>
                  {t("field.urlHint")}
                </p>
                {urlError ? (
                  <p className={styles.inlineError} role="alert">
                    <span className="ms">error</span>
                    {urlError}
                  </p>
                ) : null}

                <button
                  type="button"
                  className={`${styles.utmToggle}${utmOpen ? ` ${styles.utmToggleOpen}` : ""}`}
                  onClick={() => setUtmOpen((open) => !open)}
                  aria-expanded={utmOpen}
                >
                  <span className="ms">campaign</span>
                  {t("field.utmToggle")}
                  <span className="ms">{utmOpen ? "expand_less" : "expand_more"}</span>
                </button>

                {utmOpen ? (
                  <div className={styles.utmGrid}>
                    {QR_UTM_KEYS.map((key) => (
                      <label className="field" key={key}>
                        <span>{t(`utm.${key.replace("utm_", "")}` as QrTextKey)}</span>
                        <input
                          type="text"
                          maxLength={80}
                          value={utm[key] ?? ""}
                          onChange={(e) => setUtmValue(key, e.target.value)}
                          placeholder={key === "utm_source" ? "tiktok" : key === "utm_medium" ? "bio" : ""}
                        />
                      </label>
                    ))}
                    <p className={`${styles.hint} ${styles.utmNote}`}>{t("utm.note")}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {modeIsDestination(mode) ? (
              <div className={styles.formBlock}>
                {authState === "loading" ? <p className={styles.hint}>{t("dest.loading")}</p> : null}
                {authState === "error" ? <p className={styles.inlineError}>{t("dest.error")}</p> : null}
                {authState === "user" &&
                destData &&
                destData.destinations.filter((d) => d.type === mode).length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className="ms">{mode === "vibe" ? "auto_awesome" : "calendar_month"}</span>
                    <p>{t(mode === "vibe" ? "dest.emptyVibe" : "dest.emptyBooking")}</p>
                    <Link href="/dashboard" className={styles.inlineLink}>
                      {t("nav.dashboard")}
                    </Link>
                  </div>
                ) : null}
                {authState === "user" &&
                destData &&
                destData.destinations.filter((d) => d.type === mode).length > 0 ? (
                  <label className="field">
                    <span>{t("dest.pick")}</span>
                    <select
                      value={selectedDest?.url ?? ""}
                      onChange={(e) => {
                        const next = destData.destinations.find((d) => d.url === e.target.value) ?? null;
                        setSelectedDest(next);
                      }}
                    >
                      {destData.destinations
                        .filter((d) => d.type === mode)
                        .map((d) => (
                          <option key={d.url} value={d.url}>
                            {d.label}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}

            {mode === "short" ? (
              <div className={styles.formBlock}>
                {authState === "user" && destData && destData.shortLinks.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className="ms">bolt</span>
                    <p>{t("dest.emptyShort")}</p>
                  </div>
                ) : null}
                {authState === "user" && destData && destData.shortLinks.length > 0 ? (
                  <>
                    <label className="field">
                      <span>{t("dest.pick")}</span>
                      <select
                        value={selectedShort?.id ?? ""}
                        onChange={(e) => {
                          const next = destData.shortLinks.find((l) => l.id === e.target.value) ?? null;
                          setSelectedShort(next);
                        }}
                      >
                        {destData.shortLinks.map((l) => (
                          <option key={l.id} value={l.id}>
                            /{l.slug} — {l.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className={styles.hint}>{t("dest.shortNote")}</p>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className={styles.panel} aria-labelledby="qr-step-style">
            <div className={styles.panelHead}>
              <span className={styles.stepIndex}>02</span>
              <h2 id="qr-step-style">{t("step2.title")}</h2>
              <span className={styles.panelIcon}>
                <span className="ms">palette</span>
              </span>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.groupLabel}>{t("style.preset")}</span>
              <div className={styles.presetGrid}>
                {(Object.keys(QR_PRESETS) as QrPresetId[]).map((id) => {
                  const p = QR_PRESETS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`${styles.presetBtn}${style.preset === id ? ` ${styles.presetActive}` : ""}`}
                      aria-pressed={style.preset === id}
                      onClick={() => setPreset(id)}
                    >
                      <span
                        className={styles.swatch}
                        style={{
                          background: `radial-gradient(circle at 30% 25%, ${p.accent}, ${p.bg} 62%)`,
                          boxShadow: `0 0 18px -4px ${p.glow}`,
                        }}
                        aria-hidden="true"
                      />
                      <b>{lang === "en" ? p.labelEn : p.labelTh}</b>
                      {style.preset === id ? (
                        <span className={styles.presetCheck} aria-hidden="true">
                          <span className="ms">check</span>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.colorsRow}>
              <label className={styles.colorField}>
                <span>{t("style.fg")}</span>
                <span className={styles.colorControl}>
                  <input
                    type="color"
                    value={style.fg}
                    onChange={(e) => setStyle((current) => ({ ...current, fg: e.target.value }))}
                    aria-label={t("style.fg")}
                  />
                  <code>{style.fg}</code>
                </span>
              </label>
              <label className={styles.colorField}>
                <span>{t("style.bg")}</span>
                <span className={styles.colorControl}>
                  <input
                    type="color"
                    value={style.bg}
                    onChange={(e) => setStyle((current) => ({ ...current, bg: e.target.value }))}
                    aria-label={t("style.bg")}
                  />
                  <code>{style.bg}</code>
                </span>
              </label>
            </div>

            <div className={styles.splitGroup}>
              <div className={styles.fieldGroup}>
                <span className={styles.groupLabel}>{t("style.pattern")}</span>
                <div className={styles.iconSegmented} role="group" aria-label={t("style.pattern")}>
                  {(Object.keys(PATTERN_ICONS) as QrPattern[]).map((pattern) => (
                    <button
                      key={pattern}
                      type="button"
                      className={`${styles.iconChoice}${style.pattern === pattern ? ` ${styles.iconChoiceActive}` : ""}`}
                      aria-pressed={style.pattern === pattern}
                      aria-label={t(PATTERN_KEYS[pattern])}
                      title={t(PATTERN_KEYS[pattern])}
                      onClick={() => setStyle((current) => ({ ...current, pattern }))}
                    >
                      <span className="ms">{PATTERN_ICONS[pattern]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <span className={styles.groupLabel}>{t("style.eye")}</span>
                <div className={styles.iconSegmented2} role="group" aria-label={t("style.eye")}>
                  {(Object.keys(EYE_ICONS) as QrEye[]).map((eye) => (
                    <button
                      key={eye}
                      type="button"
                      className={`${styles.iconChoice}${style.eye === eye ? ` ${styles.iconChoiceActive}` : ""}`}
                      aria-pressed={style.eye === eye}
                      aria-label={t(EYE_KEYS[eye])}
                      title={t(EYE_KEYS[eye])}
                      onClick={() => setStyle((current) => ({ ...current, eye }))}
                    >
                      <span className="ms">{EYE_ICONS[eye]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.logoBlock}>
              <div className={styles.logoHead}>
                <span className={styles.groupLabel}>{t("style.logo")}</span>
                <div className={styles.logoActions}>
                  <label
                    className={styles.iconBtn}
                    title={`${t("style.logoPick")} · ${t("style.logoHint")}`}
                  >
                    <span className="ms">add_photo_alternate</span>
                    <span className={styles.srOnly}>{t("style.logoPick")}</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label={t("style.logoPick")}
                      onChange={(e) => void handleLogo(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {logo ? (
                    <button
                      type="button"
                      className={styles.iconBtnDanger}
                      title={t("style.logoRemove")}
                      aria-label={t("style.logoRemove")}
                      onClick={removeLogo}
                    >
                      <span className="ms">delete</span>
                    </button>
                  ) : null}
                </div>
              </div>
              {logoError ? (
                <p className={styles.inlineError} role="alert">
                  <span className="ms">error</span>
                  {logoError}
                </p>
              ) : null}
              {logo ? (
                <div className={styles.logoRatio}>
                  <div className={styles.logoPreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo.dataUrl} alt="" />
                  </div>
                  <label className={styles.rangeField}>
                    <span>
                      {t("style.logoRatio")} · {Math.round(style.logoRatio * 100)}%
                    </span>
                    <input
                      type="range"
                      min={6}
                      max={18}
                      step={1}
                      value={Math.max(6, Math.round(style.logoRatio * 100))}
                      onChange={(e) =>
                        setStyle((current) => ({ ...current, logoRatio: Number(e.target.value) / 100 }))
                      }
                    />
                    <small>{t("style.logoRatioHint")}</small>
                  </label>
                </div>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.groupLabel}>{t("style.frame")}</span>
              <div className={styles.iconSegmented} role="group" aria-label={t("style.frame")}>
                {(Object.keys(FRAME_KEYS) as QrFrame[]).map((frame) => (
                  <button
                    key={frame}
                    type="button"
                    className={`${styles.iconChoice}${style.frame === frame ? ` ${styles.iconChoiceActive}` : ""}`}
                    aria-pressed={style.frame === frame}
                    aria-label={t(FRAME_KEYS[frame])}
                    title={t(FRAME_KEYS[frame])}
                    onClick={() => setStyle((current) => ({ ...current, frame }))}
                  >
                    <span className="ms">
                      {frame === "none" ? "block" : frame === "caption" ? "subtitles" : "confirmation_number"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <label className="field" title={t("style.ctaHint")}>
              <span>{t("style.cta")}</span>
              <input
                type="text"
                maxLength={48}
                placeholder={t("style.ctaPh")}
                value={style.cta}
                onChange={(e) => setStyle((current) => ({ ...current, cta: e.target.value }))}
              />
            </label>

            <div className={styles.sizeRow}>
              <div className={styles.fieldGroup}>
                <span className={styles.groupLabel}>{t("style.size")}</span>
                <div className={styles.segmented3} role="group" aria-label={t("style.size")}>
                  {([512, 1024, 2048] as QrExportSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`${styles.segment}${style.exportSize === size ? ` ${styles.segmentActive}` : ""}`}
                      aria-pressed={style.exportSize === size}
                      onClick={() => setStyle((current) => ({ ...current, exportSize: size }))}
                    >
                      <span className="ms">photo_size_select_large</span>
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.marginBox} title={t("style.marginHint")}>
                <span className="ms">lock</span>
                <b>
                  {t("style.margin")} {t("style.marginValue")}
                </b>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="qr-step-health">
            <div className={styles.panelHead}>
              <span className={styles.stepIndex}>03</span>
              <h2 id="qr-step-health">{t("step3.title")}</h2>
              <span className={styles.panelIcon}>
                <span className="ms">health_and_safety</span>
              </span>
            </div>

            <div className={styles.healthTop}>
              <div className={styles.healthScore}>
                {health ? (
                  <>
                    <span className={styles.scoreChip}>
                      <span className="ms">check_circle</span>
                      {health.pass} {t("health.pass")}
                    </span>
                    <span className={styles.scoreChipWarn}>
                      <span className="ms">warning</span>
                      {health.warn} {t("health.warn")}
                    </span>
                    <span className={styles.scoreChipFail}>
                      <span className="ms">cancel</span>
                      {health.fail} {t("health.fail")}
                    </span>
                  </>
                ) : (
                  <span className={styles.scoreChipFail}>
                    <span className="ms">error</span>
                    {matrixTooLong ? t("error.qrCapacity") : decoding ? t("health.checking") : t("preview.empty")}
                  </span>
                )}
              </div>
              <label className={styles.printField} title={t("health.printHint")}>
                <span>{t("health.printWidth")}</span>
                <input
                  type="number"
                  min={20}
                  max={500}
                  step={5}
                  value={printWidthMm}
                  onChange={(e) => setPrintWidthMm(Math.max(20, Math.min(500, Number(e.target.value) || 40)))}
                />
                <small>mm</small>
              </label>
            </div>

            <ul className={styles.healthList} aria-live="polite">
              {(health?.items ?? []).map((item) => (
                <li key={item.id} className={`${styles.healthItem} ${styles[`status_${item.status}`] ?? ""}`}>
                  <span className={`ms ${styles.healthIcon}`}>{item.icon}</span>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </div>
                  <span className={styles.healthBadge}>
                    {item.status === "pass"
                      ? t("health.pass")
                      : item.status === "warn"
                        ? t("health.warn")
                        : item.status === "fail"
                          ? t("health.fail")
                          : "i"}
                  </span>
                </li>
              ))}
            </ul>

            {matrixTooLong ? (
              <p className={styles.inlineError} role="alert">
                <span className="ms">error</span>
                {t("error.qrCapacity")}
              </p>
            ) : null}
            <p className={styles.healthNote}>{t("health.note")}</p>
          </section>
        </div>

        <aside className={styles.side} aria-label={t("preview.title")}>
          <section className={styles.previewPanel}>
            <div className={styles.previewHead}>
              <h2>{t("preview.title")}</h2>
              <span className={styles.readyBadge}>
                <span className="ms">{health?.canExport ? "verified" : "pending"}</span>
                {health?.canExport ? t("health.ready") : decoding ? t("health.checking") : t("preview.empty")}
              </span>
            </div>

            <div className={styles.iconSegmented} role="group" aria-label={t("preview.title")}>
              {(["white", "dark", "social"] as Surface[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.iconChoice}${surface === s ? ` ${styles.iconChoiceActive}` : ""}`}
                  aria-pressed={surface === s}
                  aria-label={t(s === "white" ? "preview.white" : s === "dark" ? "preview.dark" : "preview.social")}
                  title={t(s === "white" ? "preview.white" : s === "dark" ? "preview.dark" : "preview.social")}
                  onClick={() => setSurface(s)}
                >
                  <span className="ms">{s === "white" ? "light_mode" : s === "dark" ? "dark_mode" : "smartphone"}</span>
                </button>
              ))}
            </div>

            <div className={styles.stage}>
              {animActive.gradient ? <span className={styles.gradientLayer} aria-hidden="true" /> : null}

              <div className={previewClassName} style={previewVars}>
                {previewRender ? (
                  <canvas
                    ref={previewRef}
                    className={styles.qrCanvas}
                    aria-label={`QR ${payload ?? ""}`}
                    role="img"
                  />
                ) : (
                  <div className={styles.placeholder}>
                    <span className="ms">qr_code_2</span>
                    <p>{matrixTooLong ? t("error.qrCapacity") : t("preview.empty")}</p>
                  </div>
                )}

                {previewRender && hasCta ? (
                  <p className={`${styles.previewCta}${animActive.cta ? ` ${styles.ctaPulse}` : ""}`}>
                    <span className="ms">qr_code_scanner</span>
                    {style.cta.trim() || t("preview.scanMe")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={styles.animBlock}>
              <div className={styles.animHead}>
                <span className={styles.groupLabel}>{t("preview.anim")}</span>
                {reduceMotion ? <span className={styles.reduced}>{t("anim.reduced")}</span> : null}
              </div>
              <div className={styles.animGrid}>
                {(
                  [
                    ["glow", "flare", "anim.glow"],
                    ["gradient", "gradient", "anim.gradient"],
                    ["cta", "touch_app", "anim.cta"],
                  ] as Array<[keyof typeof anim, string, QrTextKey]>
                ).map(([key, icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.animBtn}${animActive[key] ? ` ${styles.animActive}` : ""}`}
                    aria-pressed={animActive[key]}
                    aria-label={t(label)}
                    title={t(label)}
                    disabled={reduceMotion}
                    onClick={() => setAnim((current) => ({ ...current, [key]: !current[key] }))}
                  >
                    <span className="ms">{icon}</span>
                  </button>
                ))}
              </div>
              <p className={styles.animNote}>{reduceMotion ? t("anim.reduced") : t("anim.note")}</p>
            </div>
          </section>

          <section className={styles.actionPanel} aria-labelledby="qr-actions">
            <div className={styles.actionHead}>
              <h2 id="qr-actions">{t("actions.title")}</h2>
              <span
                className={styles.localBadge}
                role="img"
                aria-label={t("actions.noThirdParty")}
                title={t("actions.noThirdParty")}
              >
                <span className="ms">lock</span>
              </span>
            </div>

            <div className={styles.actionGrid}>
              <button
                type="button"
                className={styles.downloadBtn}
                disabled={!canExport}
                onClick={() => void handleExport("png")}
              >
                <span className="ms">download</span>
                <span>
                  <b>{t("actions.png")}</b>
                  <small>{style.exportSize}px</small>
                </span>
              </button>
              <button
                type="button"
                className={`${styles.downloadBtn} ${styles.svgBtn}`}
                disabled={!canExport}
                onClick={() => void handleExport("svg")}
              >
                <span className="ms">polyline</span>
                <span>
                  <b>{t("actions.svg")}</b>
                  <small>vector</small>
                </span>
              </button>
              <button
                type="button"
                className={styles.copyBtn}
                disabled={!local?.ok}
                onClick={() => void handleCopy(local?.ok ? local.url : "")}
              >
                <span className="ms">{copied ? "check" : "content_copy"}</span>
                {copied ? t("actions.copied") : t("actions.copy")}
              </button>
            </div>

            <div className={styles.statusLine} role="status" aria-live="polite">
              {exportState.kind === "busy" ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  {exportState.message}
                </>
              ) : exportState.kind === "ok" ? (
                <>
                  <span className="ms">check_circle</span>
                  {exportState.message}
                </>
              ) : exportState.kind === "error" ? (
                <>
                  <span className="ms">error</span>
                  {exportState.message}
                </>
              ) : health?.canExport ? (
                <>
                  <span className="ms">verified</span>
                  {t("health.ready")}
                </>
              ) : (
                <>
                  <span className="ms">lock</span>
                  {t("health.blocked")}
                </>
              )}
            </div>
            {serverError ? (
              <p className={styles.inlineError} role="alert">
                <span className="ms">error</span>
                {serverError}
              </p>
            ) : null}

            {authState === "user" && mode === "url" && local?.ok ? (
              <div className={styles.shortBlock}>
                <div className={styles.shortForm}>
                  <label className="field">
                    <span>{t("actions.shortSlug")}</span>
                    <input
                      type="text"
                      value={slug}
                      maxLength={30}
                      placeholder={t("actions.shortSlugPh")}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.createBtn}
                    disabled={creating}
                    onClick={() => void handleCreateShort()}
                  >
                    <span className="ms">bolt</span>
                    {creating ? t("actions.shortCreating") : t("actions.short")}
                  </button>
                </div>
                {createError ? (
                  <p className={styles.inlineError} role="alert">
                    <span className="ms">error</span>
                    {createError}
                  </p>
                ) : null}
                {createdShort ? (
                  <div className={styles.shortResult}>
                    <label className={styles.toggleRow}>
                      <input
                        type="checkbox"
                        checked={useCreatedShort}
                        onChange={(e) => setUseCreatedShort(e.target.checked)}
                      />
                      <span>{t("actions.useShort")}</span>
                    </label>
                    <code>{createdShort.shortUrl}</code>
                    <button
                      type="button"
                      className={styles.copyMini}
                      onClick={() => void handleCopy(createdShort.shortUrl, true)}
                    >
                      <span className="ms">{shortCopied ? "check" : "content_copy"}</span>
                      {shortCopied ? t("actions.copied") : t("actions.copy")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {authState === "anon" ? (
              <p className={styles.loginNote}>
                <span className="ms">lock</span>
                {t("actions.login")}
                <Link href="/login?next=/qr" className={styles.inlineLink}>
                  {t("nav.login")}
                </Link>
              </p>
            ) : null}

            {relatedShort ? (
              <div className={styles.relation}>
                <span className={styles.groupLabel}>{t("actions.relation")}</span>
                <div className={styles.relationRow}>
                  <span className={styles.relationNode}>
                    <span className="ms">qr_code_2</span>
                    QR
                  </span>
                  <span className="ms">arrow_forward</span>
                  <code>{relatedShort.shortUrl}</code>
                  <span className="ms">arrow_forward</span>
                  <span className={styles.relationDest}>{relatedShort.destinationUrl}</span>
                </div>
              </div>
            ) : null}
          </section>
        </aside>
      </div>

    </main>
  );
}
