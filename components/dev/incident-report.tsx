import styles from "@/app/ceo/dev-console.module.css";

export function IncidentReportModule() {
  return (
    <section id="mod-incident" className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">feature_search</span>
        <h2>เธฃเธฒเธขเธเธฒเธเน€เธซเธ•เธธเธเธฒเธฃเธ“เน โ€” เธเนเธญเธเนเธซเธงเนเนเธเธฅเนเธฅเธฑเธ (.env)</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>เธฃเธญ sign-off</span>
      </div>
      <p className={styles.cardSub}>
        เธ•เธฃเธงเธเธเธเธฃเธฐเธซเธงเนเธฒเธ hardening Phase 1 (22 เธ.เธข. 2569) โ€” เน€เธชเนเธเธ—เธฒเธเธ•เธฃเธเธเธญเธเนเธเธฅเนเธฅเธฑเธ (.env,
        .env.production) เธเธเนเธ”เน€เธกเธเธซเธฅเธฑเธเธเนเธฒเธ เธ•เนเธญเธเธขเธทเธเธขเธฑเธเธงเนเธฒเธเนเธญเธกเธนเธฅเธเธฃเธดเธเนเธกเนเน€เธเธขเธ–เธนเธเธญเนเธฒเธ
      </p>

      <span className={styles.secLabel}>เธชเธฃเธธเธเน€เธซเธ•เธธเธเธฒเธฃเธ“เน</span>
      <div className={styles.stack}>
        <div className={styles.kv}>
          <div>
            <b>เน€เธเธดเธ”เธญเธฐเนเธฃเธเธถเนเธ</b>
            <span style={{ color: "#a1a1aa" }}>
              URL เธ•เธฃเธ เน เธเธญเธเนเธเธฅเนเธฅเธฑเธเธเธเน€เธงเนเธเธ–เธนเธเน€เธเธดเธ”เนเธซเนเน€เธเนเธฒเธ–เธถเธเนเธ”เนเธ•เธฒเธกเธ—เธคเธฉเธเธต โ€” เธ•เนเธญเธเธญเธธเธ”เนเธฅเธฐเธเธดเธชเธนเธเธเนเธงเนเธฒเนเธกเนเธกเธตเธเธฒเธฃเธฃเธฑเนเธงเธเธฃเธดเธ
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>เธซเธฅเธฑเธเธเธฒเธเธ—เธตเนเธ•เธฃเธงเธเนเธฅเนเธง</b>
            <span style={{ color: "#a1a1aa" }}>
              www/.env โ’ HTTP 200 เนเธ•เนเธเธทเธ HTML เธซเธเนเธฒ landing (prototype ~126.6 KB) เนเธกเนเนเธเนเนเธเธฅเนเธเธฃเธดเธ ยท{" "}
              vibelinkth.com/.env เนเธฅเธฐ app.vibelinkth.com/.env โ’ 404
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>เธเธฅเธเธฃเธฐเธ—เธ</b>
            <span style={{ color: "#a1a1aa" }}>
              เธเธฒเธเธเธฒเธฃ verify เนเธกเนเธเธเธงเนเธฒเธเนเธฒเธฅเธฑเธเธเธฃเธดเธ (Neon, Stripe, AUTH_SECRET, Resend) เธฃเธฑเนเธงเธญเธญเธเธ—เธฒเธเธเนเธญเธเธเธตเน
              โ€” เธ–เธทเธญเน€เธเนเธ โ€เธเนเธญเธเนเธซเธงเนเธ—เธตเนเธญเธธเธ”เนเธฅเนเธงโ€ เนเธกเนเนเธเน โ€เธเธฒเธฃเธฃเธฑเนเธงเธ—เธตเนเธเธดเธชเธนเธเธเนเนเธฅเนเธงโ€
            </span>
          </div>
        </div>
      </div>

      <div className={styles.hairline} style={{ marginTop: 16 }} />

      <div className={styles.cardHead} style={{ marginTop: 14 }}>
        <span className="ms">task_alt</span>
        <h2>เธ—เธณเนเธฅเนเธง</h2>
        <span className={`${styles.pill} ${styles.pillOn}`}>done</span>
      </div>
      <div className={styles.stack} style={{ marginTop: 10 }}>
        <div className={styles.kv}>
          <div>
            <b>Guard route เนเธเธฅเนเธฅเธฑเธ</b>
            <span style={{ color: "#a1a1aa" }}>
              เน€เธเธดเนเธก 4 route เนเธ wrangler.jsonc (.env/.env.production ร— vibelinkth.com/www) โ’ เน€เธเนเธฒ
              Worker เธเธทเธ 404 ยท deploy เนเธฅเนเธง
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>Rotate AUTH_SECRET</b>
            <span style={{ color: "#a1a1aa" }}>เนเธฃเน€เธ•เธเธฑเธเนเธฅเนเธง 1 เธเธฃเธฑเนเธ (เธ”เธนเนเธ GovernanceModule)</span>
          </div>
        </div>
      </div>

      <div className={styles.hairline} style={{ marginTop: 16 }} />

      <div className={styles.cardHead} style={{ marginTop: 14 }}>
        <span className="ms">pending_actions</span>
        <h2>เธเนเธฒเธเธฃเธญเธเธณเธชเธฑเนเธเธเธธเธ“</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>action needed</span>
      </div>
      <div className={styles.stack} style={{ marginTop: 10 }}>
        <div className={styles.kv}>
          <div>
            <b>1 ยท Purge edge cache</b>
            <span style={{ color: "#a1a1aa" }}>
              เธ—เธตเน Cloudflare (เธซเธฃเธทเธญเธฃเธญเธเนเธ s-maxage ~28 เธ.เธข. 2569) เนเธฅเนเธงเธเธถเธเธฅเธ guard route เธ—เธฑเนเธ 4 เนเธ”เน
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>2 ยท Reset / rotate Neon DB credential</b>
            <span style={{ color: "#a1a1aa" }}>
              เธ•เธฑเนเธเธเนเธฒ DATABASE_URL + DATABASE_URL_UNPOOLED เนเธซเธกเนเธ—เธตเน Workers
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>3 ยท Roll Stripe test keys</b>
            <span style={{ color: "#a1a1aa" }}>เธชเธฃเนเธฒเธ key เนเธซเธกเนเนเธ Stripe Dashboard เนเธฅเนเธงเธญเธฑเธเน€เธ”เธ• secret</span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>4 ยท PDPA breach assessment</b>
            <span style={{ color: "#a1a1aa" }}>
              เนเธซเนเธเธเธเธเธซเธกเธฒเธขเธเธฃเธฐเน€เธกเธดเธเธญเธขเนเธฒเธเน€เธเนเธเธ—เธฒเธเธเธฒเธฃ + เธ•เธฃเธงเธเธซเธเนเธฒเธ—เธตเนเนเธเนเธเน€เธซเธ•เธธ
            </span>
          </div>
        </div>
      </div>

      <p className={styles.source}>
        Sign-off ยท เธฃเธตเธงเธดเธงเธฃเธฒเธขเธเธฒเธเธเธตเนเธ—เธตเน Mission Control เนเธฅเนเธงเธชเธฑเนเธเน€เธเธฅเธตเธขเธฃเน 4 เธฃเธฒเธขเธเธฒเธฃเธเนเธฒเธเธเธ โ€” เน€เธกเธทเนเธญเธเธฃเธ
        เน€เธเธฅเธตเนเธขเธเธชเธ–เธฒเธเธฐเน€เธเนเธ cleared เนเธ”เน ยท Source: wrangler.jsonc + verification log + GovernanceModule
      </p>
    </section>
  );
}