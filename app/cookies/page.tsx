import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata = {
  title: "นโยบายคุกกี้ — VibeLink",
  description: "นโยบายการใช้คุกกี้และเทคโนโลยีจัดเก็บข้อมูลของ VibeLink",
};

const contact = process.env.COMPANY_CONTACT_EMAIL ?? "hello@vibelinkth.com";

export default function CookiesPage() {
  return (
    <LegalDoc title="นโยบายคุกกี้" updatedAt="21 กันยายน 2569">
      <p>
        VibeLink ใช้คุกกี้และพื้นที่จัดเก็บในเบราว์เซอร์เท่าที่จำเป็นต่อการทำงานของบริการ
        เราไม่มีคุกกี้โฆษณาหรือติดตามข้ามเว็บไซต์
      </p>

      <h2>1. คุกกี้ที่จำเป็น (จำเป็น)</h2>
      <ul>
        <li>
          <strong>authjs.session-token</strong> — ใช้จำสถานะการเข้าสู่ระบบ หมดอายุเมื่อออกจากระบบหรือครบกำหนดเซสชัน
        </li>
        <li>
          <strong>authjs.csrf-token</strong> — ใช้ป้องกันการโจมตี CSRF
        </li>
      </ul>
      <p>คุกกี้เหล่านี้จำเป็นต่อการให้บริการ และไม่สามารถปิดได้หากต้องการใช้บริการ</p>

      <h2>2. พื้นที่จัดเก็บในเบราว์เซอร์ (localStorage)</h2>
      <ul>
        <li>
          <strong>vibelink-consent</strong> — บันทึกว่าคุณตอบรับแบนเนอร์คุกกี้แล้ว เพื่อไม่ให้แสดงซ้ำ
        </li>
      </ul>

      <h2>3. การจัดการคุกกี้</h2>
      <p>
        คุณสามารถลบหรือบล็อกคุกกี้ได้ผ่านการตั้งค่าเบราว์เซอร์ แต่การบล็อกคุกกี้ที่จำเป็นอาจทำให้ไม่สามารถเข้าสู่ระบบได้
      </p>

      <h2>4. การเปลี่ยนแปลง</h2>
      <p>เราอาจปรับปรุงนโยบายนี้เมื่อมีการเพิ่มฟีเจอร์ใหม่ และจะแจ้งบนเว็บไซต์</p>

      <p>
        คำถามเกี่ยวกับคุกกี้ ติดต่อ <a href={`mailto:${contact}`}>{contact}</a>
      </p>
    </LegalDoc>
  );
}
