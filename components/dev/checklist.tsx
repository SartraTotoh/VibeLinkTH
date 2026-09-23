import styles from "@/app/ceo/dev-console.module.css";

export function ChecklistModule({ items }: { items: [string, string][] }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">checklist</span>
        <h2>เน€เธเนเธเธฅเธดเธชเธ•เนเน€เธเธดเธ”เธ•เธฑเธง</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>manual</span>
      </div>
      <p className={styles.cardSub}>{items.length} เธเธฑเนเธ โ€” เธ—เธณเนเธ dashboard เธ เธฒเธขเธเธญเธเธ•เธฒเธกเธฅเธณเธ”เธฑเธ</p>
      <ol className={styles.ordered} start={1}>
        {items.map(([title, desc]) => (
          <li key={title}>
            <b>{title}</b>
            <span>{desc}</span>
          </li>
        ))}
      </ol>
      <p className={styles.source}>Source ยท เธฃเธฒเธขเธเธฒเธฃ manual โ€” เธญเธฑเธเน€เธ”เธ•เน€เธกเธทเนเธญเน€เธชเธฃเนเธเธ—เธตเธฅเธฐเธเนเธญ ยท เธเธงเธฒเธกเธเธทเธเธซเธเนเธฒเนเธกเนเนเธ”เนเธเธฑเธเธ—เธถเธเนเธเธฃเธฐเธเธ</p>
    </div>
  );
}