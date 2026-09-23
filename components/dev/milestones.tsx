import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/ceo/dev-console.module.css";

export function MilestonesModule() {
  const annivMs = new Date("2027-09-21T00:00:00+07:00").getTime() - Date.now();
  const daysLeft = Math.ceil(annivMs / 86400_000);

  return (
    <Collapsible
      id="mod-milestones"
      icon="cake"
      title="เธงเธฑเธเธ—เธตเนเธชเธณเธเธฑเธ"
      source="เธงเธฑเธเธ—เธตเนเธเธฃเธดเธเธเธญเธเนเธเธฃเน€เธเธเธ•เน"
    >
      <div className={styles.stack}>
        <div className={styles.kv}>
          <div>
            <b>21 เธ.เธข. 2569 โ€” Grand Launch</b>
            <span style={{ color: "#a1a1aa" }}>
              landing + เนเธญเธเนเธเนเธเธฒเธเธเธฃเธดเธ + เธฃเธฑเธเน€เธเธดเธ Stripe Live + เธญเธตเน€เธกเธฅ Resend ยท เธงเธฑเธเน€เธเธดเธ” VibeLink
            </span>
          </div>
          <span className={`${styles.pill} ${styles.pillOn}`}>D-DAY</span>
        </div>
        <div className={styles.kv}>
          <div>
            <b>22 เธ.เธข. 2569 โ€” Phase 1 + Security hardening</b>
            <span style={{ color: "#a1a1aa" }}>
              Analytics/QR/UTM/i18n/CRM เธเธฃเธ ยท เธญเธธเธ”เธเนเธญเธเนเธซเธงเนเนเธเธฅเนเธฅเธฑเธ + เนเธฃเน€เธ•เธเธฑเธเธเธตเธขเน
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>21 เธ.เธข. 2570 โ€” เธเธฃเธเธฃเธญเธ 1 เธเธต</b>
            <span style={{ color: "#a1a1aa" }}>
              {annivMs > 0 ? `เธญเธตเธเธเธฃเธฐเธกเธฒเธ“ ${daysLeft} เธงเธฑเธ` : "เธ–เธถเธเนเธฅเนเธง เธเธฅเธญเธเน€เธฅเธข!"}
            </span>
          </div>
          <span className={`${styles.pill} ${styles.pillWarn}`}>next</span>
        </div>
      </div>
    </Collapsible>
  );
}