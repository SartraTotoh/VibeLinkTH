import { describe, expect, it } from "vitest";
import { createQrMatrix } from "../lib/qr/matrix";
import { defaultQrStyle } from "../lib/qr/presets";
import { escapeXml, renderQrSvg, sanitizeLogoDataUrl } from "../lib/qr/svg";

const PAYLOAD = "https://example.com/promo?utm_source=tiktok&ref=vibelink";

describe("escapeXml", () => {
  it("escapes all XML metacharacters", () => {
    expect(escapeXml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&apos;");
  });
});

describe("sanitizeLogoDataUrl", () => {
  it("accepts only base64 PNG data URLs", () => {
    expect(sanitizeLogoDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(
      "data:image/png;base64,iVBORw0KGgo=",
    );
    expect(sanitizeLogoDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
    expect(sanitizeLogoDataUrl("https://evil.test/logo.png")).toBeNull();
    expect(sanitizeLogoDataUrl("data:image/png;base64,<script>")).toBeNull();
    expect(sanitizeLogoDataUrl(null)).toBeNull();
  });
});

describe("renderQrSvg", () => {
  const style = { ...defaultQrStyle("print"), cta: `Scan <&> "now"` };
  const matrix = createQrMatrix(PAYLOAD, "H");

  it("produces a standalone escaped SVG with the QR path", () => {
    const svg = renderQrSvg({ matrix, style, exportSize: 1024 });
    expect(svg.startsWith("<?xml")).toBe(true);
    expect(svg).toContain("<svg");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("<path");
    expect(svg).not.toContain("<script");
  });

  it("escapes CTA text so injected markup cannot become an element", () => {
    const svg = renderQrSvg({
      matrix,
      style: { ...style, cta: `<script>alert("x")</script>` },
      exportSize: 1024,
    });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("&quot;x&quot;");
  });

  it("never emits external href values", () => {
    const svg = renderQrSvg({ matrix, style, exportSize: 1024 });
    expect(svg).not.toContain('href="http');
    expect(svg).not.toContain('href="//');
    expect(svg).not.toContain("<foreignObject");
  });

  it("embeds a raster logo only when the data URL is a safe PNG", () => {
    const withPng = renderQrSvg({
      matrix,
      style: { ...style, logoRatio: 0.14 },
      exportSize: 1024,
      logoDataUrl: "data:image/png;base64,iVBORw0KGgo=",
    });
    expect(withPng).toContain('<image href="data:image/png;base64,iVBORw0KGgo=');

    const withSvg = renderQrSvg({
      matrix,
      style: { ...style, logoRatio: 0.14 },
      exportSize: 1024,
      logoDataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    });
    expect(withSvg).not.toContain("<image");
  });

  it("draws eyes outside the data modules and keeps the 4-module quiet zone", () => {
    const svg = renderQrSvg({ matrix, style: defaultQrStyle("print"), exportSize: 1024 });
    // viewBox must include margin on both sides of the symbol.
    expect(svg).toContain('viewBox="0 0 ');
    expect(svg).toMatch(/<rect x="4" y="4" width="7" height="7"/);
  });

  it("is deterministic for the same input", () => {
    const a = renderQrSvg({ matrix, style, exportSize: 1024 });
    const b = renderQrSvg({ matrix, style, exportSize: 1024 });
    expect(a).toBe(b);
  });
});
