import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { appPublicUrl, publicPageMetadata } from "../lib/seo";
import { BRAND, productDiscoveryHref, productHref } from "../lib/products";

afterEach(() => vi.unstubAllEnvs());

describe("public search entry points", () => {
  it("keeps discovery public without changing the account tool destination", () => {
    expect(productDiscoveryHref("links")).toBe("/links");
    expect(productDiscoveryHref("links", "marketing")).toBe(`${BRAND.appUrl}/links`);
    expect(productHref("links")).toBe("/dashboard/links");
  });

  it("uses the configured public app origin consistently without duplicate slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.example.com/");
    const urls = sitemap().map(item => item.url);
    expect(appPublicUrl("/qr")).toBe("https://preview.example.com/qr");
    expect(urls).toContain("https://preview.example.com/links");
    expect(robots().sitemap).toBe("https://preview.example.com/sitemap.xml");
    const meta = publicPageMetadata("Links", "Description", appPublicUrl("/links"));
    expect(meta.alternates?.canonical).toBe("https://preview.example.com/links");
    expect(meta.openGraph).toMatchObject({ url: "https://preview.example.com/links" });
  });

  it("omits the app homepage mirror and private account routes from the sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", BRAND.appUrl);
    const urls = sitemap().map(item => item.url);
    expect(urls).toContain(`${BRAND.appUrl}/qr`);
    expect(urls).toContain(`${BRAND.appUrl}/links`);
    expect(urls).not.toContain(`${BRAND.appUrl}/`);
    expect(urls.some(url => /dashboard|settings|login|signup|\/go\//.test(url))).toBe(false);
  });
});
