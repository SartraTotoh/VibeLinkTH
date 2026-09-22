"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell auth-shell">
      <div className="auth-card">
        <div className="eyebrow">เกิดข้อผิดพลาด</div>
        <h1>มีอะไรผิดพลาด</h1>
        <p className="auth-sub">
          ระบบขัดข้องชั่วคราว ทีมงานได้รับแจ้งแล้ว ลองใหม่อีกครั้งได้เลย
        </p>
        <button className="button primary" onClick={reset}>
          ลองอีกครั้ง
        </button>
      </div>
    </main>
  );
}
