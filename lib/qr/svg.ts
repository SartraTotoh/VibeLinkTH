import { normalizeStyle } from "./style";
import type { QrMatrix, QrStyleConfig } from "./types";

const PNG_DATA_URL = /^data:image\/png;base64,[a-z0-9+/=\s]+$/i;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sanitizeLogoDataUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "");
  if (!PNG_DATA_URL.test(compact)) return null;
  return compact;
}

function inFinder(row: number, col: number, size: number): boolean {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= size - 7) ||
    (row >= size - 7 && col < 7)
  );
}

export type SvgRenderOptions = {
  matrix: QrMatrix;
  style: QrStyleConfig;
  exportSize: number;
  logoDataUrl?: string | null;
};

export function renderQrSvg({ matrix, style: rawStyle, exportSize, logoDataUrl }: SvgRenderOptions): string {
  const style = normalizeStyle(rawStyle);
  const size = matrix.size;
  const margin = Math.max(4, Math.round(style.margin));
  const total = size + margin * 2;
  const cardPad = 4;
  const hasCta = style.frame !== "none" || style.cta.trim() !== "";
  const band = hasCta ? 5 : 0;
  const cardW = total + cardPad * 2;
  const cardH = total + cardPad * 2 + band;
  const widthPx = Math.min(4096, Math.max(256, Math.round(exportSize)));
  const heightPx = Math.round((widthPx * cardH) / cardW);
  const roundedEyes = style.eye === "rounded";
  const logo = sanitizeLogoDataUrl(logoDataUrl);

  const fg = escapeXml(style.fg);
  const bg = escapeXml(style.bg);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${cardW} ${cardH}" role="img" aria-label="VibeLink QR">`,
  );
  parts.push(`<title>VibeLink QR</title>`);
  parts.push(`<rect width="${cardW}" height="${cardH}" rx="4" fill="${bg}"/>`);
  parts.push(`<g transform="translate(${cardPad} ${cardPad})">`);

  if (style.pattern === "square") {
    const segments: string[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!matrix.data[row * size + col]) continue;
        if (inFinder(row, col, size)) continue;
        const x = margin + col;
        const y = margin + row;
        segments.push(`M${x} ${y}h1v1h-1z`);
      }
    }
    if (segments.length > 0) parts.push(`<path d="${segments.join("")}" fill="${fg}" shape-rendering="crispEdges"/>`);
  } else if (style.pattern === "rounded") {
    parts.push(`<g fill="${fg}">`);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!matrix.data[row * size + col]) continue;
        if (inFinder(row, col, size)) continue;
        parts.push(
          `<rect x="${margin + col}" y="${margin + row}" width="1" height="1" rx="0.3"/>`,
        );
      }
    }
    parts.push(`</g>`);
  } else {
    parts.push(`<g fill="${fg}">`);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!matrix.data[row * size + col]) continue;
        if (inFinder(row, col, size)) continue;
        parts.push(`<circle cx="${margin + col + 0.5}" cy="${margin + row + 0.5}" r="0.52"/>`);
      }
    }
    parts.push(`</g>`);
  }

  const eyeRadius = roundedEyes ? 1.15 : 0;
  const holeRadius = roundedEyes ? 0.8 : 0;
  const innerRadius = roundedEyes ? 0.7 : 0;
  const eyes: Array<[number, number]> = [
    [margin, margin],
    [margin + size - 7, margin],
    [margin, margin + size - 7],
  ];
  parts.push(`<g>`);
  for (const [x, y] of eyes) {
    parts.push(`<rect x="${x}" y="${y}" width="7" height="7" rx="${eyeRadius}" fill="${fg}"/>`);
    parts.push(`<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="${holeRadius}" fill="${bg}"/>`);
    parts.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${innerRadius}" fill="${fg}"/>`);
  }
  parts.push(`</g>`);

  if (logo && style.logoRatio > 0) {
    const logoSize = Math.min(0.18, style.logoRatio) * size;
    const pad = 0.6;
    const backing = logoSize + pad * 2;
    const cx = total / 2;
    const cy = total / 2;
    const bx = cx - backing / 2;
    const by = cy - backing / 2;
    parts.push(
      `<rect x="${bx.toFixed(3)}" y="${by.toFixed(3)}" width="${backing.toFixed(3)}" height="${backing.toFixed(3)}" rx="${(backing * 0.2).toFixed(3)}" fill="${bg}"/>`,
    );
    parts.push(
      `<image href="${logo}" x="${(bx + pad).toFixed(3)}" y="${(by + pad).toFixed(3)}" width="${logoSize.toFixed(3)}" height="${logoSize.toFixed(3)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  if (hasCta) {
    const bandY = total + cardPad + 0.4;
    const textY = total + cardPad + 3;
    const text = escapeXml(style.cta);
    if (style.frame === "ticket") {
      parts.push(
        `<rect x="1" y="${bandY}" width="${cardW - 2}" height="${band - 1.2}" rx="2.4" fill="${escapeXml(style.fg)}"/>`,
      );
      parts.push(
        `<text x="${cardW / 2}" y="${textY}" text-anchor="middle" font-family="'IBM Plex Sans Thai', Tahoma, sans-serif" font-size="2.6" font-weight="700" letter-spacing="0.04" fill="${bg}">${text}</text>`,
      );
    } else {
      parts.push(
        `<text x="${cardW / 2}" y="${textY}" text-anchor="middle" font-family="'IBM Plex Sans Thai', Tahoma, sans-serif" font-size="2.6" font-weight="700" letter-spacing="0.04" fill="${fg}">${text}</text>`,
      );
    }
  }

  parts.push(`</g>`);
  parts.push(`</svg>`);
  return parts.join("");
}
