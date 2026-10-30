import brand from "./brand.json";
import type { Lang } from "./i18n";

export const BRAND = brand;
export const PRODUCTS = brand.products;
export const PRODUCT_IDS = ["links", "qr", "booking", "live"] as const;
export type ProductId = typeof PRODUCT_IDS[number];

// Display names are independent from stable routes, API modes and database keys.
export function productHref(id: ProductId, surface: "app" | "marketing" = "app") {
  const product = PRODUCTS[id];
  if (!product.route) return surface === "app" ? `/#${product.anchor}` : `#${product.anchor}`;
  return surface === "marketing" ? `${BRAND.appUrl}${product.route}` : product.route;
}

export function websiteStructuredData(url: string, lang: Lang = "th") {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: BRAND.name, slogan: BRAND.tagline, url: BRAND.marketingUrl },
      { "@type": "WebSite", name: BRAND.name, url, inLanguage: lang === "th" ? "th-TH" : "en",
        description: BRAND.seo.description,
        about: PRODUCT_IDS.map(id => ({
          "@type": "Thing", name: PRODUCTS[id].name, url: `${url}#${PRODUCTS[id].anchor}`,
          description: `${PRODUCTS[id].description[lang]} (${PRODUCTS[id].statusLabel[lang]})`,
        })),
      },
    ],
  };
}
