import Link from "next/link";
import { FeatureCard } from "./feature-card";
import styles from "./landing-page.module.css";

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
        <Link className="brand" href="/">
          <img src="/logo.png" alt="VibeLink Logo" />
          Vibe<span>Link</span>
        </Link>
        <div className="navLinks">
          <Link href="/qr">สร้าง QR Code</Link>
          <Link href="#features">ฟีเจอร์</Link>
          <Link href="https://vibelinkth.com/">เว็บหลัก</Link>
          <Link href="/support">Help Center</Link>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Link className="button secondary" href="/login" style={{ minHeight: 42, padding: "0 18px", fontSize: 14 }}>
            <span className="ms" style={{ fontSize: 18 }}>login</span>
            เข้าสู่ระบบ
          </Link>
          <Link className="button primary" href="/signup" style={{ minHeight: 42, padding: "0 20px", fontSize: 14 }}>
            <span className="ms" style={{ fontSize: 18 }}>person_add</span>
            สมัครสมาชิก
          </Link>
        </div>
      </nav>

      <section className={`hero ${styles.heroMotion}`}>
        <div className="eyebrow">
          <span>FREE QR STUDIO · MAKE IT YOUR VIBE</span>
        </div>
        <h1>
          QR ที่มี Vibe <span>· ลิงก์ที่พาคุณไปต่อ</span>
        </h1>
        <p>
          แพลตฟอร์มสร้าง QR Code ฟรี แต่งให้มีซีน เช็กความพร้อมก่อนแชร์ แล้วพาคนไปต่อกับ Vibe Page,
          VibeBook และ Short Link อัจฉริยะ โหลดเร็วกว่าใน 0.04 วินาที ออกแบบมาเพื่อครีเอเตอร์ไทยโดยเฉพาะ
        </p>

        <div className="actions">
          <Link className="button primary" href="/qr" style={{ minHeight: 52, padding: "0 26px", fontSize: 16 }}>
            <span className="ms" style={{ fontSize: 22 }}>qr_code_scanner</span>
            สร้าง QR ฟรี ให้มี Vibe
          </Link>
          <Link className="button secondary" href="#features" style={{ minHeight: 52, padding: "0 24px", fontSize: 16 }}>
            <span className="ms" style={{ fontSize: 20 }}>explore</span>
            ดูฟีเจอร์ทั้งหมด
          </Link>
        </div>

        {/* Feature Grid */}
        <div className={`cards ${styles.cardMotion}`} id="features">
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
          <Link href="/terms">เงื่อนไขการใช้งาน</Link>
          <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/support">ฝ่ายบริการลูกค้า</Link>
        </div>
      </footer>
    </main>
  );
}
