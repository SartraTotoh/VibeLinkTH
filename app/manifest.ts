import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VibeLink — ย่อลิงก์ วัดคลิก",
    short_name: "VibeLink",
    description: "ย่อลิงก์สำหรับครีเอเตอร์ไทย วัดคลิกแบบเรียลไทม์",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#090b10",
    theme_color: "#b9ff2c",
    icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png" }],
  };
}
