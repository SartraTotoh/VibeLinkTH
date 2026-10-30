import Link from "next/link";
import { BRAND } from "@/lib/products";
import { ProductCards } from "@/components/products/product-cards";
import { ProductNavigation } from "@/components/products/product-navigation";

export function LandingPage() {
  return (
    <main className="shell">
      <header className="nav">
        <Link className="brand" href="/" prefetch={false}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>TH
        </Link>
        <div className="navLinks">
          <Link href="#features" prefetch={false}>บริการ</Link>
          <Link href="/support" prefetch={false}>ช่วยเหลือ</Link>
        </div>
        <div className="dash-actions">
          <Link className="mini-btn" href="/login" prefetch={false}>
            <span className="ms" aria-hidden="true">login</span>เข้าสู่ระบบ
          </Link>
          <Link className="mini-btn copy-primary" href="/signup" prefetch={false}>
            <span className="ms" aria-hidden="true">person_add</span>สมัคร
          </Link>
        </div>
      </header>
      <ProductNavigation />
      <section className="hero heroMotion">
        <div className="eyebrow">{BRAND.name} · Links / QR / Booking / Live</div>
        <h1>สร้าง QR Code ฟรี <span>ให้ทุกลิงก์มี Vibe</span></h1>
        <p>{BRAND.name} — {BRAND.tagline}</p>
        <p>เริ่มจาก URL ของคุณ ปรับสี ใส่โลโก้ และตรวจการสแกนก่อนโหลด PNG / SVG
          ใช้ Links จัดการลิงก์และดูสถิติคลิกตามสิทธิ์บัญชี</p>
        <div className="actions">
          <Link className="button primary" href="/qr" prefetch={false} style={{ minHeight: 50, padding: "0 24px", fontSize: 16 }}>
            <span className="ms" aria-hidden="true">qr_code_2</span>สร้าง QR ฟรี
          </Link>
          <Link className="button secondary" href="#features" prefetch={false} style={{ minHeight: 50, padding: "0 22px", fontSize: 16 }}>
            <span className="ms" aria-hidden="true">grid_view</span>ดูบริการ
          </Link>
        </div>
      </section>
      <section id="features" aria-label="บริการ VibeLinkTH"><ProductCards /></section>
      <footer className="dash-foot">
        <div><b>{BRAND.name}</b> · {BRAND.tagline}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <Link href="/terms" prefetch={false}>เงื่อนไขการใช้งาน</Link>
          <Link href="/privacy" prefetch={false}>นโยบายความเป็นส่วนตัว</Link>
          <Link href="/support" prefetch={false}>ฝ่ายบริการลูกค้า</Link>
        </div>
      </footer>
    </main>
  );
}
