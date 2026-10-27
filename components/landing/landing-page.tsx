import Link from "next/link";
import { FeatureCard } from "./feature-card";
import styles from "./landing-page.module.css";

const features = [
  {
    title: "QR Studio",
    description: "สร้าง QR Code ฟรี แต่งสี ใส่โลโก้ เช็กก่อนแชร์ แล้วดาวน์โหลด PNG หรือ SVG",
  },
  {
    title: "Short Link",
    description: "สร้างลิงก์สั้น จัดการสถานะ และเปลี่ยนปลายทางได้ในที่เดียว",
  },
  {
    title: "UTM Campaign",
    description: "ติดแท็กแคมเปญให้ทุกลิงก์เพื่อวัดผลได้ชัดเจน",
  },
  {
    title: "Vibe Page",
    description: "รวมโปรไฟล์ ผลงาน และลิงก์สำคัญในหน้าเดียว",
  },
  {
    title: "VibeBook",
    description: "รับจองบริการและจัดการนัดหมายในระบบเดียวกัน",
  },
  {
    title: "Creator Analytics",
    description: "ดู Click และแหล่งที่มาของผู้ชมตามสิทธิ์แพ็กเกจ",
  },
];

export function LandingPage() {
  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">
          Vibe<span>Link</span>
        </Link>
        <div className="navLinks">
          <Link href="#features">ฟีเจอร์</Link>
          <Link href="https://vibelinkth.com/">เว็บหลัก</Link>
          <Link href="/support">Help Center</Link>
        </div>
        <Link className="button secondary" href="/login">
          เข้าสู่ระบบ
        </Link>
        <Link className="button primary" href="/signup">
          สมัครสมาชิก
        </Link>
      </nav>

      <section className={`hero ${styles.heroMotion}`}>
        <div className="eyebrow">FREE QR STUDIO · MAKE IT YOUR VIBE</div>
        <h1>
          QR ที่มี Vibe <span>· ลิงก์ที่ไปต่อ</span>
        </h1>
        <p>
          สร้าง QR Code ฟรี แต่งให้มีซีน เช็กก่อนแชร์ แล้วพาคนไปต่อกับ Vibe Page,
          VibeBook และ Short Link ได้เมื่อคุณพร้อม
        </p>
        <div className="actions">
          <Link className="button primary" href="/qr">
            สร้าง QR ฟรี ให้มี Vibe
          </Link>
          <Link className="button secondary" href="#features">
            ดูฟีเจอร์
          </Link>
        </div>

        <div className={`cards ${styles.cardMotion}`} id="features">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>
    </main>
  );
}