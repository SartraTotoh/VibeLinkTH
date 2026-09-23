import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { CookieBanner } from "@/components/consent/cookie-banner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  variable: "--font-noto-thai",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.vibelinkth.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VibeLink — ย่อลิงก์ วัดคลิก โตไปด้วยกัน",
    template: "%s · VibeLink",
  },
  description:
    "ย่อลิงก์สำหรับครีเอเตอร์ไทย วัดคลิกแบบเรียลไทม์ — สมัครฟรี ลองใช้ 10 ลิงก์และสถิติ 7 วันตั้งแต่วันแรก",
  applicationName: "VibeLink",
  keywords: ["ย่อลิงก์", "ลิงก์", "short link", "analytics", "ครีเอเตอร์", "VibeLink"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "VibeLink",
    title: "VibeLink — ย่อลิงก์ วัดคลิก โตไปด้วยกัน",
    description: "ย่อลิงก์สำหรับครีเอเตอร์ไทย วัดคลิกแบบเรียลไทม์",
    url: siteUrl,
    locale: "th_TH",
    images: [{ url: "/og-cover.png", width: 1200, height: 630, alt: "VibeLink" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeLink — ย่อลิงก์ วัดคลิก โตไปด้วยกัน",
    description: "ย่อลิงก์สำหรับครีเอเตอร์ไทย วัดคลิกแบบเรียลไทม์",
    images: ["/og-cover.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${notoThai.variable}`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
