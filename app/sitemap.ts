import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.vibelinkth.com").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  // Keep the QR tool as the app's primary indexable entry point.
  // Last-modified dates are omitted rather than falsely updating on every build.
  return [
    { url: `${base}/qr`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cookies`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
