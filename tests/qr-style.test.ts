import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  effectiveEcc,
  isDarkOnLight,
  normalizeStyle,
  qrGeometry,
  sanitizeCta,
  validateQrStyle,
} from "../lib/qr/style";
import { QR_PRESETS, defaultQrStyle, styleForPreset } from "../lib/qr/presets";
import { QR_MAX_LOGO_RATIO, QR_MAX_MARGIN, QR_MIN_MARGIN } from "../lib/qr/types";

describe("presets", () => {
  it("are all dark-on-light and pass 4.5:1 contrast", () => {
    for (const preset of Object.values(QR_PRESETS)) {
      expect(isDarkOnLight(preset.fg, preset.bg), preset.id).toBe(true);
      expect(contrastRatio(preset.fg, preset.bg), preset.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("switching preset changes colours but keeps layout choices", () => {
    const start = { ...defaultQrStyle("blink"), pattern: "dots" as const, cta: "Scan Me" };
    const next = styleForPreset(start, "pank");
    expect(next.preset).toBe("pank");
    expect(next.fg).toBe(QR_PRESETS.pank.fg);
    expect(next.bg).toBe(QR_PRESETS.pank.bg);
    expect(next.pattern).toBe("dots");
    expect(next.cta).toBe("Scan Me");
  });
});

describe("normalizeStyle", () => {
  it("clamps margin to the safe range", () => {
    expect(normalizeStyle({ margin: 1 }).margin).toBe(QR_MIN_MARGIN);
    expect(normalizeStyle({ margin: 99 }).margin).toBe(QR_MAX_MARGIN);
    expect(normalizeStyle({ margin: 6 }).margin).toBe(6);
  });

  it("clamps logo ratio to 18% and rounds to 1%", () => {
    expect(normalizeStyle({ logoRatio: 0.5 }).logoRatio).toBe(QR_MAX_LOGO_RATIO);
    expect(normalizeStyle({ logoRatio: 0.141 }).logoRatio).toBe(0.14);
    expect(normalizeStyle({ logoRatio: -1 }).logoRatio).toBe(0);
  });

  it("falls back safely for unknown values", () => {
    const style = normalizeStyle({
      preset: "neon",
      fg: "red",
      bg: "rgb(0,0,0)",
      pattern: "stripes",
      eye: "star",
      frame: "frame",
      ecc: "X",
      exportSize: 600,
      cta: 123,
    });
    expect(style.preset).toBe("blink");
    expect(style.fg).toBe(QR_PRESETS.blink.fg);
    expect(style.bg).toBe(QR_PRESETS.blink.bg);
    expect(style.pattern).toBe("square");
    expect(style.eye).toBe("square");
    expect(style.frame).toBe("caption");
    expect(style.ecc).toBe("M");
    expect(style.exportSize).toBe(1024);
    expect(style.cta).toBe("");
  });
});

describe("sanitizeCta", () => {
  it("strips control characters, collapses spaces, trims and caps at 48", () => {
    expect(sanitizeCta("  Scan\t\n  me  ")).toBe("Scan me");
    expect(sanitizeCta("x".repeat(80))).toHaveLength(48);
    expect(sanitizeCta("<script>alert(1)</script>")).toBe("<script>alert(1)</script>".slice(0, 48));
    expect(sanitizeCta(null)).toBe("");
  });
});

describe("validateQrStyle", () => {
  it("accepts the three presets with their default style", () => {
    for (const id of ["blink", "pank", "print"] as const) {
      const result = validateQrStyle(defaultQrStyle(id));
      expect(result.ok, id).toBe(true);
      expect(result.issues.filter((i) => i.severity === "fail")).toHaveLength(0);
    }
  });

  it("fails a low-contrast palette", () => {
    const result = validateQrStyle({ ...defaultQrStyle("print"), fg: "#eeeeee", bg: "#ffffff" });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "LOW_CONTRAST")).toBe(true);
  });

  it("warns (but allows) mid-range contrast", () => {
    const result = validateQrStyle({ ...defaultQrStyle("print"), fg: "#8a8a8a", bg: "#ffffff" });
    expect(result.issues.some((i) => i.code === "CONTRAST_WARN")).toBe(true);
    expect(result.issues.some((i) => i.code === "LOW_CONTRAST")).toBe(false);
  });

  it("fails an unsafe quiet zone", () => {
    const result = validateQrStyle({ ...defaultQrStyle("print"), margin: 1 });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_MARGIN")).toBe(true);
  });

  it("fails a logo over 18%", () => {
    const result = validateQrStyle({ ...defaultQrStyle("print"), logoRatio: 0.19 });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_LOGO_RATIO")).toBe(true);
  });

  it("flags inverted colours as a warning, not a hard fail", () => {
    const result = validateQrStyle({ ...defaultQrStyle("print"), fg: "#ffffff", bg: "#000000" });
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.code === "INVERTED_COLORS")).toBe(true);
  });

  it("forces ECC H when a logo is present", () => {
    expect(effectiveEcc({ ecc: "M", logoRatio: 0 })).toBe("M");
    expect(effectiveEcc({ ecc: "M", logoRatio: 0.1 })).toBe("H");
    expect(effectiveEcc({ ecc: "Q", logoRatio: 0.14 })).toBe("H");
  });
});

describe("qrGeometry", () => {
  it("counts the quiet zone on both sides and keeps the card wider than the symbol", () => {
    const style = defaultQrStyle("print");
    const g = qrGeometry(style, 25, 1024);
    expect(g.totalModules).toBe(25 + style.margin * 2);
    expect(g.cardModulesWide).toBe(g.totalModules + 8);
    expect(g.cardModulesHigh).toBeGreaterThan(g.cardModulesWide);
    expect(g.scale).toBeGreaterThanOrEqual(2);
    expect(g.qrPixelSize).toBe(g.totalModules * g.scale);
  });

  it("drops the CTA band when there is no frame and no CTA", () => {
    const quiet = { ...defaultQrStyle("print"), frame: "none" as const, cta: "" };
    const g = qrGeometry(quiet, 25, 1024);
    expect(g.hasCta).toBe(false);
    expect(g.cardModulesHigh).toBe(g.cardModulesWide);
  });
});
