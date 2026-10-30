import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/products";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.seo.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#090b10",
    theme_color: "#b9ff2c",
    icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png" }],
  };
}
