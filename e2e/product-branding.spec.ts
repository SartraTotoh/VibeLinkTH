import { expect, test } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, PRODUCTS, PRODUCT_IDS } from "../lib/products";

// Read-only, local HTTP contract checks. No accounts, camera permissions,
// Booking actions, payments, external email or cloud streams are created.
let staticServer: Server;
let staticURL: string;
test.beforeAll(async () => {
  staticServer = createServer((req, res) => {
    const file = req.url === "/og-products.png" ? "og-products.png" : "index.html";
    res.setHeader("content-type", file.endsWith("png") ? "image/png" : "text/html; charset=utf-8");
    res.end(readFileSync(join(process.cwd(), "landing", file)));
  });
  await new Promise<void>(resolve => staticServer.listen(0, "127.0.0.1", resolve));
  const address = staticServer.address();
  if (!address || typeof address === "string") throw new Error("local static server unavailable");
  staticURL = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => { if (staticServer) await new Promise<void>((resolve, reject) => staticServer.close(error => error ? reject(error) : resolve())); });

test("homepage serves the four products, their status and Thai QR intent", async ({ request }) => {
  const res = await request.get("/"); expect(res.status()).toBe(200);
  const body = await res.text();
  for (const id of PRODUCT_IDS) expect(body).toContain(PRODUCTS[id].name);
  expect(body).toContain(BRAND.tagline); expect(body).toContain("สร้าง QR Code ฟรี");
  expect(body.match(/<h1\b/g)).toHaveLength(1);
  expect(body).not.toMatch(/VibeBook|Vibe Page|Booking Page|0\.04 วินาที|มัดจำทันที/);
});

test("QR serves indexable Thai metadata and the renamed application schema", async ({ request }) => {
  const res = await request.get("/qr"); expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/<title>VibeLinkTH QR \| สร้าง QR Code ฟรี/);
  expect(body).toContain('href="https://app.vibelinkth.com/qr"');
  expect(body).toContain('name="robots" content="index, follow"');
  const schemas = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  expect(schemas.find(s => s["@type"] === "SoftwareApplication")).toMatchObject({ name: PRODUCTS.qr.name, isAccessibleForFree: true });
  expect(body).not.toMatch(/VibeBook|Vibe Page|Booking Page|Vibe QR Studio|growth-cases|growth-plans/);
});

test("Booking navigation resolves to visible development status without a booking action", async ({ request }) => {
  const body = await (await request.get("/")).text();
  expect(body).toContain('href="/#product-booking"');
  const card = body.match(/<article[^>]*id="product-booking"[^>]*>([\s\S]*?)<\/article>/)![1];
  expect(card).toContain(PRODUCTS.booking.statusLabel.th); expect(card).not.toContain("<a ");
});

test("Links, bio editor and experimental Live retain their authenticated routes", async ({ request }) => {
  for (const path of ["/dashboard/links", "/dashboard/vibepage", "/live"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect([302, 303, 307, 308], path).toContain(res.status());
    expect(res.headers().location, path).toContain("/login");
  }
  expect((await request.get("/api/qr/destinations")).status()).toBe(401);
});

test("manifest and the new app share image use VibeLinkTH branding", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe(BRAND.name); expect(manifest.short_name).toBe(BRAND.name);
  const image = await request.get("/og-products.png"); expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body(); expect(png.readUInt32BE(16)).toBe(1200); expect(png.readUInt32BE(20)).toBe(630);
});

test("static marketing HTML serves the same product names, status and canonical", async ({ request }) => {
  const res = await request.get(staticURL); expect(res.status()).toBe(200);
  const body = await res.text();
  for (const id of PRODUCT_IDS) expect(body).toContain(`<h3>${PRODUCTS[id].name}</h3>`);
  expect(body).toContain(`<link rel="canonical" href="${BRAND.marketingUrl}"`);
  expect(body).toContain('href="#product-booking"'); expect(body).toContain(PRODUCTS.live.description.th);
  const faq = body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
  expect(JSON.parse(faq)["@graph"].find((s: {"@type": string}) => s["@type"] === "Organization").slogan).toBe(BRAND.tagline);
});

test("static share image matches the app asset", async ({ request }) => {
  const app = await (await request.get("/og-products.png")).body();
  const marketing = await (await request.get(`${staticURL}/og-products.png`)).body();
  expect(marketing.equals(app)).toBe(true);
});
