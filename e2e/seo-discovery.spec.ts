import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BRAND } from "../lib/products";
import { appPublicUrl } from "../lib/seo";

const canonicals = (html: string) => [...html.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g)].map(m => m[1]);
const schemas = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => {
  const data = JSON.parse(m[1]); return data["@graph"] ?? [data];
});

// Anonymous, read-only requests against the local production build.
test("Links is a server-rendered, indexable public page with an account CTA", async ({ request }) => {
  const res = await request.get("/links", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(canonicals(html)).toEqual([appPublicUrl("/links")]);
  expect(html).toMatch(/<title>VibeLinkTH Links \| ย่อลิงก์/);
  expect(html).toContain('name="robots" content="index, follow"');
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain("ย่อลิงก์ให้สั้น");
  expect(html).toContain('href="/dashboard/links"');
  expect(html).toContain('href="/qr"');
  expect(html).toContain("UTM เป็นแท็ก");
  expect(html).toContain("ตัวอย่าง");
});

test("Links schema describes the public page and actual breadcrumbs without fabricated reviews", async ({ request }) => {
  const html = await (await request.get("/links")).text();
  const data = schemas(html);
  expect(data.find(s => s["@type"] === "WebPage")).toMatchObject({ url: appPublicUrl("/links"), inLanguage: "th-TH" });
  const crumbs = data.find(s => s["@type"] === "BreadcrumbList").itemListElement;
  expect(crumbs.map((item: {item: string}) => item.item)).toEqual([BRAND.marketingUrl, appPublicUrl("/links")]);
  expect(JSON.stringify(data)).not.toMatch(/aggregateRating|ratingValue|"@type":"Offer"|FAQPage/);
});

test("the homepage mirror consolidates canonical, Open Graph and WebSite URLs", async ({ request }) => {
  const html = await (await request.get("/")).text();
  // Next serializes a root URL without its optional final slash; both request '/'.
  expect(canonicals(html).map(url => new URL(url).href)).toEqual([BRAND.marketingUrl]);
  const ogUrl = html.match(/property="og:url" content="([^"]+)"/)![1];
  expect(new URL(ogUrl).href).toBe(BRAND.marketingUrl);
  expect(schemas(html).find(s => s["@type"] === "WebSite").url).toBe(BRAND.marketingUrl);
  const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
  expect(anchors.some(anchor => anchor.includes('href="/links"') && anchor.includes('data-product="links"'))).toBe(true);
});

test("app sitemap lists only canonical public routes and excludes its homepage mirror", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  expect(urls).toContain(appPublicUrl("/links"));
  expect(urls).toContain(appPublicUrl("/qr"));
  expect(urls).not.toContain(appPublicUrl("/"));
  expect(urls.some(url => /dashboard|settings|login|signup|\/go\//.test(url))).toBe(false);
  for (const url of urls) {
    const page = await request.get(new URL(url).pathname);
    expect(page.status(), url).toBe(200);
    expect(canonicals(await page.text()), url).toEqual([url]);
  }
});

test("QR remains indexable and links to the public Links guide", async ({ request }) => {
  const html = await (await request.get("/qr")).text();
  expect(canonicals(html)).toEqual([appPublicUrl("/qr")]);
  expect(html).toContain('name="robots" content="index, follow"');
  expect(html).toContain('href="/links"');
  expect(html).toContain("รู้จัก Links: ลิงก์สั้น หน้ารวมลิงก์ และ UTM");
});

test("marketing navigation discovers Links and every homepage brand link uses the canonical host", () => {
  const html = readFileSync("landing/index.html", "utf8");
  const navLinks = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]+data-product="links"/g)].map(m => m[1]);
  expect(navLinks).toEqual([`${BRAND.appUrl}/links`, `${BRAND.appUrl}/links`]);
  expect(html).toContain(`<a class="brand" href="${BRAND.marketingUrl}"`);
  expect(html).not.toMatch(/href="https:\/\/vibelinkth\.com\/(?:"|#)/);
});

test("public discovery does not expose the account tool or authenticated QR destinations", async ({ request }) => {
  const res = await request.get("/dashboard/links", { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(res.status());
  expect(res.headers().location).toContain("/login");
  expect(res.headers().location).toContain("next=%2Fdashboard%2Flinks");
  expect((await request.get("/api/qr/destinations")).status()).toBe(401);
});
