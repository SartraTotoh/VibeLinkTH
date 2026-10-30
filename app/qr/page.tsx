import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, PRODUCTS } from "@/lib/products";
import { QrStudio } from "@/components/qr/qr-studio";
import styles from "./qr-seo.module.css";

const qrUrl = "https://app.vibelinkth.com/qr";
const marketingUrl = BRAND.marketingUrl;

export const metadata: Metadata = {
  title: { absolute: "VibeLinkTH QR | สร้าง QR Code ฟรี ใส่โลโก้ PNG / SVG" },
  description:
    "สร้าง QR Code ฟรีออนไลน์สำหรับลิงก์เว็บไซต์ ปรับสี ใส่โลโก้ เลือกลายและกรอบ ตรวจว่า QR สแกนได้ก่อนดาวน์โหลด PNG หรือ SVG ด้วย VibeLinkTH QR",
  alternates: { canonical: qrUrl },
  robots: { index: true, follow: true },
  openGraph: {
    title: "สร้าง QR Code ฟรีออนไลน์ ใส่โลโก้ | VibeLinkTH QR",
    description:
      "เครื่องมือสร้างคิวอาร์โค้ดฟรี ปรับสีและโลโก้ ตรวจการสแกน แล้วดาวน์โหลด PNG / SVG ไปใช้ได้ทันที",
    url: qrUrl,
    type: "website",
    locale: "th_TH",
    siteName: BRAND.name,
    images: [{ url: "/og-products.png", width: 1200, height: 630, alt: "VibeLinkTH QR — สร้าง QR Code ฟรี" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "สร้าง QR Code ฟรีออนไลน์ | VibeLinkTH QR",
    description: "ออกแบบ QR Code ใส่โลโก้ ปรับสี โหลด PNG / SVG และทดสอบสแกนก่อนใช้",
    images: ["/og-products.png"],
  },
};

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: PRODUCTS.qr.name,
  alternateName: "VibeLinkTH QR Code Generator",
  url: qrUrl,
  description: "เครื่องมือสร้าง QR Code สำหรับ URL ฟรี ปรับสี ใส่โลโก้ ตรวจการสแกน และดาวน์โหลด PNG / SVG",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  inLanguage: "th-TH",
  isAccessibleForFree: true,
  publisher: { "@type": "Organization", name: "VibeLinkTH", url: marketingUrl },
  offers: { "@type": "Offer", price: "0", priceCurrency: "THB", description: "การสร้าง QR Code สำหรับ URL พื้นฐาน" },
}).replace(/</g, "\\u003c");

export default function QrPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <QrStudio />
      <section className={styles.guide} aria-labelledby="qr-seo-guide-title">
        <div className={styles.kicker}>VibeLinkTH QR · คู่มือใช้งาน</div>
        <h2 id="qr-seo-guide-title">สร้าง QR Code ฟรี แบบมี Vibe — แต่งให้เป็นคุณ</h2>
        <p className={styles.lead}>
          ใช้ VibeLinkTH QR สร้างคิวอาร์โค้ด (QR Code) สำหรับเว็บไซต์ โปรไฟล์ หรือหน้าจองบริการ
          เริ่มจาก URL ปลายทาง ออกแบบลายและสีตามต้องการ แล้วตรวจ Scan Health ก่อนบันทึกไฟล์
          โดยไม่จำเป็นต้องสมัครแพ็กเกจชำระเงินเพื่อสร้าง QR พื้นฐาน
        </p>
        <div className={styles.grid}>
          <article className={styles.card}>
            <span>01 · START</span>
            <h3>แปะลิงก์ แล้วไปต่อ</h3>
            <p>วาง URL ที่ต้องการให้คนเปิดหลังสแกน เช่น เว็บไซต์ ร้านค้า หรือหน้ารวมผลงาน ระบบจะนำลิงก์ไปสร้าง QR ให้พร้อมปรับแต่ง</p>
          </article>
          <article className={styles.card}>
            <span>02 · CUSTOMIZE</span>
            <h3>ใส่โลโก้ แต่ง QR ให้มีซีน</h3>
            <p>ปรับสี จุดและกรอบ ใส่โลโก้ให้เข้ากับแบรนด์ และตรวจสอบความชัดของ QR เพื่อให้ใช้งานบนสื่อจริงได้สะดวก</p>
          </article>
          <article className={styles.card}>
            <span>03 · EXPORT</span>
            <h3>เช็กให้ชัวร์ โหลด PNG หรือ SVG</h3>
            <p>เลือก PNG สำหรับการแชร์หรือ SVG สำหรับงานดีไซน์และพิมพ์ ทดสอบสแกนไฟล์จริงก่อนนำไปใช้บนป้าย นามบัตร หรือโปสเตอร์</p>
          </article>
        </div>
        <div className={styles.knowledge}>
          <div>
            <h2>Static QR กับลิงก์สั้นใน Links ต่างกันอย่างไร?</h2>
            <p>
              QR Code แบบ Static เก็บ URL ไว้ในภาพโดยตรง หากเปลี่ยนปลายทางต้องสร้างภาพใหม่
              แต่ถ้าสร้าง QR ให้ชี้ไปยังลิงก์สั้นใน Links ที่รองรับการแก้ปลายทาง ก็สามารถจัดการลิงก์และวัดผลตามสิทธิ์ที่ใช้งานได้
              นี่คือจุดที่ VibeLinkTH QR เชื่อมต่อกับระบบลิงก์และ Analytics ของ VibeLinkTH
            </p>
          </div>
          <div className={styles.funnel}>
            <span>START FREE · GO FURTHER</span>
            <strong>สร้าง QR ให้มี Vibe → แชร์ให้สุด → ดูผลลัพธ์เมื่อพร้อมโต</strong>
            <p>เหมาะสำหรับ Creator, ผู้รับจองบริการ และธุรกิจขนาดเล็กที่อยากให้คนเข้าถึงบริการผ่าน QR ได้สะดวกขึ้น</p>
            <Link href="https://www.vibelinkth.com/#cases">ดูการใช้งาน VibeLinkTH QR และ Links ↗</Link>
          </div>
        </div>
        <div className={styles.faq} id="qr-guide-faq">
          <h2>คำถามที่พบบ่อยเกี่ยวกับการสร้าง QR Code</h2>
          <details>
            <summary>QR Code ฟรีนี้สร้างจากอะไรได้บ้าง?</summary>
            <p>โหมดฟรีเริ่มได้จาก URL เว็บไซต์ ส่วน Links และหน้ารวมลิงก์ใช้ผ่านบัญชี ส่วน Booking กำลังพัฒนา ยังไม่เปิดบริการ</p>
          </details>
          <details>
            <summary>QR Code ที่ดาวน์โหลดแล้วหมดอายุไหม?</summary>
            <p>ภาพ Static QR ไม่กำหนดวันหมดอายุโดยตัว QR เอง แต่ต้องตรวจสอบว่า URL ปลายทางยังใช้งานได้ และไม่ถูกเปลี่ยนหรือลบ</p>
          </details>
          <details>
            <summary>สร้าง QR Code ใส่โลโก้แล้วสแกนได้จริงหรือไม่?</summary>
            <p>ขนาดโลโก้ สีที่ตัดกัน และ Quiet Zone มีผลต่อการอ่านโค้ด จึงควรตรวจ Scan Health และลองสแกนไฟล์จริงจากหลายอุปกรณ์ก่อนเผยแพร่</p>
          </details>
          <details>
            <summary>ถ้าอยากทราบจำนวนคนคลิกจาก QR ต้องทำอย่างไร?</summary>
            <p>QR แบบ Static ไม่เก็บจำนวนการสแกนเอง สามารถใช้ลิงก์สั้นใน Links หรือ UTM ร่วมกับเครื่องมือติดตามผลของ VibeLinkTH ตามความสามารถและสิทธิ์ของแพ็กเกจ</p>
          </details>
        </div>
        <div className={styles.nextStep}>
          <div><span className={styles.kicker}>BEYOND QR</span><h2>VibeLinkTH — Your vibe. Level up your life. Grow your business.</h2>
            <p>ใช้ Links รวมลิงก์และดูสถิติคลิกตามสิทธิ์บัญชี ส่วน Booking ยังพัฒนา และ Live เปิดเป็นสตูดิโอทดลอง</p></div>
          <div className={styles.actions}>
            <Link className={styles.mainLink} href={marketingUrl}>ไปดู VibeLinkTH เต็ม ๆ ↗</Link>
            <Link className={styles.altLink} href="https://www.vibelinkth.com/#pricing">ดูแพ็กเกจแบบไม่ต้องรีบตัดสินใจ ↗</Link>
          </div>
        </div>
      </section>
    </>
  );
}
