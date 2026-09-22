import { describe, expect, it } from "vitest";
import { hashPin, maskEmail, verifyPin } from "../lib/privacy";

describe("maskEmail", () => {
  it("masks exactly like the required format", () => {
    expect(maskEmail("totoh.taponchai@shopee.com")).toBe("totoh.t********@s*****.***");
  });

  it("handles various shapes deterministically", () => {
    expect(maskEmail("sattra.th@gmail.com")).toBe("sattra.****@g****.***");
    expect(maskEmail("ab@x.co")).toBe("ab****@x****.**");
    expect(maskEmail("no-at-sign")).toBe("***");
    expect(maskEmail("a@b")).toBe("a****@b****.***");
  });

  it("never leaks the full address", () => {
    for (const e of ["user.name+tag@sub.domain.co.th", "x@y.zz"]) {
      const m = maskEmail(e);
      expect(m).not.toBe(e);
      expect(m).toContain("@");
      expect(m).not.toContain(e.split("@")[1]!);
    }
  });
});

describe("verifyPin", () => {
  it("accepts the correct PIN and rejects the rest", () => {
    const hash = hashPin("123456");
    expect(verifyPin("123456", hash)).toBe(true);
    expect(verifyPin("123457", hash)).toBe(false);
    expect(verifyPin("12345", hash)).toBe(false);
    expect(verifyPin("1234567", hash)).toBe(false);
    expect(verifyPin("abcdef", hash)).toBe(false);
    expect(verifyPin("", hash)).toBe(false);
  });

  it("fails closed on missing or malformed hash", () => {
    expect(verifyPin("123456", "")).toBe(false);
    expect(verifyPin("123456", "not-a-hash")).toBe(false);
  });
});
