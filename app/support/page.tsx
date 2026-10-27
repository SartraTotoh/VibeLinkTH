import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";
import { NavLangSwitcher } from "@/components/i18n/language";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { AdminSupportWrapper } from "@/components/support/admin-support-wrapper";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ช่วยเหลือ | ฝ่ายสนับสนุน — VibeLink",
  robots: { index: false, follow: false },
};

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";
  const userIsAdmin = isAdmin(session.user.email);

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
          {userIsAdmin ? (
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
          <h1>{lang === "th" ? "ช่วยเหลือ & ฝ่ายสนับสนุน" : "Help & Support"}</h1>
          <p className="greet">
            {lang === "th"
              ? "ศูนย์กลางติดต่อทีมงาน ตอบคำถาม และจัดการ Ticket บริการ"
              : "Support hub, ticket management, and member inquiries"}
          </p>
        </div>
      </div>

      <div className="dash">
        <AdminSupportWrapper lang={lang} isAdminUser={userIsAdmin} />
      </div>

      <footer className="dash-foot">
        <span>{lang === "th" ? "© 2026 VibeLink — ทีมช่วยเหลือ" : "© 2026 VibeLink — Support"}</span>
      </footer>
    </main>
  );
}
