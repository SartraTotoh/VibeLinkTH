import styles from "@/app/ceo/dev-console.module.css";

export type VaultItem = { key: string; label: string; configured: boolean };

/** Only configuration status crosses the server/client boundary. */
export function SecretVault({ items }: { items: VaultItem[] }) {
  const ready = items.filter((i) => i.configured).length;
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">key</span><h2>Secret configuration</h2>
        <span className={`${styles.pill} ${ready === items.length ? styles.pillOn : styles.pillWarn}`}>{ready}/{items.length} ตั้งแล้ว</span>
      </div>
      <p className={styles.cardSub}>แสดงเฉพาะสถานะการตั้งค่า จัดการค่าลับผ่านผู้ให้บริการหรือ Wrangler</p>
      <div className={styles.vault} style={{ marginTop: 12 }}>
        {items.map((item) => <div key={item.key} className={styles.vaultRow}>
          <span className={`${styles.dot} ${item.configured ? styles.dotOn : styles.dotOff}`} />
          <div className={styles.vaultMeta}><b>{item.label}</b><small className={styles.mono}>{item.key}</small></div>
          <span>{item.configured ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}</span>
        </div>)}
      </div>
      <p className={styles.source}>Source · สถานะ Worker configuration ขณะรัน</p>
    </div>
  );
}
