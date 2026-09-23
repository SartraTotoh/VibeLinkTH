import styles from "@/app/ceo/dev-console.module.css";

export function ChecklistModule({ items }: { items: [string, string][] }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">checklist</span>
        <h2>เช็กลิสต์เปิดตัว</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>manual</span>
      </div>
      <p className={styles.cardSub}>{items.length} ขั้น — ทำใน dashboard ภายนอกตามลำดับ</p>
      <ol className={styles.ordered} start={1}>
        {items.map(([title, desc]) => (
          <li key={title}>
            <b>{title}</b>
            <span>{desc}</span>
          </li>
        ))}
      </ol>
      <p className={styles.source}>Source · รายการ manual — อัปเดตเมื่อเสร็จทีละข้อ · ความคืบหน้าไม่ได้บันทึกในระบบ</p>
    </div>
  );
}