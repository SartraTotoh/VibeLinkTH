import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { NavLangSwitcher } from "@/components/i18n/language";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { SupportChat } from "@/components/support/support-chat";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ช่วยเหลือ | ฝ่ายสนับสนุน — VibeLink",
  robots: { index: false, follow: false },
};

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          <img src="/logo.png" alt="" />
          Vibe<span>Link</span>
        </Link>
        <div className="dash-actions">
          <span className="nav-user">{session.user.email}</span>
          <NavLangSwitcher />
          <Link href="/dashboard" className="mini-btn">
            <span className="ms">link</span>
            {lang === "th" ? "หน้าลิงก์" : "My links"}
          </Link>
          <Link href="/settings" className="mini-btn">
            <span className="ms">settings</span>
            {lang === "th" ? "ตั้งค่า" : "Settings"}
          </Link>
          {isAdmin(session.user.email) ? (
            <Link href="/ceo" className="mini-btn">
              <span className="ms">terminal</span>
              Dev
            </Link>
          ) : null}
          <SignOutButton label={lang === "th" ? "ออกจากระบบ" : "Sign out"} />
        </div>
      </nav>

      <div className="dash-head">
        <div>
          <h1>{lang === "th" ? "ช่วยเหลือ & พูดคุยกับทีมงาน" : "Help & talk to our team"}</h1>
          <p className="greet">
            {lang === "th"
              ? "ค้นหาคำตอบยอดฮิตได้ทันที หรือส่งข้อความ — ทีมงานตอบกลับเร็ว"
              : "Get instant answers to popular questions, or message us — we reply fast"}
          </p>
        </div>
      </div>

      <div className="dash">
        <SupportChat lang={lang} />
      </div>

      <footer className="dash-foot">
        <span>{lang === "th" ? "© 2026 VibeLink — ทีมช่วยเหลือ" : "© 2026 VibeLink — Support"}</span>
      </footer>
    </main>
  );
}