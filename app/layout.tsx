import type { Metadata } from "next";
import "./globals.css";
import { IBM_Plex_Sans, IBM_Plex_Sans_Thai, IBM_Plex_Mono } from "next/font/google";
import { CookieBanner } from "@/components/consent/cookie-banner";

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-sans",
  display: "swap",
});

const ibmSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-sans-thai",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-mono",
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
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${ibmSans.variable} ${ibmSansThai.variable} ${ibmMono.variable}`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
