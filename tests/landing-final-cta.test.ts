import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const html = readFileSync(fileURLToPath(new URL("../landing/index.html", import.meta.url)), "utf8");
const styles = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
const sharedRule = styles.match(/h1 em,\s*#final-title em\s*\{([^}]+)\}/)?.[1] ?? "";
const finalSection = html.match(/<section\b[^>]*id="start"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";

describe("landing closing CTA", () => {
  it("shares the hero gradient without italic styling", () => {
    expect(sharedRule).toMatch(/font-style:\s*normal\s*;/);
    expect(sharedRule).toMatch(/background:\s*linear-gradient\(120deg, var\(--primary\), var\(--secondary\), var\(--primary\)\)\s*;/);
    expect(sharedRule).toMatch(/background-size:\s*220% auto\s*;/);
    expect(sharedRule).toMatch(/-webkit-background-clip:\s*text\s*;/);
    expect(sharedRule).toMatch(/(?:^|;)\s*background-clip:\s*text\s*;/);
  });

  it("retains the existing animation and reduced-motion override", () => {
    expect(sharedRule).toMatch(/animation:\s*gradientShift 4\.5s linear infinite\s*;/);
    expect(styles).toMatch(/@keyframes gradientShift\s*\{/);
    const reduced = styles.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n    \}/)?.[1] ?? "";
    expect(reduced).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(reduced).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });

  it("preserves the closing copy and both CTA destinations", () => {
    expect(finalSection).toContain('<h2 id="final-title">ลิงก์ดี ๆ <em>อย่าให้จบแค่แปะ</em></h2>');
    expect(finalSection).toMatch(/href="https:\/\/app\.vibelinkth\.com\/qr"\s+data-cta="final_qr"/);
    expect(finalSection).toMatch(/href="https:\/\/app\.vibelinkth\.com\/signup"\s+data-cta="final_signup"/);
  });
});
