import { Collapsible } from "@/components/dev/collapsible";
import styles from "@/app/ceo/dev-console.module.css";

const THEMES = [
  {
    name: "Blink",
    mode: "light",
    spec: "VibeLink Electric Frosted",
    file: "DESIGN-blink.md",
    tokens: "bg #f5fbea ยท เธเธฒเธฃเนเธ”เธเธฃเธญเธชเธ•เน white/80 + backdrop-blur-2xl ยท DM Sans ยท squircle",
    status: "landing เธกเธตเนเธฅเนเธง ยท app เธขเธฑเธเนเธกเนเน€เธเนเธฒ (pending)",
    statusClass: styles.pillWarn,
  },
  {
    name: "Pank",
    mode: "dark",
    spec: "Cyberpunk Neon Glass",
    file: "DESIGN.md",
    tokens: "bg #090b10ยท#111319 ยท lime #b9ff2c ยท pink #ff4fd8 ยท violet #9270ff",
    status: "เธเธตเธกเธซเธฅเธฑเธ ยท เธเนเธฒเน€เธฃเธดเนเธกเธ•เนเธ landing + app (app/* เธ—เธฑเนเธเธซเธกเธ”)",
    statusClass: styles.pillOn,
  },
];

export function DesignModule() {
  return (
    <Collapsible
      id="mod-design"
      icon="palette"
      title="เธเธตเธก ยท Blink / Pank"
      tag="design"
      source="เนเธเธฅเนเธ•เนเธเธ—เธฒเธเธ—เธตเน repo root: DESIGN-blink.md (Blink) + DESIGN.md (Pank)"
    >
      <div className={styles.stack}>
        {THEMES.map((t) => (
          <div className={styles.kv} key={t.name}>
            <div>
              <b>{t.name} ยท {t.mode} โ€” {t.spec}</b>
              <span style={{ color: "#a1a1aa" }}>{t.tokens}</span>
              <span style={{ color: "#8e8e96" }}>{t.file} ยท {t.status}</span>
            </div>
            <span className={`${styles.pill} ${t.statusClass}`}>{t.mode}</span>
          </div>
        ))}

        <div className={styles.kv}>
          <div>
            <b>เธเธธเนเธกเธชเธฅเธฑเธเนเธซเธกเธ”</b>
            <span style={{ color: "#a1a1aa" }}>
              เธญเธขเธนเนเธ—เธตเน landing/index.html โ’ [data-theme-btn] ยท เธเนเธฒเน€เธฃเธดเนเธกเธ•เนเธ "pank" ยท เธเธณเธ•เธฑเธงเน€เธฅเธทเธญเธเนเธ
              localStorage "vibelink-theme"
            </span>
          </div>
        </div>

        <div className={styles.kv}>
          <div>
            <b>เธซเธกเธฒเธขเน€เธซเธ•เธธเธเธเธเธตเนเธฅเธทเธก</b>
            <span style={{ color: "#a1a1aa" }}>
              Blink = เธชเธงเนเธฒเธเน€เธชเธกเธญ, Pank = เธกเธทเธ”เน€เธชเธกเธญ โ€” เธญเธขเนเธฒเน€เธเธตเธขเธเธชเธฅเธฑเธเธเธฑเธ ยท เธ–เนเธฒเธเธฐเน€เธเธดเนเธกเธเธตเธก เธ•เนเธญเธเธญเธฑเธเน€เธ”เธ• 2
              เนเธเธฅเนเธเธตเน + เธซเธฅเธฑเธเธเธฒเธเนเธ landing เธเนเธญเธ
            </span>
          </div>
        </div>
      </div>
    </Collapsible>
  );
}