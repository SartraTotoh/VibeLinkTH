"use client";
import Link from "next/link";
export default function LiveError({ reset }: { reset: () => void }) {
  return <main className="shell"><section style={{ maxWidth: 640, margin: "80px auto" }}><h1>เปิดสตูดิโอไม่สำเร็จ</h1><p>ลองเปิดใหม่ หากมีไฟล์วิดีโอที่ดาวน์โหลดไว้แล้ว ไฟล์นั้นยังอยู่ในเครื่องของคุณ</p><button className="mini-btn" onClick={reset}>ลองเปิดใหม่</button> <Link href="/dashboard">กลับ Dashboard</Link></section></main>;
}
