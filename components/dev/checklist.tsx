import styles from "@/app/ceo/dev-console.module.css";

export type ChecklistItem = { title: string; desc: string; url?: string; urlLabel?: string };

export function ChecklistModule({ items }: { items: ChecklistItem[] }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">checklist</span>
        <h2>เช็กลิสต์เปิดตัว</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>manual</span>
      </div>
      <p className={styles.cardSub}>{items.length} ขั้น — ทำใน dashboard ภายนอกตามลำดับ</p>
      <ol className={styles.ordered} start={1}>
        {items.map((it) => (
          <li key={it.title}>
            <b>{it.title}</b>
            <span>{it.desc}</span>
            {it.url ? (
              <a href={it.url} target="_blank" rel="noreferrer noopener">
                {it.urlLabel ?? "เปิด"} →
              </a>
            ) : null}
          </li>
        ))}
      </ol>
      <p className={styles.source}>Source · รายการ manual — อัปเดตเมื่อเสร็จทีละข้อ · ความคืบหน้าไม่ได้บันทึกในระบบ</p>
    </div>
  );
}