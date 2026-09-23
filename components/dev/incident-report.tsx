import styles from "@/app/ceo/dev-console.module.css";

export function IncidentReportModule() {
  return (
    <section id="mod-incident" className={styles.card}>
      <div className={styles.cardHead}>
        <span className="ms">feature_search</span>
        <h2>รายงานเหตุการณ์ — ช่องโหว่ไฟล์ลับ (.env)</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>รอ sign-off</span>
      </div>
      <p className={styles.cardSub}>
        ตรวจพบระหว่าง hardening Phase 1 (22 ก.ย. 2569) — เส้นทางตรงของไฟล์ลับ (.env,
        .env.production) บนโดเมนหลังบ้าน ต้องยืนยันว่าข้อมูลจริงไม่เคยถูกอ่าน
      </p>

      <span className={styles.secLabel}>สรุปเหตุการณ์</span>
      <div className={styles.stack}>
        <div className={styles.kv}>
          <div>
            <b>เกิดอะไรขึ้น</b>
            <span style={{ color: "#a1a1aa" }}>
              URL ตรง ๆ ของไฟล์ลับบนเว็บถูกเปิดให้เข้าถึงได้ตามทฤษฎี — ต้องอุดและพิสูจน์ว่าไม่มีการรั่วจริง
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>หลักฐานที่ตรวจแล้ว</b>
            <span style={{ color: "#a1a1aa" }}>
              www/.env → HTTP 200 แต่คืน HTML หน้า landing (prototype ~126.6 KB) ไม่ใช่ไฟล์จริง ·{" "}
              vibelinkth.com/.env และ app.vibelinkth.com/.env → 404
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>ผลกระทบ</b>
            <span style={{ color: "#a1a1aa" }}>
              จากการ verify ไม่พบว่าค่าลับจริง (Neon, Stripe, AUTH_SECRET, Resend) รั่วออกทางช่องนี้
              — ถือเป็น “ช่องโหว่ที่อุดแล้ว” ไม่ใช่ “การรั่วที่พิสูจน์แล้ว”
            </span>
          </div>
        </div>
      </div>

      <div className={styles.hairline} style={{ marginTop: 16 }} />

      <div className={styles.cardHead} style={{ marginTop: 14 }}>
        <span className="ms">task_alt</span>
        <h2>ทำแล้ว</h2>
        <span className={`${styles.pill} ${styles.pillOn}`}>done</span>
      </div>
      <div className={styles.stack} style={{ marginTop: 10 }}>
        <div className={styles.kv}>
          <div>
            <b>Guard route ไฟล์ลับ</b>
            <span style={{ color: "#a1a1aa" }}>
              เพิ่ม 4 route ใน wrangler.jsonc (.env/.env.production × vibelinkth.com/www) → เข้า
              Worker คืน 404 · deploy แล้ว
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>Rotate AUTH_SECRET</b>
            <span style={{ color: "#a1a1aa" }}>โรเตชันแล้ว 1 ครั้ง (ดูใน GovernanceModule)</span>
          </div>
        </div>
      </div>

      <div className={styles.hairline} style={{ marginTop: 16 }} />

      <div className={styles.cardHead} style={{ marginTop: 14 }}>
        <span className="ms">pending_actions</span>
        <h2>ค้างรอคำสั่งคุณ</h2>
        <span className={`${styles.pill} ${styles.pillWarn}`}>action needed</span>
      </div>
      <div className={styles.stack} style={{ marginTop: 10 }}>
        <div className={styles.kv}>
          <div>
            <b>1 · Purge edge cache</b>
            <span style={{ color: "#a1a1aa" }}>
              ที่ Cloudflare (หรือรอพ้น s-maxage ~28 ก.ย. 2569) แล้วจึงลบ guard route ทั้ง 4 ได้
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>2 · Reset / rotate Neon DB credential</b>
            <span style={{ color: "#a1a1aa" }}>
              ตั้งค่า DATABASE_URL + DATABASE_URL_UNPOOLED ใหม่ที่ Workers
            </span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>3 · Roll Stripe test keys</b>
            <span style={{ color: "#a1a1aa" }}>สร้าง key ใหม่ใน Stripe Dashboard แล้วอัปเดต secret</span>
          </div>
        </div>
        <div className={styles.kv}>
          <div>
            <b>4 · PDPA breach assessment</b>
            <span style={{ color: "#a1a1aa" }}>
              ให้คนกฎหมายประเมินอย่างเป็นทางการ + ตรวจหน้าที่แจ้งเหตุ
            </span>
          </div>
        </div>
      </div>

      <p className={styles.source}>
        Sign-off · รีวิวรายงานนี้ที่ Mission Control แล้วสั่งเคลียร์ 4 รายการข้างบน — เมื่อครบ
        เปลี่ยนสถานะเป็น cleared ได้ · Source: wrangler.jsonc + verification log + GovernanceModule
      </p>
    </section>
  );
}