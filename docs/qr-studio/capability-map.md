# Vibe QR Studio — Capability Map

> สถานะของแต่ละ capability หลังการสำรวจ repo จริง (2026-10-24)
> ใช้ร่วมกับ `inspection.md` และ `implementation-plan.md`

สถานะที่ใช้:

| สถานะ | ความหมาย |
|---|---|
| `existing-and-reusable` | มีอยู่ ใช้ได้เลยผ่าน API/utility เดิม |
| `existing-but-needs-adapter` | มีอยู่ แต่ต้องห่อ adapter/แก้ interface เพื่อใช้ใน QR Studio |
| `new-mvp` | ยังไม่มี ต้องสร้างใหม่ใน MVP นี้ |
| `phase-2` | ยังไม่ทำรอบนี้ |
| `not-approved` | ต้องขออนุมัติก่อน หรือห้ามทำ |

---

## 1. Destination Layer

| Capability | สถานะ | หลักฐาน / หมายเหตุ |
|---|---|---|
| URL ปลายทาง (http/https) | `existing-and-reusable` | `normalizeDestination()` ใน `lib/links.ts` อนุญาตเฉพาะ http/https |
| Short Link สร้างใหม่ | `existing-and-reusable` | `POST /api/links` ตรวจ plan/quota/slug/rate limit ครบ |
| Short Link ที่มีอยู่ | `existing-and-reusable` | `GET /api/links` (user-scoped) |
| Redirect authority | `existing-and-reusable` | `GET /go/[slug]` อ่าน DB เท่านั้น + บันทึก `LinkEvent` |
| Vibe Page URL | `existing-but-needs-adapter` | มี `User.vibeSlug` + `/vibe/[slug]`; ต้องมี route อ่านค่าให้ UI |
| Booking Page URL | `existing-but-needs-adapter` | มี `ServicePage.slug/isPublished` + `/book/[slug]`; ต้องมี route อ่านค่า |
| Workspace isolation | `not-approved` (ไม่มีในระบบ) | ระบบเดิมเป็น user-scoped; ห้ามสร้าง Workspace ใหม่ |
| Custom domain / DNS | `not-approved` | Approval Gate ข้อ 1 |

## 2. Tracking Layer

| Capability | สถานะ | หลักฐาน / หมายเหตุ |
|---|---|---|
| UTM query params | `existing-and-reusable` | `utm-builder-modal.tsx` เติม `utm_*` + `ref=vibelink` ฝั่ง client |
| Campaign record | `existing-and-reusable` | `Campaign` model + `/api/campaigns` |
| Link click analytics | `existing-and-reusable` | `LinkEvent` จาก `/go` |
| QR scan analytics แยก | `phase-2` | ยังไม่มี; ต้องออกแบบ event ใหม่ + consent |
| GA4 consent-first | `existing-and-reusable` | `readConsent`/`gaEvent`; ID ว่าง = ปิด |
| UTM validation เข้ม | `new-mvp` | ไม่มีในระบบเดิม; เพิ่ม validator ฝั่ง server สำหรับ payload ที่จะใส่ QR |

## 3. QR Data Layer

| Capability | สถานะ | หลักฐาน / หมายเหตุ |
|---|---|---|
| QR encode (matrix) | `existing-and-reusable` | `qrcode@1.5.4` มี `create()` คืน `modules.size/data` |
| QR PNG พื้นฐาน | `existing-and-reusable` | `link-qr-modal.tsx` ใช้ `toDataURL` (แต่ margin 1 = quiet zone ไม่ผ่าน) |
| QR SVG | `new-mvp` | `qrcode` ทำ SVG ได้ แต่ไม่รองรับ logo/frame/pattern ที่ต้องการ |
| Custom pattern/eye | `new-mvp` | ต้อง render จาก matrix เอง |
| Error correction selection | `new-mvp` | กำหนด policy M/H ตามการมี logo |
| Decode/verify | `new-mvp` | ไม่มี decoder ใน repo; เพิ่ม `jsqr` (local, ไม่ส่งข้อมูลออก) |
| Quiet zone enforcement | `new-mvp` | บังคับ ≥4 modules ทุก export |
| Short Link payload | `existing-and-reusable` | ใช้ `shortUrl` จาก `/api/links` |
| Dynamic QR (แก้ปลายทางภายหลัง) | `existing-and-reusable` ผ่าน short link | ไม่ต้องสร้าง dynamic QR ใหม่ |
| Animated QR modules | `not-approved` | ห้ามเด็ดขาดตาม prompt |

## 4. Presentation Layer

| Capability | สถานะ | หลักฐาน / หมายเหตุ |
|---|---|---|
| Foreground/background color | `new-mvp` | ต้องมี contrast validation |
| Blink / Pank / Print Safe presets | `new-mvp` | สี brand มีใน `globals.css` (`--primary`, `--secondary`) |
| Logo กลาง QR | `new-mvp` | ต้อง cap ≤18%, re-encode raster, reject SVG |
| Frame | `new-mvp` | ต้องอยู่นอก quiet zone |
| CTA text | `new-mvp` | ต้องไม่ทับ QR + escape ใน SVG |
| Pattern/eye แบบจำกัด | `new-mvp` | square/rounded/dots + eye square/rounded |
| Preview บนขาว/มืด/social card | `new-mvp` | ใช้ canvas เดียวกัน |
| Animation รอบ QR | `new-mvp` | CSS-only, ไม่แตะ canvas, ไม่ export |
| `prefers-reduced-motion` | `existing-and-reusable` | global override มีอยู่แล้ว + toggle ปิด animation |
| Keyboard/focus/ARIA | `new-mvp` | ต้องทดสอบ |
| Thai-first copy | `new-mvp` | ใช้ copy module ของ feature + `useLang()` |

## 5. Export

| Capability | สถานะ | หลักฐาน / หมายเหตุ |
|---|---|---|
| PNG download | `new-mvp` (ต่อยอดจาก `qrcode`) | client canvas → blob |
| SVG download | `new-mvp` | generated SVG + escaped text |
| PDF/EPS/GIF/MP4/WebM | `phase-2` | ไม่อยู่ใน MVP |
| Server-side render | `not-approved` | ไม่มี canvas บน Workers + เพิ่ม cost |
| Object storage สำหรับไฟล์ | `not-approved` (ยังไม่ต้อง) | ไม่มี binding; เพิ่ม cost/คุม lifecycle |
| Filename/metadata | `new-mvp` | sanitize ชื่อไฟล์ |

## 6. API / Data

| Capability | สถานะ | หลักฐาน / หมายเหตุ |
|---|---|---|
| `POST /api/qr/validate-destination` | `new-mvp` | server-side scheme allowlist + UTM validation + rate limit; ไม่แตะ DB |
| `GET /api/qr/destinations` | `new-mvp` | อ่าน Vibe Page/Booking Page/Short Link ของเจ้าของเท่านั้น |
| `POST /api/qr/preview` | `not-approved` (ไม่จำเป็น) | preview ทำฝั่ง client; ไม่มีเหตุให้เพิ่ม server cost |
| `POST /api/qr/health-check` | `not-approved` (ไม่จำเป็น) | decode ทำฝั่ง client; ถ้าทำ server ต้องมี decoder + CPU |
| `POST /api/qr/export` | `not-approved` (ไม่จำเป็น) | client-side เท่านั้น |
| `QRAsset` CRUD | `phase-2` | ต้อง migration + approval |
| Migration | `not-approved` | Approval Gate ข้อ 2 |
| Secret ใหม่ | `not-approved` | Approval Gate ข้อ 3 |

## 7. Security / Abuse

| Capability | สถานะ | หลักฐาน / หมายเหตุ |
|---|---|---|
| Scheme allowlist | `existing-and-reusable` | `normalizeDestination()` + `normalizeDestination` ใช้ซ้ำได้ |
| Open redirect prevention | `existing-and-reusable` | `/go` อ่าน DB; ไม่รับ URL จาก client |
| SSRF prevention | `new-mvp` | **ไม่ fetch URL ใด ๆ** (ไม่มี title preview) → ตัดความเสี่ยง |
| Rate limit สร้าง link | `existing-and-reusable` | `rateLimitDb` ใน `/api/links` |
| Rate limit validate QR | `new-mvp` | `rateLimitDb(req, "qr:validate", 60, 60_000)` |
| Logo upload validation | `new-mvp` | MIME + magic-ish check + size + dimensions + canvas re-encode |
| SVG sanitization | `new-mvp` | ไม่รับ SVG ผู้ใช้; SVG export สร้างเอง |
| XSS ใน CTA | `new-mvp` | escape XML + จำกัดความยาว |
| Secret/PII logging | `existing-and-reusable` | ไม่ log payload; validate endpoint ไม่ log URL |
| Consent analytics | `existing-and-reusable` | `gaEvent()` เคารพ consent v2 |

## 8. สิ่งที่ **ไม่** ทำในรอบนี้ (และเหตุผล)

| สิ่งที่ตัดออก | เหตุผล |
|---|---|
| Wi-Fi / vCard / PDF / Payment / Event / Geo / Deep link QR | อยู่นอก MVP ตาม prompt |
| Personalized QR | ต้องมี auth + data model + consent เพิ่ม |
| Animated export | ต้อง decode ทุกเฟรม + encoder + storage |
| Workspace/Team | ไม่มีในระบบเดิม |
| Third-party QR API | ส่ง URL ผู้ใช้ออกนอก + cost + privacy |
| แก้ `/go` หรือ tracking เดิม | อาจกระทบลิงก์ผู้ใช้ = Approval Gate ข้อ 9 |
| เพิ่ม QRAsset table | migration = Approval Gate ข้อ 2 |
| GA4 property ใหม่ | ต้องให้ผู้ใช้สร้าง/อนุมัติ |
