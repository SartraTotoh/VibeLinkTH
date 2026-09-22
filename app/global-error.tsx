"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#090b10",
          color: "#e2e2e9",
          fontFamily: "Inter, 'Noto Sans Thai', sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24 }}>ระบบขัดข้องชั่วคราว</h1>
          <p style={{ color: "#c2caae" }}>กรุณาลองใหม่อีกครั้ง</p>
          <button
            onClick={reset}
            style={{
              marginTop: 12,
              padding: "12px 22px",
              borderRadius: 14,
              border: 0,
              background: "linear-gradient(135deg,#ff4fd8,#8b5cf6)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ลองอีกครั้ง
          </button>
        </div>
      </body>
    </html>
  );
}
