import Link from "next/link";
import { ProductNavigation } from "@/components/products/product-navigation";
import { BRAND, PRODUCTS } from "@/lib/products";
import { appPublicUrl, publicPageMetadata } from "@/lib/seo";
import styles from "./links.module.css";

const title = "VibeLinkTH Links | ย่อลิงก์ สร้างลิงก์สั้น และหน้ารวมลิงก์";
const description = "สร้างลิงก์สั้น จัดการ URL ปลายทาง รวมลิงก์ใน Bio และติด UTM เพื่อแยกแคมเปญ ดูสถิติคลิกตามสิทธิ์บัญชีกับ VibeLinkTH Links";
const linksUrl = appPublicUrl("/links");

export const metadata = publicPageMetadata(title, description, linksUrl);

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", "@id": `${linksUrl}#webpage`, url: linksUrl, name: title,
      description, inLanguage: "th-TH", about: { "@type": "Thing", name: PRODUCTS.links.name },
      breadcrumb: { "@id": `${linksUrl}#breadcrumb` },
      publisher: { "@type": "Organization", name: BRAND.name, url: BRAND.marketingUrl } },
    { "@type": "BreadcrumbList", "@id": `${linksUrl}#breadcrumb`, itemListElement: [
      { "@type": "ListItem", position: 1, name: BRAND.name, item: BRAND.marketingUrl },
      { "@type": "ListItem", position: 2, name: PRODUCTS.links.name, item: linksUrl },
    ] },
  ],
};

const features = [
  { icon: "link", title: "ลิงก์สั้น แชร์ง่าย", description: "ย่อ URL ให้แชร์สะดวก จัดการปลายทางและสถานะของลิงก์จากบัญชีคุณ" },
  { icon: "person", title: "หน้ารวมลิงก์ใน Bio", description: "รวมโปรไฟล์ โซเชียล และลิงก์ที่อยากให้คนพบไว้ในหน้าเดียว" },
  { icon: "sell", title: "แยกแคมเปญด้วย UTM", description: "กำหนด Source, Medium และ Campaign ให้ลิงก์ แล้วดูสถิติคลิกตามสิทธิ์บัญชี" },
];

export default function LinksPage() {
  return <div className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <a className={styles.skip} href="#links-main">ข้ามไปเนื้อหา</a>
    <header className={styles.header}>
      <Link className={styles.brand} href={BRAND.marketingUrl} aria-label="VibeLinkTH หน้าแรก" prefetch={false}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" width="34" height="34" />
        <span>Vibe<span className={styles.brandAccent}>Link</span>TH</span>
      </Link>
      <div className={styles.headerActions}>
        <Link className={styles.login} href="/login" prefetch={false}>เข้าสู่ระบบ</Link>
        <Link className={styles.signUp} href="/signup" prefetch={false}>สมัคร</Link>
      </div>
    </header>
    <div className={styles.productNav}><ProductNavigation active="links" discovery /></div>
    <main id="links-main" className={styles.main}>
      <section className={styles.hero} aria-labelledby="links-title">
        <div>
          <p className={styles.eyebrow}>VibeLinkTH Links</p>
          <h1 id="links-title">ย่อลิงก์ให้สั้น<br /><span>ต่อทุกการแชร์<br className={styles.desktopBreak} />ให้เป็นคุณ</span></h1>
          <p className={styles.lead}>สร้างลิงก์สั้น แชร์หน้ารวมลิงก์ และติด UTM<br className={styles.desktopBreak} /> จัดการทุกลิงก์ของคุณจากที่เดียว</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={PRODUCTS.links.route} prefetch={false}>เปิด Links <span aria-hidden="true">↗</span></Link>
            <Link className={styles.secondary} href="/qr" prefetch={false}>สร้าง QR ฟรี <span aria-hidden="true">↗</span></Link>
          </div>
          <p className={styles.note}>ใช้เครื่องมือผ่านบัญชี · จำนวนลิงก์และสถิติขึ้นกับสิทธิ์ที่ใช้งาน</p>
        </div>
        <div className={styles.linkPreview} aria-label="ตัวอย่างการจัดลิงก์ เป็นภาพประกอบ ไม่ใช่ข้อมูลบัญชี">
          <div className={styles.previewTop}><span><span className="ms" aria-hidden="true">link</span> YOUR LINKS</span><small>ตัวอย่าง</small></div>
          <p className={styles.previewLabel}>หนึ่งลิงก์ ไปต่อได้ทุกช่องทาง</p>
          <div className={styles.linkCard}>
            <span className={styles.linkIcon}><span className="ms" aria-hidden="true">north_east</span></span>
            <div><strong>หน้าที่อยากให้คนพบ</strong><code>vibelinkth.com/go/your-link</code></div>
          </div>
          <div className={styles.destination}><span aria-hidden="true">↳</span> example.com/your-page</div>
          <div className={styles.channels}><span>LINE</span><span>Instagram</span><span>QR Code</span></div>
          <div className={styles.utm}><span>UTM CAMPAIGN</span><code>your-campaign</code><span className="ms" aria-hidden="true">sell</span></div>
          <p className={styles.previewFoot}>จัดการปลายทาง · ติดแท็กแคมเปญ · ดูสถิติคลิก</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="links-features">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>LINK. SHARE. GROW.</p><h2 id="links-features">ลิงก์เล็ก ๆ ที่จัดการต่อได้</h2></div>
        <div className={styles.features}>{features.map(feature => <article className={styles.feature} key={feature.title}>
          <span className="ms" aria-hidden="true">{feature.icon}</span><h3>{feature.title}</h3><p>{feature.description}</p>
        </article>)}</div>
      </section>

      <section className={styles.stepsSection} aria-labelledby="links-start">
        <div><p className={styles.eyebrow}>เริ่มใช้งาน</p><h2 id="links-start">จาก URL ยาว ๆ<br />เป็นลิงก์พร้อมแชร์</h2><p>ใช้กับลิงก์เว็บไซต์ โปรไฟล์ หรือหน้าบริการที่คุณมีสิทธิ์แชร์</p></div>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>เข้าสู่บัญชี</h3><p>สมัครหรือเข้าสู่ระบบ แล้วเปิด Links</p></div></li>
          <li><span>02</span><div><h3>สร้างและจัดการลิงก์</h3><p>วาง URL ปลายทาง และเพิ่ม UTM เมื่อต้องการแยกแคมเปญ</p></div></li>
          <li><span>03</span><div><h3>แชร์ แล้วกลับมาดูผล</h3><p>แชร์ลิงก์หรือใช้เป็นปลายทาง QR แล้วดูสถิติคลิกตามสิทธิ์บัญชี</p></div></li>
        </ol>
      </section>

      <section className={styles.qrSection} aria-labelledby="links-qr">
        <div className={styles.qrIcon}><span className="ms" aria-hidden="true">qr_code_2</span></div>
        <div><p className={styles.eyebrow}>LINKS + QR</p><h2 id="links-qr">จากลิงก์ สู่การสแกน</h2><p>นำลิงก์สั้นไปสร้าง QR สำหรับป้าย นามบัตร หรือสื่อของคุณ หากลิงก์รองรับการแก้ปลายทางและยังใช้งานได้ คุณจัดการปลายทางผ่าน Links ได้โดยไม่ต้องเปลี่ยนภาพ QR</p><p className={styles.qrNote}>Static QR ที่ฝัง URL ตรงต้องสร้างภาพใหม่เมื่อเปลี่ยน URL และไม่เก็บยอดสแกนด้วยตัวเอง สถิติคลิกลิงก์ไม่เท่ากับจำนวนคนหรือจำนวนสแกนที่ไม่ซ้ำ</p><Link className={styles.textLink} href="/qr" prefetch={false}>สร้าง QR Code ฟรี ใส่โลโก้ โหลด PNG / SVG <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className={styles.faqSection} aria-labelledby="links-faq">
        <div><p className={styles.eyebrow}>ก่อนเริ่มแชร์</p><h2 id="links-faq">คำถามที่พบบ่อย</h2></div>
        <div className={styles.faq}>
          <details><summary>ลิงก์สั้นกับหน้ารวมลิงก์ต่างกันอย่างไร?</summary><p>ลิงก์สั้นพาไปยัง URL ปลายทางที่กำหนด ส่วนหน้ารวมลิงก์เป็นหน้าโปรไฟล์ที่มีหลายลิงก์ให้ผู้เข้าชมเลือกเปิด เหมาะกับช่อง Bio ที่ใส่ลิงก์ได้จำกัด</p></details>
          <details><summary>ต้องสมัครก่อนสร้างลิงก์หรือไม่?</summary><p>การจัดการลิงก์สั้น หน้ารวมลิงก์ และสถิติใช้ผ่านบัญชี จำนวนลิงก์และช่วงข้อมูลสถิติขึ้นกับสิทธิ์ของบัญชี ส่วนการสร้าง Static QR สำหรับ URL พื้นฐานเปิดให้ใช้ได้ที่หน้า QR</p></details>
          <details><summary>UTM บอกอะไรได้บ้าง?</summary><p>UTM เป็นแท็กระบุแหล่งที่มา ช่องทาง และแคมเปญที่คุณกำหนดให้ลิงก์ ช่วยแยกการแชร์เมื่อใช้ร่วมกับสถิติที่รองรับ แต่ไม่ได้ยืนยันยอดขายหรือค่าคอมมิชชันด้วยตัวเอง</p></details>
          <details><summary>ใช้ลิงก์สั้นเป็นปลายทาง QR ได้ไหม?</summary><p>ได้ โดยสร้าง QR จาก URL ลิงก์สั้นของคุณ แล้วทดสอบสแกนไฟล์จริงก่อนพิมพ์หรือเผยแพร่ การเปิดปลายทางยังขึ้นกับสถานะของลิงก์และเว็บไซต์ปลายทาง</p></details>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="links-cta">
        <p className={styles.eyebrow}>YOUR NEXT LINK</p><h2 id="links-cta">พร้อมให้ลิงก์ของคุณ<br /><span>ไปต่อแล้วหรือยัง?</span></h2>
        <Link className={styles.primary} href={PRODUCTS.links.route} prefetch={false}>เปิด Links <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
    <footer className={styles.footer}><p><strong>{BRAND.name}</strong><br />{BRAND.tagline}</p><nav aria-label="ข้อมูลเว็บไซต์"><Link href="/privacy">ความเป็นส่วนตัว</Link><Link href="/terms">เงื่อนไข</Link><Link href={BRAND.marketingUrl}>หน้าแรก</Link></nav></footer>
  </div>;
}
