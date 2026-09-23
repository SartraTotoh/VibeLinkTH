import { describe, expect, it } from "vitest";
import { hasHardSig, repairMojibake, sanitizeObject, containsThai } from "../lib/charset";

describe("hasHardSig", () => {
  it("detects C1 control chars (hard double-encode signature)", () => {
    expect(hasHardSig("เน\u0083เธ")).toBe(true);
  });

  it("detects Euro sign introduced by mis-decoding", () => {
    expect(hasHardSig("เธฟ ผ\u20ACญ")).toBe(true);
  });

  it("ignores healthy Thai", () => {
    expect(hasHardSig("ลบ แผน โดยทั่วไป")).toBe(false);
  });
});

describe("repairMojibake", () => {
  it("repairs double-encoded Thai word to correct Thai", () => {
    expect(repairMojibake("เธฃเธญ" + " sign-off")).toBe("รอ sign-off");
  });
});

describe("sanitizeObject", () => {
  it("repairs nested string values and leaves primitives intact", () => {
    const cleaned = sanitizeObject({ name: "โปรโมชัน", count: 3, tags: ["เธฟ"] });
    expect(cleaned).toEqual({ name: "โปรโมชัน", count: 3, tags: ["฿"] });
  });

  it("keeps healthy Thai unchanged", () => {
    const obj = { name: "ลบ", nested: { note: "แผนการขาย" } };
    expect(sanitizeObject(obj)).toEqual(obj);
  });
});