import { describe, expect, it } from "vitest";
import {
  normalizeText,
  keywordList,
  matchRule,
  ruleReply,
  ruleFaq,
  ticketPreview,
} from "../lib/support";

type R = { id: string; enabled: boolean; priority: number; keywords: string; replyTh: string; replyEn: string };

function rule(id: string, priority: number, keywords: string): R {
  return { id, enabled: true, priority, keywords, replyTh: "คำตอบไทย", replyEn: "English reply" };
}

describe("normalizeText", () => {
  it("lowercases, collapses punctuation to spaces, keeps Thai", () => {
    expect(normalizeText("  ลืมรหัสผ่าน!!! ")).toBe("ลืมรหัสผ่าน");
    expect(normalizeText("Reset PASSWORD?")).toBe("reset password");
    expect(normalizeText("ราคา/อัปเกรด ครับๆ")).toBe("ราคา อัปเกรด ครับๆ");
  });
});

describe("keywordList", () => {
  it("splits on comma and trims", () => {
    expect(keywordList(" a ,b,  c , ")).toEqual(["a", "b", "c"]);
  });
});

describe("matchRule", () => {
  it("matches Thai keyword substrings", () => {
    const rules = [rule("a", 10, "ราคา,อัปเกรด")];
    expect(matchRule(rules, "อยากรู้ราคาครับ")?.id).toBe("a");
  });

  it("matches English case-insensitively", () => {
    const rules = [rule("a", 10, "forgot,password")];
    expect(matchRule(rules, "I forgot my Password")?.id).toBe("a");
  });

  it("respects priority: lower priority wins first", () => {
    const rules = [rule("later", 100, "ลืมรหัสผ่าน"), rule("earlier", 10, "เปลี่ยนอีเมล")];
    expect(matchRule(rules, "ลืมรหัสผ่าน")?.id).toBe("later");
  });

  it("skips disabled rules", () => {
    const rules = [{ ...rule("a", 10, "ลืมรหัสผ่าน"), enabled: false }, rule("b", 20, "ลืมรหัสผ่าน")];
    expect(matchRule(rules, "ลืมรหัสผ่าน")?.id).toBe("b");
  });

  it("returns null on no match or empty text", () => {
    expect(matchRule([rule("a", 10, "ราคา")], "สวัสดีครับ")).toBeNull();
    expect(matchRule([rule("a", 10, "ราคา")], "   ")).toBeNull();
  });

  it("matches multi-keyword rules via ANY keyword", () => {
    const rules = [rule("a", 30, "วาร์ป,deep link,เปิดแอป")];
    expect(matchRule(rules, "วาร์ปไปเปิดแอปด้วยได้ไหม")?.id).toBe("a");
  });
});

describe("ruleReply / ruleFaq / ticketPreview", () => {
  it("picks language", () => {
    const r = { replyTh: "ไทย", replyEn: "eng", faqTh: null, faqEn: null };
    expect(ruleReply(r, "th")).toBe("ไทย");
    expect(ruleReply(r, "en")).toBe("eng");
    expect(ruleFaq(r, "th")).toBe("ไทย");
    expect(ruleFaq({ ...r, faqTh: "หัวข้อไทย" }, "th")).toBe("หัวข้อไทย");
  });

  it("previews single line truncated", () => {
    expect(ticketPreview("line1\nline2")).toBe("line1 line2");
    expect(ticketPreview("x".repeat(100))).toHaveLength(81);
    expect(ticketPreview("x".repeat(100)).endsWith("…")).toBe(true);
  });
});