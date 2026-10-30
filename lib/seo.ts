import type { Metadata } from "next";
import { BRAND } from "./products";

// Use the deployment's declared public origin, never the incoming Host header.
export function appPublicUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.appUrl).replace(/\/$/, "");
  return new URL(path, `${base}/`).href;
}

export function publicPageMetadata(title: string, description: string, url: string): Metadata {
  const image = { url: appPublicUrl("/og-products.png"), width: 1200, height: 630, alt: BRAND.name };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { type: "website", siteName: BRAND.name, title, description, url, locale: "th_TH", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
