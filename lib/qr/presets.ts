import type { QrPresetId, QrStyleConfig } from "./types";
import { QR_MIN_MARGIN } from "./types";

export type QrPreset = {
  id: QrPresetId;
  labelTh: string;
  labelEn: string;
  descriptionTh: string;
  descriptionEn: string;
  fg: string;
  bg: string;
  accent: string;
  accentInk: string;
  glow: string;
};

/**
 * QR presets are deliberately dark-on-light. Brand colours live on the frame,
 * glow and accents so the symbol stays friendly to cameras and printers.
 */
export const QR_PRESETS: Record<QrPresetId, QrPreset> = {
  blink: {
    id: "blink",
    labelTh: "Blink",
    labelEn: "Blink",
    descriptionTh: "เขียวไลม์อ่อน + หมึกเขียวเข้ม",
    descriptionEn: "Soft lime paper + deep green ink",
    fg: "#14210a",
    bg: "#f2ffd6",
    accent: "#b9ff2c",
    accentInk: "#101400",
    glow: "rgba(185, 255, 44, 0.42)",
  },
  pank: {
    id: "pank",
    labelTh: "Pank",
    labelEn: "Pank",
    descriptionTh: "ชมพูอ่อน + หมึกพลัมเข้ม",
    descriptionEn: "Soft pink paper + deep plum ink",
    fg: "#2b0a2b",
    bg: "#fff0fb",
    accent: "#ff4fd8",
    accentInk: "#2b0a2b",
    glow: "rgba(255, 79, 216, 0.4)",
  },
  print: {
    id: "print",
    labelTh: "Print Safe",
    labelEn: "Print Safe",
    descriptionTh: "ดำบนขาว สำหรับพิมพ์และสแกนยาก",
    descriptionEn: "Black on white, built for print",
    fg: "#000000",
    bg: "#ffffff",
    accent: "#111111",
    accentInk: "#ffffff",
    glow: "rgba(0, 0, 0, 0.2)",
  },
};

export function isQrPreset(value: unknown): value is QrPresetId {
  return value === "blink" || value === "pank" || value === "print";
}

export function defaultQrStyle(preset: QrPresetId = "blink"): QrStyleConfig {
  const p = QR_PRESETS[preset];
  return {
    preset,
    fg: p.fg,
    bg: p.bg,
    pattern: "square",
    eye: "square",
    margin: QR_MIN_MARGIN,
    ecc: "M",
    logoRatio: 0,
    frame: "caption",
    cta: "Scan My Vibe",
    exportSize: 1024,
  };
}

export function styleForPreset(style: QrStyleConfig, preset: QrPresetId): QrStyleConfig {
  const p = QR_PRESETS[preset];
  return { ...style, preset, fg: p.fg, bg: p.bg };
}
