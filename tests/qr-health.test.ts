import { describe, expect, it } from "vitest";
import { evaluateQrHealth, type HealthInput } from "../lib/qr/health";
import { defaultQrStyle } from "../lib/qr/presets";

const PAYLOAD = "https://example.com/page";

function input(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    payload: PAYLOAD,
    style: defaultQrStyle("print"),
    matrixSize: 25,
    exportSize: 1024,
    qrPixelSize: 824,
    printWidthMm: 40,
    isProduction: true,
    decode: { ok: true, text: PAYLOAD },
    lang: "th",
    ...overrides,
  };
}

function ids(result: ReturnType<typeof evaluateQrHealth>) {
  return result.items.map((i) => i.id);
}

describe("evaluateQrHealth", () => {
  it("returns 10 explainable checks and unlocks export on a clean image", () => {
    const result = evaluateQrHealth(input());
    expect(result.items).toHaveLength(10);
    expect(new Set(ids(result)).size).toBe(10);
    expect(result.fail).toBe(0);
    expect(result.canExport).toBe(true);
    expect(result.pass).toBeGreaterThanOrEqual(8);
  });

  it("never uses SEO or conversion-score language", () => {
    const result = evaluateQrHealth(input());
    const text = result.items.map((i) => `${i.title} ${i.detail}`).join(" ").toLowerCase();
    expect(text).not.toContain("seo");
    expect(text).not.toContain("conversion score");
    expect(text).not.toContain("คะแนน seo");
    expect(text).not.toContain("คะแนน conversion");
  });

  it("explains every item with a title and detail in Thai", () => {
    const result = evaluateQrHealth(input());
    for (const item of result.items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
    }
  });

  it("blocks export when decode has not run", () => {
    const result = evaluateQrHealth(input({ decode: null }));
    expect(result.canExport).toBe(false);
    const decode = result.items.find((i) => i.id === "decode");
    expect(decode?.status).toBe("warn");
  });

  it("fails when the decoded payload does not match", () => {
    const result = evaluateQrHealth(input({ decode: { ok: true, text: "https://evil.test" } }));
    expect(result.canExport).toBe(false);
    expect(result.items.find((i) => i.id === "decode")?.status).toBe("fail");
  });

  it("fails when the image cannot be decoded at all", () => {
    const result = evaluateQrHealth(input({ decode: { ok: false, error: "not found" } }));
    expect(result.canExport).toBe(false);
    expect(result.items.find((i) => i.id === "decode")?.detail).toContain("not found");
  });

  it("fails low contrast and warns mid contrast", () => {
    const low = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), fg: "#eeeeee", bg: "#ffffff" } }),
    );
    expect(low.items.find((i) => i.id === "contrast")?.status).toBe("fail");
    expect(low.canExport).toBe(false);

    const mid = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), fg: "#8a8a8a", bg: "#ffffff" } }),
    );
    expect(mid.items.find((i) => i.id === "contrast")?.status).toBe("warn");
    expect(mid.canExport).toBe(true);
  });

  it("fails an under-sized quiet zone", () => {
    const result = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), margin: 2 } }),
    );
    expect(result.items.find((i) => i.id === "quiet-zone")?.status).toBe("fail");
    expect(result.canExport).toBe(false);
  });

  it("warns at 16-18% logo and fails above 18%", () => {
    const warn = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), logoRatio: 0.17 } }),
    );
    expect(warn.items.find((i) => i.id === "logo")?.status).toBe("warn");
    expect(warn.canExport).toBe(true);

    const fail = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), logoRatio: 0.2 } }),
    );
    expect(fail.items.find((i) => i.id === "logo")?.status).toBe("fail");
    expect(fail.canExport).toBe(false);
  });

  it("fails when modules are too small for the exported pixel size", () => {
    const result = evaluateQrHealth(input({ qrPixelSize: 66 }));
    expect(result.items.find((i) => i.id === "digital-size")?.status).toBe("fail");
  });

  it("fails when the printed module is under 0.35 mm", () => {
    const result = evaluateQrHealth(input({ printWidthMm: 10 }));
    expect(result.items.find((i) => i.id === "print-size")?.status).toBe("fail");
  });

  it("warns for HTTP in production but allows it on localhost", () => {
    const prod = evaluateQrHealth(input({ payload: "http://example.com/x" }));
    expect(prod.items.find((i) => i.id === "https")?.status).toBe("warn");

    const local = evaluateQrHealth(input({ payload: "http://localhost:3000/x" }));
    expect(local.items.find((i) => i.id === "https")?.status).toBe("info");
  });

  it("fails an over-long CTA and passes a clean frame", () => {
    const tooLong = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), cta: "x".repeat(49) } }),
    );
    expect(tooLong.items.find((i) => i.id === "frame-cta")?.status).toBe("fail");

    const clean = evaluateQrHealth(input());
    expect(clean.items.find((i) => i.id === "frame-cta")?.status).toBe("pass");

    const empty = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), frame: "none", cta: "" } }),
    );
    expect(empty.items.find((i) => i.id === "frame-cta")?.status).toBe("info");
  });

  it("warns for inverted colours", () => {
    const result = evaluateQrHealth(
      input({ style: { ...defaultQrStyle("print"), fg: "#ffffff", bg: "#000000" } }),
    );
    expect(result.items.find((i) => i.id === "print-safe")?.status).toBe("warn");
    expect(result.canExport).toBe(true);
  });

  it("renders English explanations when lang is en", () => {
    const result = evaluateQrHealth(input({ lang: "en" }));
    expect(result.items.find((i) => i.id === "decode")?.title).toBe("Decode passed");
  });
});
