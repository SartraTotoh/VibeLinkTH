import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BRAND, PRODUCTS, PRODUCT_IDS, productHref, websiteStructuredData } from "../lib/products";
import { ProductNavigation } from "../components/products/product-navigation";
import { ProductCards } from "../components/products/product-cards";
import { LandingPage } from "../components/landing/landing-page";
import { qrText } from "../lib/qr/copy";

const root = fileURLToPath(new URL("../", import.meta.url));
const html = readFileSync(new URL("../landing/index.html", import.meta.url), "utf8");
const untag = (value: string) => value.replace(/<[^>]*>/g, "").replaceAll("&amp;", "&").trim();
const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);

describe("public product naming and feature availability", () => {
  it("uses the four chosen product names and exact main tagline", () => {
    expect(BRAND.tagline).toBe("Your vibe. Level up your life. Grow your business.");
    expect(PRODUCT_IDS.map(id => PRODUCTS[id].label)).toEqual(["Links", "QR", "Booking", "Live"]);
    expect(PRODUCT_IDS.map(id => PRODUCTS[id].name)).toEqual(["VibeLinkTH Links", "VibeLinkTH QR", "VibeLinkTH Booking", "VibeLinkTH Live"]);
  });

  it("separates names from the existing product and bio link routes", () => {
    expect(productHref("links")).toBe("/dashboard/links");
    expect(productHref("qr")).toBe("/qr");
    expect(productHref("live")).toBe("/live");
    expect(BRAND.bioLink.editorRoute).toBe("/dashboard/vibepage");
    expect(BRAND.bioLink.publicRoutePrefix).toBe("/vibe/");
    for (const id of PRODUCT_IDS) if (PRODUCTS[id].route) {
      expect(existsSync(`${root}/app${PRODUCTS[id].route}/page.tsx`)).toBe(true);
    }
  });

  it("points Booking to visible status, never to an invented application route", () => {
    expect(PRODUCTS.booking.route).toBeNull();
    expect(productHref("booking")).toBe("/#product-booking");
    expect(productHref("booking", "marketing")).toBe("#product-booking");
    const cards = renderToStaticMarkup(React.createElement(ProductCards));
    const booking = cards.match(/<article[^>]*id="product-booking"[^>]*>([\s\S]*?)<\/article>/)![1];
    expect(booking).toContain("กำลังพัฒนา"); expect(booking).toContain("ยังไม่เปิด");
    expect(booking).not.toContain("<a ");
  });

  it("renders navigation in the chosen order and identifies experimental Live", () => {
    const navigation = renderToStaticMarkup(React.createElement(ProductNavigation, { active: "qr", lang: "en" }));
    expect([...navigation.matchAll(/data-product="([^"]+)"/g)].map(m => m[1])).toEqual([...PRODUCT_IDS]);
    const qrLink = navigation.match(/<a[^>]*data-product="qr"[^>]*>/)![0];
    expect(qrLink).toContain('href="/qr"'); expect(qrLink).toContain('aria-current="page"');
    expect(navigation).toContain("In development"); expect(navigation).toContain("Experimental studio");
    expect(PRODUCTS.live.description.th).toContain("ยังไม่เปิดทั่วไป");
  });

  it("keeps Thai free-QR search intent without unsupported booking, speed, scan-count or conversion claims", () => {
    const home = renderToStaticMarkup(React.createElement(LandingPage));
    expect(home.match(/<h1\b/g)).toHaveLength(1);
    expect(home).toContain("สร้าง QR Code ฟรี"); expect(home).toContain(BRAND.tagline);
    for (const id of PRODUCT_IDS) expect(home).toContain(PRODUCTS[id].name);
    expect(home).not.toMatch(/VibeBook|Vibe Page|Booking Page|0\.04 วินาที|มัดจำทันที|วัดผล Conversion|ยอดสแกน/);
  });

  it("keeps the QR API modes but gives them current Thai and English display labels", () => {
    expect(qrText("th", "mode.short")).toBe("Links");
    expect(qrText("en", "mode.short")).toBe("Links");
    expect(qrText("th", "mode.vibe")).toBe("หน้ารวมลิงก์");
    expect(qrText("en", "mode.vibe")).toBe("Bio link page");
    for (const lang of ["th", "en"] as const) {
      expect(qrText(lang, "meta.title")).toContain("VibeLinkTH QR");
      expect(qrText(lang, "dest.emptyBooking")).not.toMatch(/เปิดใน Dashboard|open one in Dashboard/);
      expect(qrText(lang, "dest.login")).not.toContain("Booking");
    }
  });
});

describe("static landing and structured data stay aligned with the shared catalog", () => {
  it("passes the generator's no-write drift check", () => {
    expect(execFileSync(process.execPath, ["scripts/sync-product-branding.mjs", "--check"], { cwd: root, encoding: "utf8" })).toContain("in sync");
  });

  it("retains one Thai H1 and resolves every same-page fragment", () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>สร้าง QR Code ฟรี/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    for (const [, href] of html.matchAll(/\bhref="#([^"]+)"/g)) expect(ids).toContain(href);
  });

  it("keeps canonical, social URL, WebSite and Organization naming consistent", () => {
    expect(html).toContain(`<link rel="canonical" href="${BRAND.marketingUrl}"`);
    expect(html).toContain(`<meta property="og:url" content="${BRAND.marketingUrl}"`);
    const sitemap = readFileSync(`${root}/landing/sitemap.xml`, "utf8");
    expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])).toEqual([BRAND.marketingUrl]);
    expect(readFileSync(`${root}/landing/robots.txt`, "utf8")).toContain(`Sitemap: ${BRAND.marketingUrl}sitemap.xml`);
    expect(html).toMatch(/<title>[^<]*สร้าง QR Code ฟรี/);
    expect(schema["@graph"].find((s: {"@type": string}) => s["@type"] === "Organization"))
      .toMatchObject({ name: BRAND.name, slogan: BRAND.tagline, url: BRAND.marketingUrl });
    const website = schema["@graph"].find((s: {"@type": string}) => s["@type"] === "WebSite");
    expect(website.about).toEqual(websiteStructuredData(BRAND.marketingUrl)["@graph"][1].about);
    expect(website.name).toBe("VibeLinkTH");
    expect(JSON.stringify(website.about)).not.toMatch(/"@type":"Offer"|ReserveAction|BuyAction/);
  });

  it("exposes all four product descriptions and limitations in visible cards", () => {
    for (const id of PRODUCT_IDS) {
      const p = PRODUCTS[id];
      expect(html).toContain(`<h3>${p.name}</h3>`);
      expect(html).toContain(p.description.th); expect(html).toContain(p.statusLabel.th);
    }
    expect(html).not.toMatch(/VibeBook|Vibe Page|Booking Page|Vibe QR Studio/);
  });

  it("does not make FAQ JSON-LD claims that differ from the visible answers", () => {
    const faq = schema["@graph"].find((s: {"@type": string}) => s["@type"] === "FAQPage");
    const visible = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)];
    for (const q of faq.mainEntity) {
      const answer = visible.find(m => untag(m[1]).replace(/expand_more$/, "").trim() === q.name);
      expect(answer, q.name).toBeDefined();
      expect(untag(answer![2])).toBe(q.acceptedAnswer.text);
    }
  });

  it("uses new share assets instead of the old text-baked screenshots", () => {
    expect(html).not.toContain("og-cover.png");
    for (const dir of ["public", "landing"]) {
      const svg = readFileSync(`${root}/${dir}/og-products.svg`, "utf8");
      for (const id of PRODUCT_IDS) {
        expect(svg).toContain(PRODUCTS[id].name);
        expect(svg).toContain(PRODUCTS[id].statusLabel.en);
      }
      expect(svg).toContain(BRAND.tagline);
      expect(svg).not.toMatch(/VibeBook|0\.04s/);
      const png = readFileSync(`${root}/${dir}/og-products.png`);
      expect(png.readUInt32BE(16)).toBe(1200); expect(png.readUInt32BE(20)).toBe(630);
    }
  });
});
