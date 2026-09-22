import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell auth-shell">
      <div className="auth-card">
        <div className="eyebrow">404</div>
        <h1>ไม่พบหน้านี้</h1>
        <p className="auth-sub">ลิงก์อาจถูกเปลี่ยนหรือถูกลบไปแล้ว</p>
        <div className="auth-alt">
          <Link href="/dashboard">ไปที่หน้าควบคุมลิงก์</Link>
        </div>
        <div className="auth-back">
          <Link href="/">← กลับหน้าแรก</Link>
        </div>
      </div>
    </main>
  );
}
