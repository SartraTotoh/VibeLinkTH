import type { Metadata } from "next";
import { QrStudio } from "@/components/qr/qr-studio";

export const metadata: Metadata = {
  title: "Vibe QR Studio — สร้าง QR ที่ดูเป็นคุณ",
  description:
    "สร้าง QR Code สำหรับ URL, Vibe Page, Booking Page และ Short Link พร้อม UTM ธีม Blink / Pank / Print Safe ตรวจสุขภาพ QR ด้วยการ decode จริงก่อนดาวน์โหลด PNG และ SVG",
  alternates: { canonical: "/qr" },
  openGraph: {
    title: "Vibe QR Studio — QR ที่ไม่ใช่แค่สแกนได้",
    description: "สร้าง QR ธีมของคุณ ตรวจ decode จริง แล้วดาวน์โหลด PNG/SVG",
    type: "website",
  },
};

export default function QrPage() {
  return <QrStudio />;
}
