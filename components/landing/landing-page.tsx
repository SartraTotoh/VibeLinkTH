import Link from "next/link";
import { FeatureCard } from "./feature-card";

const features = [
  {
    title: "Short Link",
    description: "สร้างลิงก์สั้น จัดการสถานะ และเปลี่ยนปลายทางได้ในที่เดียว.",
  },
  {
    title: "UTM Campaign",
    description: "ติดแท็กแคมเปญให้ทุกลิงก์เพื่อวัดผลได้ชัดเจน.",
  },
  {
    title: "Creator Analytics",
    description: "ดู Click และแหล่งที่มาของผู้ชมแบบเข้าใจง่าย.",
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
          <Link href="#pricing">แพ็กเกจ</Link>
          <Link href="/support">Help Center</Link>
        </div>
<Link className="button secondary" href="/login">
            เข้าสู่ระบบ
          </Link>
          <Link className="button secondary" href="/support">
            ช่วยเหลือ
          </Link>
      </nav>

      <section className="hero">
        <div className="eyebrow">Creator Link OS · MVP</div>
        <h1>
          ลิงก์ของคุณต้อง <span>คลิกเนียน</span> กว่านี้
        </h1>
        <p>
          สร้าง Short Link, ติดตาม Click และวัดผล UTM Campaign ได้ในโปรเจกต์เดียว
          พร้อมต่อยอดเป็นระบบ Creator Analytics จริง
        </p>
        <div className="actions">
          <Link className="button primary" href="/signup">
            เริ่มใช้ฟรี
          </Link>
          <Link className="button secondary" href="#features">
            ดูฟีเจอร์
          </Link>
        </div>

        <div className="cards" id="features">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>
    </main>
  );
}
