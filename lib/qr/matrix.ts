import QRCode from "qrcode";
import { contrastRatio, effectiveEcc, hexToRgb, normalizeStyle } from "./style";
import type { QrEcc, QrMatrix, QrStyleConfig, RgbaImage } from "./types";

type Rgb = { r: number; g: number; b: number };

export function createQrMatrix(payload: string, ecc: QrEcc): QrMatrix {
  if (!payload || payload.trim() === "") throw new Error("QR payload ว่าง");
  const qr = QRCode.create(payload, { errorCorrectionLevel: ecc });
  return {
    size: qr.modules.size,
    data: qr.modules.data,
    version: qr.version,
    ecc,
  };
}

export function createQrMatrixForStyle(payload: string, style: QrStyleConfig): QrMatrix {
  return createQrMatrix(payload, effectiveEcc(style));
}

function colorOf(hex: string, fallback: Rgb): Rgb {
  return hexToRgb(hex) ?? fallback;
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, rgb: Rgb, alpha = 1) {
  if (x < 0 || y < 0 || x >= width) return;
  const idx = (y * width + x) * 4;
  if (idx < 0 || idx + 3 >= data.length) return;
  if (alpha >= 1) {
    data[idx] = rgb.r;
    data[idx + 1] = rgb.g;
    data[idx + 2] = rgb.b;
    data[idx + 3] = 255;
    return;
  }
  if (alpha <= 0) return;
  const inv = 1 - alpha;
  data[idx] = Math.round(rgb.r * alpha + data[idx]! * inv);
  data[idx + 1] = Math.round(rgb.g * alpha + data[idx + 1]! * inv);
  data[idx + 2] = Math.round(rgb.b * alpha + data[idx + 2]! * inv);
  data[idx + 3] = Math.max(data[idx + 3]!, Math.round(255 * alpha));
}

function fillRect(data: Uint8ClampedArray, width: number, x: number, y: number, w: number, h: number, rgb: Rgb) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(data.length / 4 / width, Math.ceil(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) setPixel(data, width, px, py, rgb);
  }
}

function insideRoundedRect(px: number, py: number, x: number, y: number, w: number, h: number, r: number): boolean {
  if (px < x || py < y || px >= x + w || py >= y + h) return false;
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  if (rad === 0) return true;
  const cx = Math.min(Math.max(px, x + rad), x + w - rad);
  const cy = Math.min(Math.max(py, y + rad), y + h - rad);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rad * rad;
}

function fillRoundedRect(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  rgb: Rgb,
) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(data.length / 4 / width, Math.ceil(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (insideRoundedRect(px + 0.5, py + 0.5, x, y, w, h, r)) setPixel(data, width, px, py, rgb);
    }
  }
}

function fillCircle(data: Uint8ClampedArray, width: number, cx: number, cy: number, radius: number, rgb: Rgb) {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(width, Math.ceil(cx + radius));
  const y1 = Math.min(data.length / 4 / width, Math.ceil(cy + radius));
  const rr = radius * radius;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      if (dx * dx + dy * dy <= rr) setPixel(data, width, px, py, rgb);
    }
  }
}

function inFinder(row: number, col: number, size: number): boolean {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= size - 7) ||
    (row >= size - 7 && col < 7)
  );
}

function drawEye(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  scale: number,
  rounded: boolean,
  fg: Rgb,
  bg: Rgb,
) {
  const outerRadius = rounded ? scale * 1.15 : 0;
  const innerRadius = rounded ? scale * 0.7 : 0;
  const holeRadius = rounded ? scale * 0.8 : 0;

  fillRoundedRect(data, width, x, y, scale * 7, scale * 7, outerRadius, fg);
  fillRoundedRect(data, width, x + scale, y + scale, scale * 5, scale * 5, holeRadius, bg);
  fillRoundedRect(data, width, x + scale * 2, y + scale * 2, scale * 3, scale * 3, innerRadius, fg);
}

function drawLogo(
  data: Uint8ClampedArray,
  width: number,
  style: QrStyleConfig,
  logo: RgbaImage,
  margin: number,
  scale: number,
  qrSizeModules: number,
  bg: Rgb,
) {
  const ratio = style.logoRatio;
  if (ratio <= 0 || logo.width <= 0 || logo.height <= 0) return;

  const qrSidePx = qrSizeModules * scale;
  const logoSize = Math.max(4, Math.round(qrSidePx * Math.min(ratio, 0.18)));
  const padding = Math.max(2, Math.round(scale * 0.6));
  const backing = logoSize + padding * 2;
  const cx = margin * scale + qrSidePx / 2;
  const cy = margin * scale + qrSidePx / 2;
  const bx = Math.round(cx - backing / 2);
  const by = Math.round(cy - backing / 2);

  fillRoundedRect(data, width, bx, by, backing, backing, Math.round(backing * 0.2), bg);

  const scaleX = logo.width / logoSize;
  const scaleY = logo.height / logoSize;
  const ox = bx + padding;
  const oy = by + padding;

  for (let py = 0; py < logoSize; py++) {
    const sy = Math.min(logo.height - 1, Math.floor(py * scaleY));
    for (let px = 0; px < logoSize; px++) {
      const sx = Math.min(logo.width - 1, Math.floor(px * scaleX));
      const si = (sy * logo.width + sx) * 4;
      const alpha = logo.data[si + 3] ?? 0;
      if (alpha === 0) continue;
      setPixel(
        data,
        width,
        ox + px,
        oy + py,
        { r: logo.data[si] ?? 0, g: logo.data[si + 1] ?? 0, b: logo.data[si + 2] ?? 0 },
        alpha / 255,
      );
    }
  }
}

export type RenderQrOptions = {
  matrix: QrMatrix;
  style: QrStyleConfig;
  targetSize: number;
  logo?: RgbaImage | null;
};

/**
 * Pure RGBA renderer. The same pixels feed the browser canvas, the PNG export
 * and the Node decode tests, so decode evidence matches what users download.
 */
export function renderQrRgba({ matrix, style: rawStyle, targetSize, logo }: RenderQrOptions): RgbaImage {
  const style = normalizeStyle(rawStyle);
  const size = matrix.size;
  const margin = Math.max(4, Math.round(style.margin));
  const totalModules = size + margin * 2;
  const clampedTarget = Math.min(4096, Math.max(256, Math.round(targetSize)));
  const scale = Math.max(2, Math.floor(clampedTarget / totalModules));
  const width = totalModules * scale;
  const height = width;

  const bg = colorOf(style.bg, { r: 255, g: 255, b: 255 });
  const fg = colorOf(style.fg, { r: 0, g: 0, b: 0 });

  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = bg.r;
    data[i + 1] = bg.g;
    data[i + 2] = bg.b;
    data[i + 3] = 255;
  }

  const origin = margin * scale;
  const dotRadius = scale * 0.52;
  const roundedRadius = scale * 0.3;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!matrix.data[row * size + col]) continue;
      if (inFinder(row, col, size)) continue;
      const x = origin + col * scale;
      const y = origin + row * scale;
      if (style.pattern === "dots") {
        fillCircle(data, width, x + scale / 2, y + scale / 2, dotRadius, fg);
      } else if (style.pattern === "rounded") {
        fillRoundedRect(data, width, x, y, scale, scale, roundedRadius, fg);
      } else {
        fillRect(data, width, x, y, scale, scale, fg);
      }
    }
  }

  const roundedEyes = style.eye === "rounded";
  drawEye(data, width, origin, origin, scale, roundedEyes, fg, bg);
  drawEye(data, width, origin + (size - 7) * scale, origin, scale, roundedEyes, fg, bg);
  drawEye(data, width, origin, origin + (size - 7) * scale, scale, roundedEyes, fg, bg);

  if (logo && style.logoRatio > 0) {
    drawLogo(data, width, style, logo, margin, scale, size, bg);
  }

  return { width, height, data };
}

/** Exposed for tests that want to assert the chosen colours stay readable. */
export function styleContrast(style: QrStyleConfig): number {
  return contrastRatio(style.fg, style.bg);
}
