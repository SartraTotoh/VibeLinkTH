import { QR_PRESETS } from "./presets";
import { normalizeStyle } from "./style";
import { renderQrSvg } from "./svg";
import type { QrMatrix, QrStyleConfig, RgbaImage } from "./types";

export type ComposeQrCardArgs = {
  source: RgbaImage;
  style: QrStyleConfig;
  matrixSize: number;
  size: number;
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Compose the downloadable card: QR + padding + CTA/frame.
 * The QR image itself already contains its quiet zone, so the CTA never
 * touches the symbol area.
 */
export function composeQrCard({ source, style: rawStyle, matrixSize, size }: ComposeQrCardArgs): HTMLCanvasElement {
  if (typeof document === "undefined") throw new Error("composeQrCard ต้องรันในเบราว์เซอร์");
  const style = normalizeStyle(rawStyle);
  const preset = QR_PRESETS[style.preset];
  const total = matrixSize + style.margin * 2;
  const cardW = total + 8;
  const hasCta = style.frame !== "none" || style.cta.trim() !== "";
  const band = hasCta ? 5 : 0;
  const cardH = cardW + band;

  const width = Math.max(256, Math.round(size));
  const height = Math.round((width * cardH) / cardW);
  const qrSize = Math.round((width * total) / cardW);
  const pad = Math.round((width - qrSize) / 2);
  const bandHeight = Math.round((width * band) / cardW);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d ไม่พร้อมใช้งาน");

  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, width, height);

  if (style.frame === "ticket") {
    // A small accent cap at the very top keeps the frame visible without a
    // coloured border or anything near the QR modules.
    const cap = Math.max(2, Math.round(height * 0.012));
    ctx.fillStyle = preset.accent;
    roundedRect(ctx, 0, 0, width, cap * 2, cap);
    ctx.fill();
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const bitmap = ctx.createImageData(source.width, source.height);
  bitmap.data.set(source.data);
  const offscreen = document.createElement("canvas");
  offscreen.width = source.width;
  offscreen.height = source.height;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) throw new Error("canvas 2d ไม่พร้อมใช้งาน");
  offCtx.putImageData(bitmap, 0, 0);
  ctx.drawImage(offscreen, pad, pad, qrSize, qrSize);

  if (hasCta) {
    const bandY = pad + qrSize;
    const cta = style.cta.trim();
    const fontSize = Math.max(12, Math.round(bandHeight * 0.46));

    if (style.frame === "ticket") {
      const gap = Math.max(2, Math.round(bandHeight * 0.08));
      ctx.fillStyle = preset.accent;
      roundedRect(ctx, pad, bandY + gap, width - pad * 2, bandHeight - gap * 2, bandHeight * 0.28);
      ctx.fill();
      ctx.fillStyle = preset.accentInk;
    } else {
      ctx.fillStyle = style.fg;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let current = fontSize;
    ctx.font = `700 ${current}px "IBM Plex Sans Thai", "Tahoma", sans-serif`;
    while (current > 12 && ctx.measureText(cta).width > width - pad * 2 - 12) {
      current -= 1;
      ctx.font = `700 ${current}px "IBM Plex Sans Thai", "Tahoma", sans-serif`;
    }
    ctx.fillText(cta, width / 2, bandY + bandHeight / 2, width - pad * 2 - 12);
  }

  return canvas;
}

export function canvasToRgba(canvas: HTMLCanvasElement): RgbaImage {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d ไม่พร้อมใช้งาน");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: image.data };
}

export function makeQrFileName(host: string, ext: "png" | "svg", now = new Date()): string {
  const safeHost = (host || "link")
    .replace(/^www\./i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "link";
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return `vibelink-qr-${safeHost}-${stamp}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadQrPng(args: {
  source: RgbaImage;
  style: QrStyleConfig;
  matrixSize: number;
  size: number;
  host: string;
}): Promise<{ filename: string; bytes: number }> {
  if (typeof document === "undefined") throw new Error("export ต้องรันในเบราว์เซอร์");
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts may not be ready; fallback fonts still render */
  }
  const canvas = composeQrCard({
    source: args.source,
    style: args.style,
    matrixSize: args.matrixSize,
    size: args.size,
  });
  return downloadCanvasPng(canvas, args.host);
}

export async function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  host: string,
): Promise<{ filename: string; bytes: number }> {
  if (typeof document === "undefined") throw new Error("export ต้องรันในเบราว์เซอร์");
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("สร้าง PNG ไม่สำเร็จ");
  const filename = makeQrFileName(host, "png");
  downloadBlob(blob, filename);
  return { filename, bytes: blob.size };
}

export function downloadQrSvg(args: {
  matrix: QrMatrix;
  style: QrStyleConfig;
  logoDataUrl?: string | null;
  exportSize: number;
  host: string;
}): { filename: string; bytes: number } {
  if (typeof document === "undefined") throw new Error("export ต้องรันในเบราว์เซอร์");
  const svg = renderQrSvg({
    matrix: args.matrix,
    style: args.style,
    exportSize: args.exportSize,
    logoDataUrl: args.logoDataUrl,
  });
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const filename = makeQrFileName(args.host, "svg");
  downloadBlob(blob, filename);
  return { filename, bytes: blob.size };
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
