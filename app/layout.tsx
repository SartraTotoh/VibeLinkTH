import type { Metadata } from "next";
import "./globals.css";
import { DM_Sans, Noto_Sans_Thai, JetBrains_Mono } from "next/font/google";
import { CookieBanner } from "@/components/consent/cookie-banner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dm-sans",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-thai",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
  },
  robots: { index: true, follow: true },
  verification: {
    google: "aJZNCUTvLVZDIWEpC3rP_9Bfw_r1Gtb6LdFImBQTY6I",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..800;1,9..40,400..800&family=Noto+Sans+Thai:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${dmSans.variable} ${notoThai.variable} ${jbMono.variable}`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
