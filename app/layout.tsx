import type { Metadata } from "next";
import "./globals.css";
import { CookieBanner } from "@/components/consent/cookie-banner";

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
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/logo-mark.png?v=2", type: "image/png" },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener("unhandledrejection",function(e){var m=e&&e.reason&&(e.reason.message||String(e.reason));if(typeof m==="string"&&m.indexOf("A listener indicated an asynchronous response")!==-1){e.preventDefault();e.stopImmediatePropagation();}},true);window.addEventListener("error",function(e){if(e&&typeof e.message==="string"&&e.message.indexOf("A listener indicated an asynchronous response")!==-1){e.preventDefault();e.stopImmediatePropagation();}},true);function u(n){if(n&&n.tagName==="LINK"&&n.getAttribute("rel")==="preload"&&n.getAttribute("as")==="style"){n.setAttribute("rel","stylesheet");n.removeAttribute("as");}}if(typeof document!=="undefined"&&document.head){document.head.querySelectorAll('link[rel="preload"][as="style"]').forEach(u);new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(u);});}).observe(document.head,{childList:true});}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..800;1,9..40,400..800&family=Noto+Sans+Thai:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
