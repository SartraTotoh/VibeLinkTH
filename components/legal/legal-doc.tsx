import Link from "next/link";

export function LegalDoc({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>
        </Link>
        <div className="navLinks">
          <Link href="/terms">ข้อกำหนด</Link>
          <Link href="/privacy">ความเป็นส่วนตัว</Link>
          <Link href="/cookies">คุกกี้</Link>
        </div>
      </nav>

      <article className="legal">
        <h1>{title}</h1>
        <p className="legal-updated">อัปเดตล่าสุด {updatedAt}</p>
        {children}
      </article>

      <footer className="dash-foot">
        <span>© 2026 VibeLink — ตัวช่วยสายแชร์ลิงก์ ให้คลิกเนียนๆ ไม่อ่อม</span>
        <span>
          <Link href="/login">เข้าสู่ระบบ</Link>
        </span>
      </footer>
    </main>
  );
}
