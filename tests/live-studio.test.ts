import { describe, expect, it } from "vitest";
import { clock, coverCrop, dimensions, readDraft } from "../lib/live/studio";

describe("Live local preparation", () => {
  it("restores only bounded preparation data and strips unrelated fields", () => {
    expect(readDraft(JSON.stringify({ title: "ขายสินค้า", aspect: "portrait", secret: "discard", products: [{ id: "1", name: "Daily", price: "฿390", extra: "discard" }] })))
      .toEqual({ title: "ขายสินค้า", aspect: "portrait", products: [{ id: "1", name: "Daily", price: "฿390" }] });
  });
  it("rejects corrupt drafts, duplicate IDs, oversized data and invalid products", () => {
    for (const input of ["{", "null", "x".repeat(40_001), JSON.stringify({ title: "x", aspect: "other", products: [] }), JSON.stringify({ title: "x", aspect: "portrait", products: [{ id: "1", name: 3, price: "" }] }), JSON.stringify({ title: "x", aspect: "portrait", products: Array(2).fill({ id: "1", name: "x", price: "" }) })]) expect(readDraft(input)).toBeNull();
  });
  it("crops landscape sources into portrait output without stretching", () => {
    const out = dimensions("portrait");
    const crop = coverCrop(1920, 1080, out.width, out.height);
    expect(crop.width / crop.height).toBeCloseTo(9 / 16);
    expect(crop.y).toBe(0);
    expect(crop.x).toBeGreaterThan(0);
    expect(crop.x * 2 + crop.width).toBeCloseTo(1920);
  });
  it("formats elapsed duration including long sessions", () => {
    expect(clock(-1)).toBe("00:00"); expect(clock(65_999)).toBe("01:05"); expect(clock(900_000)).toBe("15:00");
  });
});
