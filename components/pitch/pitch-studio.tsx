"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./pitch-studio.module.css";

export function PitchStudio() {
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [context, setContext] = useState("");
  const [offer, setOffer] = useState("");
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");

  function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubject(`ขอคุยเรื่อง ${offer.trim()}`.slice(0, 200));
    setBody(`สวัสดี${recipient.trim() ? ` ${recipient.trim()}` : "ครับ/ค่ะ"}\n\n${context.trim()}\n\n${offer.trim()}\n\n${question.trim()}\n\nหากไม่ต้องการรับการติดต่อเพิ่มเติม ตอบว่า “ไม่สนใจ” ได้เลย\n\n${sender.trim()}`);
    setNotice("สร้างร่างแล้ว กรุณาตรวจชื่อ ข้อเสนอ และหลักฐานก่อนนำไปใช้");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setNotice("คัดลอกร่างแล้ว");
    } catch {
      setNotice("คัดลอกอัตโนมัติไม่ได้ เลือกข้อความในช่องร่างเพื่อคัดลอกได้เลย");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`Subject: ${subject}\n\n${body}`], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "pitch-draft.txt"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice("ดาวน์โหลดร่างข้อความแล้ว");
  }

  return <main className={styles.page}>
    <nav><Link href="/">VibeLinkTH</Link><Link href="/qr">QR Studio</Link></nav>
    <header><p className={styles.kicker}>PITCH STUDIO</p><h1>ร่างอีเมลธุรกิจให้ตรงประเด็น</h1>
      <p>เริ่มจากเหตุผลที่ติดต่อ ข้อเสนอที่ทำได้จริง และคำถามเดียวที่อยากให้ผู้รับตอบ</p>
      <p>ข้อมูลที่กรอกอยู่ในหน้านี้ ไม่มีรายชื่อผู้รับสำเร็จรูป และไม่มีการส่งอีเมลจากเครื่องมือนี้</p></header>
    <div className={styles.grid}>
      <form onSubmit={generate} className={styles.panel}>
        <h2>เตรียมร่าง</h2>
        <label>ชื่อผู้รับหรือทีม<input value={recipient} onChange={(e) => setRecipient(e.target.value)} maxLength={120} autoComplete="off" /></label>
        <label>ชื่อผู้ส่ง<input required value={sender} onChange={(e) => setSender(e.target.value)} maxLength={120} autoComplete="off" /></label>
        <label>เหตุผลที่ติดต่อ<textarea required rows={3} value={context} onChange={(e) => setContext(e.target.value)} maxLength={1000} placeholder="อ้างเฉพาะงานหรือข้อมูลที่คุณตรวจแล้วจริง" /></label>
        <label>ข้อเสนอที่ทำได้จริง<textarea required rows={3} value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={1000} /></label>
        <label>คำถามหรือขั้นตอนถัดไปหนึ่งข้อ<textarea required rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} /></label>
        <button type="submit">สร้างร่างอีเมล</button>
      </form>
      <section className={styles.panel} aria-label="ร่างอีเมล">
        <h2>ตรวจและปรับข้อความ</h2>
        <label>หัวข้ออีเมล<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} /></label>
        <label>เนื้อหา<textarea className={styles.draft} rows={17} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} /></label>
        <p>ตรวจช่องทางติดต่อธุรกิจและคำขอหยุดติดต่อก่อนใช้ร่าง อย่าอ้างผลลัพธ์หรือความสามารถที่ยังตรวจสอบไม่ได้</p>
        <div className={styles.actions}><button type="button" disabled={!body.trim()} onClick={() => void copy()}>คัดลอกร่าง</button><button type="button" disabled={!body.trim()} onClick={download}>ดาวน์โหลดข้อความ</button></div>
        <p role="status" aria-live="polite">{notice}</p>
      </section>
    </div>
  </main>;
}
