import type { MetadataRoute } from "next";
import { appPublicUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/settings", "/ceo", "/go/"],
      },
    ],
    sitemap: appPublicUrl("/sitemap.xml"),
    host: new URL(appPublicUrl("/")).origin,
  };
}
