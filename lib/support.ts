import type { Lang } from "@/lib/i18n";

export type SupportRuleSeed = {
  enabled?: boolean;
  priority: number;
  keywords: string;
  replyTh: string;
  replyEn: string;
  faqTh: string;
  faqEn: string;
  category: string;
};

/**
 * Default Auto Message rules — popular VibeLinkTH questions.
 * Admin can edit/disable/reorder later from Mission Control; these are the
 * starting point so member support answers instantly without config.
 */
export const DEFAULT_RULES: SupportRuleSeed[] = [
  {
    priority: 10,
    category: "links",
    keywords: "สร้างลิงก์,สร้างลิ้งก์,link,สร้าง short link,shortlink,วิธีสร้าง",
    faqTh: "สร้างลิงก์สั้นอย่างไร?",
    faqEn: "How do I create a short link?",
    replyTh:
      "เข้าไปที่หน้าควบคุมลิงก์ (เมนู หน้าลิงก์) แล้ววาง Destination URL ลงในฟอร์มด้านบน กด “สร้างลิงก์” — ระบบจะย่อให้อัตโนมัติพร้อมคัดลอกลิงก์สั้นใช้แชร์ได้ทันที",
    replyEn:
      "Open the link dashboard (My links), paste a Destination URL into the top form, and hit “Create link” — the short link is generated and ready to copy.",
  },
  {
    priority: 20,
    category: "links",
    keywords: "ใช้งานไม่ได้,ไม่ขึ้น,เปิดไม่ได้,ลิงก์พัง,click ไม่ขึ้น,not working,broken,dead link,404",
    faqTh: "ลิงก์ของฉันเปิดไม่ได้ / คลิกไม่ขึ้น",
    faqEn: "My link is broken / not opening",
    replyTh:
      "ลองเช็ค 3 อย่างก่อนครับ: (1) สถานะลิงก์ต้องเป็น “กำลังทำงาน” ไม่ใช่หยุดชั่วคราว (2) Destination URL ต้องเว้น http:// หรือ https:// ไว้หน้าแรก (3) ถ้าลิงก์หมดอายุ (มีวันหมดอายุ) ต้องอัปเดตครับ — ถ้ายังไม่ได้สแกนกรณีนี้ แอดมินจะช่วยนะครับ",
    replyEn:
      "Check 3 things: (1) the link status must be Active, not Paused (2) the destination URL should start with http:// or https:// (3) an expired link (with an expiry date) needs updating — if none of these fit, our team will pick this up.",
  },
  {
    priority: 30,
    category: "pricing",
    keywords: "ราคา,อัปเกรด,แพ็กเกจ,โปร,plan,price,pricing,upgrade,creator,plus",
    faqTh: "แพ็กเกจมีอะไรบ้าง ราคาเท่าไหร่?",
    faqEn: "What plans do you have and how much do they cost?",
    replyTh:
      "ปัจจุบันมี 3 แพ็กเกจครับ: Free (ฟรี 10 ลิงก์ สถิติ 7 วัน), Creator ฿199/เดือน (500 ลิงก์ สถิติ 90 วัน ตั้ง slug เอง โอเพ่นแอปทุกแพลตฟอร์ม) และ Creator Plus — อัปเกรดได้จากปุ่มในหน้าควบคุมลิงก์ ชำระผ่าน Stripe ยกเลิกได้ทุกเมื่อ",
    replyEn:
      "We have 3 plans: Free (10 links, 7-day stats), Creator ฿199/mo (500 links, 90-day stats, custom slugs, in-app deep links), and Creator Plus. Upgrade from your dashboard — payment is via Stripe and you can cancel anytime.",
  },
  {
    priority: 40,
    category: "billing",
    keywords: "ชำระ,จ่ายเงิน,บิล,ใบเสร็จ,ตัดเงิน,เรียกเก็บ,payment,bill,invoice,charge,stripe",
    faqTh: "ชำระเงิน / ดูใบเสร็จอย่างไร?",
    faqEn: "How do I pay or see my invoices?",
    replyTh:
      "การจ่ายเงินเป็นไปผ่าน Stripe อย่างปลอดภัยครับ — กด “อัปเกรด” ในหน้าควบคุมลิงก์เพื่อเลือกแพ็กเกจ ส่วนยกเลิก/แก้บัตร/ดูใบเสร็จ กด “จัดการการชำระเงิน” ในหน้า ตั้งค่า ได้เลยครับ",
    replyEn:
      "Payments go through Stripe securely. Click “Upgrade” on your dashboard to pick a plan; to cancel, update your card, or view invoices, open “Manage billing” in Settings.",
  },
  {
    priority: 50,
    category: "billing",
    keywords: "ยกเลิก,not renew,เลิกใช้,ลบสมาชิก,cancel,unsubscribe",
    faqTh: "ยกเลิกสมาชิก / ต่ออายุอัตโนมัติอย่างไร?",
    faqEn: "How do I cancel my subscription / auto-renewal?",
    replyTh:
      "ยกเลิกได้เองตลอด 24 ชม. ครับ ผ่าน “จัดการการชำระเงิน” ที่หน้า ตั้งค่า → Stripe (ไม่ต้องติดต่อทีมงาน) — สิทธิ์จะอยู่จนครบระยะเวลาที่จ่ายไว้ แล้วตัดต่อไปอัตโนมัติเมื่อเดินหน้า",
    replyEn:
      "You can cancel anytime from “Manage billing” in Settings (via Stripe) — no need to contact us. You keep access until the paid period ends, then auto-renewal stops.",
  },
  {
    priority: 60,
    category: "account",
    keywords: "ยืนยันอีเมล,ไม่ได้รับอีเมล,verify email,verification,confirm email",
    faqTh: "ไม่ได้รับอีเมลยืนยันบัญชี",
    faqEn: "I haven't received my verification email",
    replyTh:
      "ลองเช็คกล่องจดหมาย + โฟลเดอร์สแปม/โปรโมชันก่อนครับ ถ้ายังไม่เจอ เข้าสู่ระบบแล้วจะมีปุ่ม “ส่งลิงก์อีกครั้ง” — ใช้ได้แค่ลิงก์ล่าสุด ลิงก์ก่อนหน้าจะหมดอายุ",
    replyEn:
      "Check your inbox plus spam/promotions. If it's still missing, log in and use the “Resend the link” button — only the latest link works, older ones expire.",
  },
  {
    priority: 70,
    category: "account",
    keywords: "ลืมรหัสผ่าน,reset password,forgot,เปลี่ยนรหัส,ตั้งรหัสใหม่",
    faqTh: "ลืมรหัสผ่านจะทำอย่างไร?",
    faqEn: "I forgot my password",
    replyTh:
      "กด “ลืมรหัสผ่าน?” ที่หน้าเข้าสู่ระบบ ใส่บัญชีอีเมล แล้วเราจะส่งลิงก์ตั้งรหัสผ่านใหม่ (หมดอายุ 1 ชม.) ไปให้ครับ — ตรวจกล่องจดหมายและสแปมด้วยนะครับ",
    replyEn:
      "Hit “Forgot password?” on the login page, enter your account email, and we'll send a reset link (valid 1 hour). Check your inbox and spam folders.",
  },
  {
    priority: 80,
    category: "account",
    keywords: "เปลี่ยนอีเมล,เปลี่ยนชื่อ,change email,change name,display name",
    faqTh: "เปลี่ยนอีเมล / ชื่อที่แสดง?",
    faqEn: "Change my email / display name?",
    replyTh:
      "ตั้งค่าชื่อที่แสดงได้เองที่หน้า ตั้งค่า ครับ ส่วนการเปลี่ยนอีเมลบัญชี ติดต่อทีมงานได้ทางแชทนี้เพื่อยืนยันตัวตนแล้วดำเนินการให้ครับ",
    replyEn:
      "You can change your display name in Settings. To change the account email, message our team here so we can verify you first.",
  },
  {
    priority: 90,
    category: "privacy",
    keywords: "ลบบัญชี,ลบข้อมูล,pdpa,สิทธิ์,privacy,delete account,ลบทิ้ง,ส่งออกข้อมูล",
    faqTh: "ลบบัญชี / ส่งออกข้อมูลของฉัน (PDPA)",
    faqEn: "Delete my account / export my data (PDPA)",
    replyTh:
      "ทำได้เองที่หน้า ตั้งค่า → “ความเป็นส่วนตัวและความปลอดภัย” ครับ ทั้งส่งออกข้อมูลเป็น JSON และลบบัญชีถาวร (ลบทุกอย่างรวมลิงก์และสถิติ ย้อนกลับไม่ได้)",
    replyEn:
      "Do it yourself under Settings → Privacy & security: export your data as JSON, or permanently delete your account (removes everything including links and stats — irreversible).",
  },
  {
    priority: 100,
    category: "analytics",
    keywords: "สถิติ,คลิกไม่ขึ้น,นับคลิก,analytics,stats,clicks,ยอดคลิก",
    faqTh: "ทำไมยอดคลิก / สถิติไม่เพิ่ม",
    faqEn: "Why aren't my clicks / stats updating?",
    replyTh:
      "สถิติจะอัปเดตแบบเรียลไทม์ในหน้าควบคุมลิงก์ครับ แต่ Free จะดูย้อนหลังได้ 7 วัน (Creator 90 วัน) — ตรวจช่วงวันที่ในตัวกรองด้วยนะครับ คลิกใหม่มักปรากฏภายในไม่กี่วินาที",
    replyEn:
      "Stats update in real time on your dashboard. Free shows 7 days back, Creator 90 days — check the date range filter. New clicks usually appear within seconds.",
  },
  {
    priority: 110,
    category: "campaigns",
    keywords: "utm,แคมเปญ,campaign,ติดแท็ก,สายวัดผล,tracking",
    faqTh: "การวัดผลแคมเปญ / UTM?",
    faqEn: "Campaign tracking / UTM?",
    replyTh:
      "ใช้เครื่องมือ “สร้าง UTM” ในหน้าควบคุมลิงก์เพื่อติดแท็ก source/medium/campaign ให้ลิงก์ แล้วดูผลแยกตามแคมเปญได้ในแท็บ Analytics ครับ",
    replyEn:
      "Use the “UTM builder” in your dashboard to tag a link with source/medium/campaign, then view performance per campaign on the Analytics tab.",
  },
  {
    priority: 120,
    category: "general",
    keywords: "qr,คิวอาร์,สแกน,scan",
    faqTh: "QR Code ใช้ยังไง?",
    faqEn: "How does the QR Code work?",
    replyTh:
      "กดปุ่ม “QR” บนแถวลิงก์เพื่อแสดงคิวอาร์ที่สแกนแล้วเปิดลิงก์สั้นทันที ใช้แชร์หน้าร้าน/โปสเตอร์ได้ ดาวน์โหลดเป็น PNG ได้ด้วยครับ",
    replyEn:
      "Press “QR” on a link row to open a QR code that scans straight into your short link — great for posters or in-store. You can also download it as PNG.",
  },
];

export const DEFAULT_SETTINGS = {
  autoReplyOn: true,
  faqOn: true,
  greetingTh:
    "สวัสดีครับ ยินดีต้อนรับสู่ VibeLink พิมพ์คำถามได้เลย หรือกดหัวข้อในคำถามยอดฮิตด้านล่าง — ระบบตอบอัตโนมัติทันที ถ้าตอบไม่ได้ทีมงานจะรับเรื่องและตอบกลับโดยเร็ว",
  greetingEn:
    "Hi, welcome to VibeLink — ask your question or tap a popular topic below. Our auto-reply answers instantly. If it can't, our team picks it up and replies soon.",
  noMatchTh:
    "ขอบคุณครับ ระบบอัตโนมัติยังไม่แน่ใจกับข้อความนี้ ทีมงานรับเรื่องแล้ว จะตอบกลับผ่านแชทนี้โดยเร็วที่สุดครับ",
  noMatchEn:
    "Thanks! The auto-reply is unsure about that one — a team member has been notified and will reply to this chat soon.",
  hoursTh: null,
  hoursEn: null,
  emailNotify: false,
};

/**
 * Normalise user text for keyword matching. Lowercases, trims, keeps Thai
 * safely (no stripping of letters; punctuation/comma collapse to spaces).
 */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function keywordList(keywords: string): string[] {
  return keywords
    .split(",")
    .map((k) => normalizeText(k))
    .filter(Boolean);
}

/**
 * Deterministic keyword matcher. Rules are ordered by (priority asc, id asc).
 * Returns the first rule whose ANY keyword appears in the message.
 * Pure function → unit-testable without DB.
 */
export function matchRule<T extends { id: string; enabled: boolean; priority: number; keywords: string }>(
  rules: T[],
  text: string,
): T | null {
  const hay = normalizeText(text);
  if (!hay) return null;
  const ordered = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : 1));
  for (const rule of ordered) {
    const kw = keywordList(rule.keywords);
    if (kw.length === 0) continue;
    if (kw.some((k) => hay.includes(k))) return rule;
  }
  return null;
}

export function ruleReply(rule: { replyTh: string; replyEn: string }, lang: Lang): string {
  return lang === "en" ? rule.replyEn : rule.replyTh;
}

export function ruleFaq(rule: { faqTh: string | null; faqEn: string | null; replyTh: string; replyEn: string }, lang: Lang): string {
  if (lang === "en") return rule.faqEn?.trim() ? rule.faqEn : rule.replyEn;
  return rule.faqTh?.trim() ? rule.faqTh : rule.replyTh;
}

export function ticketPreview(body: string, max = 80): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}