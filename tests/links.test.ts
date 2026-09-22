import { describe, expect, it } from "vitest";
import { detectPlatform, isValidSlug, normalizeDestination, randomSlug } from "../lib/links";

describe("isValidSlug", () => {
  it("accepts normal slugs", () => {
    expect(isValidSlug("abc")).toBe(true);
    expect(isValidSlug("promo-99")).toBe(true);
    expect(isValidSlug("a1-b2-c3")).toBe(true);
    expect(isValidSlug("x".repeat(30))).toBe(true);
  });

  it("rejects bad shapes", () => {
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("ABC")).toBe(false);
    expect(isValidSlug("-abc")).toBe(false);
    expect(isValidSlug("abc-")).toBe(false);
    expect(isValidSlug("a b")).toBe(false);
    expect(isValidSlug("x".repeat(31))).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects reserved slugs (short-link safe)", () => {
    for (const s of ["api", "go", "login", "signup", "dashboard", "settings", "terms", "privacy"]) {
      expect(isValidSlug(s)).toBe(false);
    }
  });
});

describe("normalizeDestination", () => {
  it("accepts http/https and trims", () => {
    expect(normalizeDestination("https://shopee.co.th/x")).toBe("https://shopee.co.th/x");
    expect(normalizeDestination("  http://example.com/a?b=1  ")).toBe("http://example.com/a?b=1");
  });

  it("rejects non-web schemes and garbage", () => {
    expect(normalizeDestination("javascript:alert(1)")).toBeNull();
    expect(normalizeDestination("ftp://example.com")).toBeNull();
    expect(normalizeDestination("not a url")).toBeNull();
    expect(normalizeDestination("")).toBeNull();
  });
});

describe("detectPlatform", () => {
  it("detects major Thai commerce/social hosts", () => {
    expect(detectPlatform("https://shopee.co.th/shop")).toBe("Shopee");
    expect(detectPlatform("https://vt.tiktok.com/abc")).toBe("TikTok");
    expect(detectPlatform("https://www.lazada.co.th/x")).toBe("Lazada");
    expect(detectPlatform("https://lin.ee/abc")).toBe("LINE");
    expect(detectPlatform("https://youtu.be/abc")).toBe("YouTube");
  });

  it("returns null for unknown or invalid", () => {
    expect(detectPlatform("https://example.com")).toBeNull();
    expect(detectPlatform("garbage")).toBeNull();
  });
});

describe("randomSlug", () => {
  it("defaults to 6 chars and stays within 7-char product limit", () => {
    for (let i = 0; i < 50; i++) {
      const s = randomSlug();
      expect(s).toHaveLength(6);
      expect(s.length).toBeLessThanOrEqual(7);
      expect(/^[a-z0-9]+$/.test(s)).toBe(true);
    }
  });

  it("generates unique values", () => {
    const set = new Set(Array.from({ length: 200 }, () => randomSlug()));
    expect(set.size).toBeGreaterThan(190);
  });
});
