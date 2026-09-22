import Link from "next/link";
import { cookies } from "next/headers";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import { RequestVerificationForm } from "@/components/auth/request-verification-form";

export const metadata = { title: "Verify email — VibeLink" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const lang: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "th";

  const copy =
    status === "success"
      ? { title: t(lang, "auth.verifyOk"), body: t(lang, "auth.verifyOkSub") }
      : status === "invalid"
        ? { title: t(lang, "auth.verifyBad"), body: t(lang, "auth.verifyBadSub") }
        : { title: t(lang, "auth.verifyCheck"), body: t(lang, "auth.verifyCheckSub") };

  return (
    <main className="shell auth-shell">
      <div className="auth-card">
        <div className="eyebrow">VibeLink Account</div>
        <h1>{copy.title}</h1>
        <p className="auth-sub">{copy.body}</p>
        <RequestVerificationForm />
        <div className="auth-alt">
          <Link href="/login">{t(lang, "auth.toLoginPage")}</Link>
        </div>
        <div className="auth-back">
          <Link href="/">← {t(lang, "nav.home")}</Link>
        </div>
      </div>
    </main>
  );
}
