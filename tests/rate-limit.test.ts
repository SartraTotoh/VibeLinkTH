import { describe, expect, it } from "vitest";
import { rateLimit } from "../lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test-basic-${Date.now()}`;
    const first = rateLimit(key, 3, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);

    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);

    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("isolates different keys", () => {
    const a = `test-iso-a-${Date.now()}`;
    const b = `test-iso-b-${Date.now()}`;
    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });
});
