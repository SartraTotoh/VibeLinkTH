import { beforeAll, describe, expect, it, vi } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import sharp from "sharp";
import { createQrMatrixForStyle, renderQrRgba } from "../lib/qr/matrix";
import { defaultQrStyle, styleForPreset } from "../lib/qr/presets";
import { renderQrSvg } from "../lib/qr/svg";
import { validateQrStyle } from "../lib/qr/style";
import type { QrPresetId, QrStyleConfig, RgbaImage } from "../lib/qr/types";

// jsQR is CPU-heavy and Neon/CI machines can be slow; keep a realistic bound.
beforeAll(() => {
  vi.setConfig({ testTimeout: 30_000 });
});

function toPng(image: RgbaImage): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data);
  return PNG.sync.write(png);
}

function decodePng(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

function makeLogo(): RgbaImage {
  const size = 96;
  const data = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const idx = (y * size + x) * 4;
      if (dx * dx + dy * dy <= 42 * 42) {
        data[idx] = 111;
        data[idx + 1] = 76;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
      if (dx * dx + dy * dy <= 16 * 16) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
  }
  return { width: size, height: size, data };
}

function render(payload: string, style: QrStyleConfig, logo?: RgbaImage) {
  const matrix = createQrMatrixForStyle(payload, style);
  const image = renderQrRgba({ matrix, style, targetSize: 512, logo: logo ?? null });
  return { matrix, image };
}

describe("PNG renderer — real decode evidence", () => {
  const payload = "https://example.com/test";

  it("decodes Blink, Pank and Print Safe presets", () => {
    for (const id of ["blink", "pank", "print"] as QrPresetId[]) {
      const style = defaultQrStyle(id);
      const { image } = render(payload, style);
      expect(decodePng(toPng(image)), id).toBe(payload);
    }
  });

  it("decodes square, rounded and dots patterns", () => {
    for (const pattern of ["square", "rounded", "dots"] as const) {
      const style: QrStyleConfig = { ...defaultQrStyle("print"), pattern, ecc: "H" };
      const { image } = render(payload, style);
      expect(decodePng(toPng(image)), pattern).toBe(payload);
    }
  });

  it("decodes square and rounded eyes", () => {
    for (const eye of ["square", "rounded"] as const) {
      const style: QrStyleConfig = { ...defaultQrStyle("print"), eye, ecc: "H" };
      const { image } = render(payload, style);
      expect(decodePng(toPng(image)), eye).toBe(payload);
    }
  });

  it("decodes a 14% centre logo with forced ECC H", () => {
    const style = validateQrStyle({
      ...defaultQrStyle("print"),
      logoRatio: 0.14,
    });
    expect(style.ok).toBe(true);
    expect(style.effectiveEcc).toBe("H");
    const { image } = render(payload, style.style, makeLogo());
    expect(decodePng(toPng(image))).toBe(payload);
  });

  it("decodes UTM and short-link payloads", () => {
    const utm = "https://example.com/promo?utm_source=tiktok&utm_medium=bio&ref=vibelink";
    expect(decodePng(toPng(render(utm, defaultQrStyle("pank")).image))).toBe(utm);

    const short = "https://vibelinkth.com/go/abc123";
    expect(decodePng(toPng(render(short, defaultQrStyle("blink")).image))).toBe(short);
  });

  it("keeps the minimum 4-module quiet zone in the exported geometry", () => {
    const style = defaultQrStyle("print");
    const { matrix, image } = render(payload, style);
    const total = matrix.size + style.margin * 2;
    expect(image.width % total).toBe(0);
    expect(image.width / total).toBeGreaterThanOrEqual(2);
  });
});

describe("SVG renderer — real decode evidence", () => {
  const payload = "https://example.com/test?utm_source=line&ref=vibelink";

  it("decodes a rasterised SVG with frame and CTA", async () => {
    const style = { ...styleForPreset(defaultQrStyle("blink"), "blink"), frame: "caption" as const, cta: "Scan to open" };
    const matrix = createQrMatrixForStyle(payload, style);
    const svg = renderQrSvg({ matrix, style, exportSize: 512 });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(decodePng(png)).toBe(payload);
  });

  it("decodes a rasterised SVG with a raster logo", async () => {
    const style = { ...defaultQrStyle("print"), logoRatio: 0.14, frame: "ticket" as const };
    const matrix = createQrMatrixForStyle(payload, style);
    const logoSvg = await sharp({
      create: {
        width: 96,
        height: 96,
        channels: 4,
        background: { r: 111, g: 76, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const logoDataUrl = `data:image/png;base64,${logoSvg.toString("base64")}`;
    const svg = renderQrSvg({ matrix, style, exportSize: 512, logoDataUrl });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(decodePng(png)).toBe(payload);
  });
});

describe("over-limit logo is blocked before rendering", () => {
  it("rejects a logo ratio above 18%", () => {
    const result = validateQrStyle({ ...defaultQrStyle("print"), logoRatio: 0.25 });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_LOGO_RATIO")).toBe(true);
  });
});
