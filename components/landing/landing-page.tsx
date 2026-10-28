import Link from "next/link";
import { FeatureCard } from "./feature-card";

const features = [
  {
    title: "QR Studio",
    description: "สร้าง QR Code ฟรี แต่งสี ใส่โลโก้ เลือกลาย dots/eyes เช็ก Scan Health ก่อนดาวน์โหลด PNG / SVG คมชัดสูง",
    icon: "qr_code_2",
    badge: "Free 100%",
  },
  {
    title: "Short Link & Dynamic URL",
    description: "สร้างลิงก์สั้นแบรนด์คุณ จัดการสถานะ และสลับ URL ปลายทางได้ตลอดเวลาแม้พิมพ์ป้ายหรือแจกไปแล้ว",
    icon: "link",
    badge: "Dynamic",
  },
  {
    title: "UTM Campaign Tracking",
    description: "ติดแท็กแคมเปญให้ทุกลิงก์ Source, Medium, Campaign เพื่อวัดผล Conversion ได้อย่างแม่นยำ ไม่พลาดทุกยอดขาย",
    icon: "campaign",
    badge: "Analytics",
  },
  {
    title: "Vibe Page (Bio Link)",
    description: "รวมโปรไฟล์ ลิงก์โซเชียล TikTok, IG, FB, LINE, YouTube และพิกัดสินค้า Affiliate ไว้ในหน้าเดียวที่โหลดไวใน 0.04 วินาที",
    icon: "auto_awesome",
    badge: "Bio Link",
  },
  {
    title: "VibeBook 1:1 Booking",
    description: "ระบบรับจองบริการและนัดหมาย 1:1 พร้อมรับชำระเงินมัดจำทันทีผ่าน QR ลดเวลาตอบแชท LINE สลับไปมา",
    icon: "calendar_month",
    badge: "New",
  },
  {
    title: "Creator Analytics Hub",
    description: "เจาะลึกสถิติคนคลิก ยอดสแกน แยกตามอุปกรณ์ เบราว์เซอร์ ระบบปฏิบัติการ และประเทศ แบบ Real-time",
    icon: "trending_up",
    badge: "Real-time",
  },
];

export function LandingPage() {
  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/" prefetch={false}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VibeLink Logo" />
          Vibe<span>Link</span>
        </Link>
        <div className="navLinks">
          <Link href="/qr" prefetch={false}>QR</Link>
          <Link href="#features" prefetch={false}>ฟีเจอร์</Link>
          <Link href="/support" prefetch={false}>ช่วยเหลือ</Link>
        </div>
        <div className="dash-actions">
          <Link className="mini-btn" href="/login" prefetch={false}>
            <span className="ms">login</span>
            เข้าสู่ระบบ
          </Link>
          <Link className="mini-btn copy-primary" href="/signup" prefetch={false}>
            <span className="ms">person_add</span>
            สมัคร
          </Link>
        </div>
      </nav>

      <section className="hero heroMotion">
        <div className="eyebrow">
          <span>FREE QR STUDIO · MAKE IT YOUR VIBE</span>
        </div>
        <h1>
          QR ที่มี Vibe <span>· ลิงก์ที่พาคุณไปต่อ</span>
        </h1>
        <p>
          แพลตฟอร์มสร้าง QR Code ฟรี ตรวจ Scan Health ก่อนดาวน์โหลด พร้อม Vibe Page,
          VibeBook และระบบวิเคราะห์ผลลัพธ์ โหลดไวใน 0.04 วินาที ออกแบบเพื่อครีเอเตอร์ไทย
        </p>

        <div className="actions">
          <Link className="button primary" href="/qr" prefetch={false} style={{ minHeight: 50, padding: "0 24px", fontSize: 16 }}>
            <span className="ms" style={{ fontSize: 20 }}>qr_code_2</span>
            สร้าง QR
          </Link>
          <Link className="button secondary" href="#features" prefetch={false} style={{ minHeight: 50, padding: "0 22px", fontSize: 16 }}>
            <span className="ms" style={{ fontSize: 20 }}>grid_view</span>
            ดูฟีเจอร์
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="cards cardMotion" id="features">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <footer className="dash-foot">
        <div>
          <b>VibeLink Thailand</b> · แพลตฟอร์มรวมลิงก์ Bio Link และ Dynamic QR Code สำหรับครีเอเตอร์
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/terms" prefetch={false}>เงื่อนไขการใช้งาน</Link>
          <Link href="/privacy" prefetch={false}>นโยบายความเป็นส่วนตัว</Link>
          <Link href="/support" prefetch={false}>ฝ่ายบริการลูกค้า</Link>
        </div>
      </footer>
    </main>
  );
}
