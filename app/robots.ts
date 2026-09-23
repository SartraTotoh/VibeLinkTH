import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.vibelinkth.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/settings", "/ceo", "/go/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
