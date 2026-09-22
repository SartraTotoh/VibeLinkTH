import { describe, expect, it } from "vitest";
import { limitsOf } from "../lib/plans";

describe("limitsOf", () => {
  it("FREE is a tight trial tier", () => {
    const free = limitsOf("FREE");
    expect(free.maxActiveLinks).toBe(10);
    expect(free.analyticsDays).toBe(7);
    expect(free.customSlug).toBe(false);
  });

  it("CREATOR unlocks everything a creator needs", () => {
    const creator = limitsOf("CREATOR");
    expect(creator.maxActiveLinks).toBe(500);
    expect(creator.analyticsDays).toBe(90);
    expect(creator.customSlug).toBe(true);
  });

  it("CREATOR_PLUS is unlimited links", () => {
    const plus = limitsOf("CREATOR_PLUS");
    expect(plus.maxActiveLinks).toBeNull();
    expect(plus.analyticsDays).toBe(365);
    expect(plus.customSlug).toBe(true);
  });

  it("unknown plans fall back to FREE", () => {
    expect(limitsOf("WHATEVER")).toEqual(limitsOf("FREE"));
  });
});
