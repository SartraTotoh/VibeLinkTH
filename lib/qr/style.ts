import { z } from "zod";
import { QR_PRESETS, defaultQrStyle, isQrPreset } from "./presets";
import {
  QR_MAX_CTA_LENGTH,
  QR_MAX_LOGO_RATIO,
  QR_MAX_MARGIN,
  QR_MIN_MARGIN,
  QR_RECOMMENDED_LOGO_RATIO,
  type QrEcc,
  type QrExportSize,
  type QrEye,
  type QrFrame,
  type QrPattern,
  type QrStyleConfig,
} from "./types";

const HEX = /^#[0-9a-f]{6}$/i;

const styleSchema = z.object({
  preset: z.enum(["blink", "pank", "print"]),
  fg: z.string().regex(HEX),
  bg: z.string().regex(HEX),
  pattern: z.enum(["square", "rounded", "dots"]),
  eye: z.enum(["square", "rounded"]),
  margin: z.number().int().min(QR_MIN_MARGIN).max(QR_MAX_MARGIN),
  ecc: z.enum(["M", "Q", "H"]),
  logoRatio: z.number().min(0).max(QR_MAX_LOGO_RATIO),
  frame: z.enum(["none", "caption", "ticket"]),
  cta: z.string().max(QR_MAX_CTA_LENGTH),
  exportSize: z.union([z.literal(512), z.literal(1024), z.literal(2048)]),
});

export type StyleIssueCode =
  | "INVALID_PRESET"
  | "INVALID_COLOR"
  | "INVALID_PATTERN"
  | "INVALID_EYE"
  | "INVALID_MARGIN"
  | "INVALID_ECC"
  | "INVALID_LOGO_RATIO"
  | "INVALID_FRAME"
  | "INVALID_CTA"
  | "INVALID_EXPORT_SIZE"
  | "LOW_CONTRAST"
  | "CONTRAST_WARN"
  | "INVERTED_COLORS";

export type StyleIssue = {
  code: StyleIssueCode;
  severity: "warn" | "fail";
  message: string;
};

export type StyleValidation = {
  ok: boolean;
  style: QrStyleConfig;
  issues: StyleIssue[];
  contrast: number;
  effectiveEcc: QrEcc;
};

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isHexColor(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG 2.x contrast formula. Not a QR-specific score, only a readable ratio. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isDarkOnLight(fg: string, bg: string): boolean {
  return relativeLuminance(fg) < relativeLuminance(bg);
}

export function effectiveEcc(style: Pick<QrStyleConfig, "ecc" | "logoRatio">): QrEcc {
  return style.logoRatio > 0 ? "H" : style.ecc;
}

export function sanitizeCta(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, QR_MAX_CTA_LENGTH);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeStyle(input: unknown): QrStyleConfig {
  const base = defaultQrStyle();
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const preset = isQrPreset(src.preset) ? src.preset : base.preset;
  const presetDef = QR_PRESETS[preset];

  const pattern: QrPattern =
    src.pattern === "square" || src.pattern === "rounded" || src.pattern === "dots"
      ? src.pattern
      : base.pattern;
  const eye: QrEye = src.eye === "square" || src.eye === "rounded" ? src.eye : base.eye;
  const frame: QrFrame =
    src.frame === "none" || src.frame === "caption" || src.frame === "ticket"
      ? src.frame
      : base.frame;
  const ecc: QrEcc = src.ecc === "M" || src.ecc === "Q" || src.ecc === "H" ? src.ecc : base.ecc;
  const exportSize: QrExportSize =
    src.exportSize === 512 || src.exportSize === 1024 || src.exportSize === 2048
      ? src.exportSize
      : base.exportSize;

  return {
    preset,
    fg: isHexColor(src.fg) ? src.fg.toLowerCase() : presetDef.fg,
    bg: isHexColor(src.bg) ? src.bg.toLowerCase() : presetDef.bg,
    pattern,
    eye,
    margin: Math.round(clamp(typeof src.margin === "number" ? src.margin : base.margin, QR_MIN_MARGIN, QR_MAX_MARGIN)),
    ecc,
    logoRatio: Math.round(clamp(typeof src.logoRatio === "number" ? src.logoRatio : 0, 0, QR_MAX_LOGO_RATIO) * 100) / 100,
    frame,
    cta: sanitizeCta(src.cta ?? base.cta),
    exportSize,
  };
}

export function validateQrStyle(input: unknown): StyleValidation {
  const style = normalizeStyle(input);
  const issues: StyleIssue[] = [];
  const parsed = styleSchema.safeParse(input);

  if (!parsed.success) {
    const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    if (src.preset !== undefined && !isQrPreset(src.preset)) {
      issues.push({ code: "INVALID_PRESET", severity: "fail", message: "Preset ไม่รู้จัก" });
    }
    if (src.fg !== undefined && !isHexColor(src.fg)) {
      issues.push({ code: "INVALID_COLOR", severity: "fail", message: "สี Foreground ต้องเป็น hex 6 หลัก" });
    }
    if (src.bg !== undefined && !isHexColor(src.bg)) {
      issues.push({ code: "INVALID_COLOR", severity: "fail", message: "สี Background ต้องเป็น hex 6 หลัก" });
    }
    if (src.pattern !== undefined && !["square", "rounded", "dots"].includes(String(src.pattern))) {
      issues.push({ code: "INVALID_PATTERN", severity: "fail", message: "Pattern ไม่รู้จัก" });
    }
    if (src.eye !== undefined && !["square", "rounded"].includes(String(src.eye))) {
      issues.push({ code: "INVALID_EYE", severity: "fail", message: "Eye shape ไม่รู้จัก" });
    }
    if (src.margin !== undefined && (typeof src.margin !== "number" || src.margin < QR_MIN_MARGIN)) {
      issues.push({ code: "INVALID_MARGIN", severity: "fail", message: `Quiet zone ต้องมีอย่างน้อย ${QR_MIN_MARGIN} modules` });
    }
    if (src.ecc !== undefined && !["M", "Q", "H"].includes(String(src.ecc))) {
      issues.push({ code: "INVALID_ECC", severity: "fail", message: "Error correction ไม่รู้จัก" });
    }
    if (src.logoRatio !== undefined && (typeof src.logoRatio !== "number" || src.logoRatio > QR_MAX_LOGO_RATIO)) {
      issues.push({ code: "INVALID_LOGO_RATIO", severity: "fail", message: "โลโก้ใหญ่เกิน 18% ของด้าน QR" });
    }
    if (src.frame !== undefined && !["none", "caption", "ticket"].includes(String(src.frame))) {
      issues.push({ code: "INVALID_FRAME", severity: "fail", message: "Frame ไม่รู้จัก" });
    }
    if (src.cta !== undefined && (typeof src.cta !== "string" || src.cta.length > QR_MAX_CTA_LENGTH)) {
      issues.push({ code: "INVALID_CTA", severity: "fail", message: `CTA ต้องไม่เกิน ${QR_MAX_CTA_LENGTH} ตัวอักษร` });
    }
    if (src.exportSize !== undefined && ![512, 1024, 2048].includes(Number(src.exportSize))) {
      issues.push({ code: "INVALID_EXPORT_SIZE", severity: "fail", message: "ขนาด export ต้องเป็น 512/1024/2048" });
    }
  }

  const contrast = contrastRatio(style.fg, style.bg);
  if (contrast < 3) {
    issues.push({
      code: "LOW_CONTRAST",
      severity: "fail",
      message: `Contrast ${contrast.toFixed(2)}:1 ต่ำกว่า 3:1 — สแกนยากมาก`,
    });
  } else if (contrast < 4.5) {
    issues.push({
      code: "CONTRAST_WARN",
      severity: "warn",
      message: `Contrast ${contrast.toFixed(2)}:1 ควรเพิ่มเป็น 4.5:1 ขึ้นไป`,
    });
  }

  if (!isDarkOnLight(style.fg, style.bg)) {
    issues.push({
      code: "INVERTED_COLORS",
      severity: "warn",
      message: "สีกลับด้าน (โมดูลสว่างบนพื้นเข้ม) — บางกล้อง/เครื่องพิมพ์อาจอ่านยาก",
    });
  }

  return {
    ok: issues.every((i) => i.severity !== "fail"),
    style,
    issues,
    contrast,
    effectiveEcc: effectiveEcc(style),
  };
}

export function hasCtaBand(style: QrStyleConfig): boolean {
  return style.frame !== "none" || style.cta.trim() !== "";
}

export type QrGeometry = {
  totalModules: number;
  scale: number;
  qrPixelSize: number;
  pxPerModule: number;
  cardPadModules: number;
  ctaBandModules: number;
  cardModulesWide: number;
  cardModulesHigh: number;
  hasCta: boolean;
};

/**
 * Geometry shared by the canvas preview, PNG export and SVG export.
 * `scale` is the largest integer that keeps the symbol inside `exportSize`.
 */
export function qrGeometry(style: QrStyleConfig, matrixSize: number, exportSize: number): QrGeometry {
  const totalModules = matrixSize + style.margin * 2;
  const scale = Math.max(2, Math.floor(exportSize / totalModules));
  const hasCta = hasCtaBand(style);
  const cardPadModules = 4;
  const ctaBandModules = hasCta ? 5 : 0;
  return {
    totalModules,
    scale,
    qrPixelSize: totalModules * scale,
    pxPerModule: scale,
    cardPadModules,
    ctaBandModules,
    cardModulesWide: totalModules + cardPadModules * 2,
    cardModulesHigh: totalModules + cardPadModules * 2 + ctaBandModules,
    hasCta,
  };
}

export function logoIsRecommended(ratio: number): boolean {
  return ratio <= QR_RECOMMENDED_LOGO_RATIO;
}
