import type { MetadataRoute } from "next";
import { appPublicUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Keep the QR tool as the app's primary indexable entry point.
  // Last-modified dates are omitted rather than falsely updating on every build.
  return [
    { url: appPublicUrl("/qr"), changeFrequency: "weekly", priority: 1 },
    { url: appPublicUrl("/links"), changeFrequency: "monthly", priority: 0.8 },
    { url: appPublicUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: appPublicUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: appPublicUrl("/cookies"), changeFrequency: "yearly", priority: 0.1 },
  ];
}
