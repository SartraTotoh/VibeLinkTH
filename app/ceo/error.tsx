"use client";

export default function CeoError({ reset }: { reset: () => void }) {
  return <main style={{ maxWidth: 720, margin: "48px auto", padding: 24 }}>
    <h1>โหลดหน้า CEO ไม่สำเร็จ</h1>
    <p>ข้อมูลบางส่วนอาจไม่พร้อมใช้งาน กรุณาลองใหม่ หากยังพบปัญหาให้ตรวจ server log ตามเวลาที่เกิดเหตุ</p>
    <button type="button" onClick={reset}>ลองโหลดใหม่</button>
  </main>;
}
