import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";

// rateLimitDb: DB ล้ม/ช้าเกิน 3s ต้อง fail-open (ยกเว้น mode "closed")
import { rateLimitDb, FAIL_OPEN_RESULT, FAIL_CLOSED_RESULT, RL_TIMEOUT_MS } from "../lib/rate-limit-db";

const req = () =>
  new Request("https://app.vibelinkth.com/api/x", {
    headers: { "cf-connecting-ip": "1.2.3.4" },
  });

describe("rateLimitDb resilience (ไม่ให้ /api/support คืน 503 จาก Cloudflare)", () => {
  it("fail-open fallback shape (default mode)", () => {
    expect(FAIL_OPEN_RESULT).toEqual({ ok: true, remaining: 1, retryAfter: 0 });
  });

  it("fail-closed fallback shape (auth endpoints)", () => {
    expect(FAIL_CLOSED_RESULT).toEqual({ ok: false, remaining: 0, retryAfter: 10 });
  });

  it("returns a result even when DB is unreachable (never throws)", async () => {
    const r = await rateLimitDb(req(), "test:never-throw", 5, 60_000);
    expect(typeof r.ok).toBe("boolean");
    expect(r.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it("fail-closed mode blocks requests when DB is unreachable", async () => {
    const spy = vi.spyOn(prisma, "$queryRawUnsafe").mockRejectedValueOnce(new Error("Neon connection failed"));
    try {
      const r = await rateLimitDb(req(), "test:fail-closed-db", 5, 60_000, null, "closed");
      expect(r.ok).toBe(false);
      expect(r.remaining).toBe(0);
      expect(r.retryAfter).toBe(10);
    } finally {
      spy.mockRestore();
    }
  });

  it("timeout budget is short (3s) so requests never hang on slow DB", () => {
    expect(RL_TIMEOUT_MS).toBeLessThanOrEqual(3_000);
  });

  it("uses CF-Connecting-IP only (never X-Forwarded-For)", async () => {
    const spoofed = new Request("https://app.vibelinkth.com/api/x", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    const a = await rateLimitDb(spoofed, "test:ip", 5, 60_000);
    const b = await rateLimitDb(spoofed, "test:ip", 5, 60_000);
    expect(a.ok).toBe(true);
    expect(b.retryAfter).toBeGreaterThanOrEqual(0);
  });
});

describe("support route source safety (ต้องไม่คืน 503)", () => {
  const src = readFileSync("app/api/support/route.ts", "utf8");

  it("no 503 status anywhere in handler", () => {
    expect(src.includes("status: 503")).toBe(false);
    expect(src.includes('status: 503')).toBe(false);
  });

  it("GET and POST wrap DB in try/catch (no unhandled throw -> CF 503)", () => {
    expect(src.match(/catch \(err\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("500 responses carry Retry-After", () => {
    expect(src.includes('"Retry-After": "10"')).toBe(true);
  });
});
