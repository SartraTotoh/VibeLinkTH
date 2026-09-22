import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "ตั้งรหัสผ่านใหม่ — VibeLink" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="shell auth-shell">
      <ResetPasswordForm token={token ?? ""} />
    </main>
  );
}
