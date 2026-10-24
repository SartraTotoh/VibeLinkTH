# Vibe QR Studio — Decisions (ADR)

> บันทึกการตัดสินใจที่สำคัญ พร้อมเหตุผลและทางเลือกที่ตัดออก
> วันที่: 2026-10-24

---

## ADR-001: ทำ QR Studio เป็น client-side renderer

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** Workers ไม่มี Canvas, CPU limit จำกัด และ prompt ห้ามส่ง URL ผู้ใช้ออกไป third-party โดยไม่จำเป็น

**ตัดสินใจ:** สร้าง QR matrix และ render pixel buffer/SVG ใน browser ทั้งหมด; server ทำแค่ validate URL/UTM และอ่านข้อมูลเจ้าของ

**ผลลัพธ์:**

- ไม่มี server cost ต่อการ generate/export
- ไม่มีไฟล์ผู้ใช้ถูกอัปโหลด
- วัดผลด้วย decode จากภาพจริงฝั่ง client ก่อน export
- ข้อจำกัด: ไม่สามารถ batch/server-render ได้ใน MVP (Phase 2)

---

## ADR-002: ไม่เพิ่มตาราง `QRAsset` และไม่ทำ migration

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** prompt เสนอ model QRAsset แบบ conceptual แต่ MVP ยังไม่ต้องบันทึก/แชร์/แก้ไข QR ภายหลัง; การเพิ่มตารางต้องผ่าน Approval Gate ข้อ 2 และเพิ่ม scope

**ตัดสินใจ:** ไม่แก้ `prisma/schema.prisma`; QR ทั้งหมดเป็น stateless (สร้างใหม่ได้ทุกครั้ง)

**ผลลัพธ์:**

- ไม่มี migration, ไม่มีความเสี่ยงกับ production data
- ถ้าต้องการบันทึกภายหลัง → Phase 2 + ขออนุมัติ

---

## ADR-003: ใช้ `qrcode` เดิม + renderer ของเราเอง

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** `qrcode@1.5.4` encode ได้และคืน matrix ผ่าน `create()` แต่ไม่รองรับ pattern/eye/logo/frame ที่ต้องการ; การติดตั้ง library QR styling ใหม่จะเพิ่ม bundle และซ้ำความสามารถ

**ตัดสินใจ:** ใช้ `qrcode.create()` เป็นแหล่งความจริงของ matrix แล้ว render เองทั้ง PNG (RGBA) และ SVG

**ผลลัพธ์:**

- ควบคุม quiet zone/ECC/pattern ได้ 100%
- test decode จาก pixel buffer เดียวกับที่ใช้จริง
- ไม่เพิ่ม dependency ฝั่ง encode

---

## ADR-004: เพิ่ม `jsqr` เพื่อ decode จริง (local-only)

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** repo ไม่มี decoder; การอ้างว่า "สแกนได้" จากการดูภาพหรือสร้างไฟล์ไม่เพียงพอตาม prompt ข้อ 15

**ตัดสินใจ:** เพิ่ม `jsqr@1.4.0` (Apache-2.0) เป็น dependency, dynamic import เฉพาะตอน health check/เทสต์; ใช้ `pngjs` (มีอยู่แล้วใน tree) ใน Node test

**ผลลัพธ์:**

- มี decode evidence จากไฟล์จริง
- ไม่มีการเรียก network ภายนอก
- bundle เพิ่มเฉพาะเมื่อผู้ใช้กดตรวจ (dynamic import)

**ทางเลือกที่ตัดออก:** BarcodeDetector API (desktop support ไม่เสถียร), zxing-wasm (หนักกว่า), third-party decode API (ห้าม)

---

## ADR-005: QR payload ของ Blink/Pank ต้องเป็น dark-on-light

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** แบรนด์ Blink เป็น lime และ Pank เป็น pink; ถ้าใช้ lime/pink เป็น foreground บนพื้นดำ จะเป็น inverted QR ซึ่งสแกนได้บ้างแต่เสี่ยงกับกล้อง/เครื่องพิมพ์รุ่นเก่า

**ตัดสินใจ:**

- Blink: foreground เขียวเข้ม `#14210a` บนพื้น lime อ่อน `#f2ffd6`; accent lime ใช้ที่ frame/glow
- Pank: foreground plum เข้ม `#2b0a2b` บนพื้น pink อ่อน `#fff0fb`; accent pink/violet ที่ frame
- Print Safe: `#000000` บน `#ffffff`
- Custom color: ต้องผ่าน contrast ≥4.5 (warn 3–4.5, fail <3)

**ผลลัพธ์:** ได้ brand feel โดยไม่แลกความสามารถในการสแกน

---

## ADR-006: Quiet zone ขั้นต่ำ 4 modules และ logo สูงสุด 18%

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** modal เดิมใช้ `margin: 1` ซึ่งไม่ผ่านคำแนะนำมาตรฐาน; prompt บังคับรักษา quiet zone และจำกัด logo

**ตัดสินใจ:**

- margin ขั้นต่ำ 4 modules (ไม่ให้ผู้ใช้ลดต่ำกว่านี้)
- logo ratio (ด้านlogo / ด้าน QR) ≤18%; แนะนำ ≤15%
- มี logo → บังคับ ECC H
- Decode จากภาพที่มี logo จริงก่อนอนุญาต export

---

## ADR-007: ไม่รับ SVG logo จากผู้ใช้

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** SVG ผู้ใช้สามารถฝัง `<script>`, external reference, หรือ payload อื่น; prompt บังคับ sanitize/prevent XSS

**ตัดสินใจ:** รับเฉพาะ PNG/JPEG/WebP; ตรวจ MIME + ขนาด ≤512KB + มิติ ≤1024px; วาดลง canvas แล้ว re-encode เป็น PNG ก่อนใช้ (ตัด metadata/script ทั้งหมด)

**ผลลัพธ์:** SVG export ของเราปลอดภัยเพราะสร้างจากข้อมูลที่ควบคุมเอง; ข้อความ CTA ถูก escape

---

## ADR-008: Public tool ที่ `/qr` แบบไม่ต้องล็อกอิน

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** QR Studio ต้องเป็น mass feature สำหรับ funnel; การบังคับล็อกอินจะลดการทดลอง; แต่ Vibe Page/Booking/Short Link ต้องใช้ข้อมูลเจ้าของ

**ตัดสินใจ:**

- `/qr` เป็นหน้า static/public ใช้ URL ตรงได้ทันที
- ตัวเลือก Vibe Page/Booking Page/Short Link โหลดจาก `/api/qr/destinations` เมื่อมี session; ถ้า 401 → ซ่อนพร้อมข้อความชวนล็อกอิน
- การสร้าง short link ใช้ `/api/links` เดิม (rate limit/quota/plan)

**ผลลัพธ์:** E2E ทดสอบได้โดยไม่ต้องมี DB; ผู้ใช้匿名ยังได้ประโยชน์; ไม่มีข้อมูลรั่ว

---

## ADR-009: Animation เป็น CSS รอบ canvas เท่านั้น

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** prompt อนุญาต animation รอบ QR แต่ห้ามขยับ module/เปลี่ยน data ต่อเฟรม และห้าม export ถ้า decode ไม่ผ่านทุกเฟรม

**ตัดสินใจ:**

- ใช้ CSS `box-shadow`, `transform`, gradient motion กับ wrapper/frame/sticker/CTA
- canvas QR อยู่นิ่ง; ไม่มี JS รีเฟรมข้อมูล
- default ปิด animation; เปิดได้ด้วย toggle
- `prefers-reduced-motion` ปิดอัตโนมัติ
- ไม่มี animated export ใน MVP

---

## ADR-010: Health Check ใช้ชื่อ "Scan Health" และอธิบายได้

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** prompt ห้ามเรียกคะแนนนี้ว่า SEO Score / Conversion Score

**ตัดสินใจ:** ใช้ `Scan Health Check` + รายการ pass/warn/fail ที่มีเหตุผลและค่าที่วัดได้; ไม่มีตัวเลขคะแนนรวมที่สื่อว่าเป็น SEO/Conversion

---

## ADR-011: ไม่แตะ `/go` หรือ tracking เดิม

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** การเปลี่ยน redirect/tracking อาจกระทบลิงก์ผู้ใช้จริง (Approval Gate ข้อ 9)

**ตัดสินใจ:** QR ที่เป็น short link ชี้ `/go/[slug]` ตามเดิม; การนับ scan = click ที่ `/go`; QR ที่เป็น URL ตรงไม่มีการวัด (บอกผู้ใช้ตามจริง)

---

## ADR-012: UTM validation อยู่ที่ server endpoint ใหม่ (ไม่แตะ DB)

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** UTM builder เดิมไม่มี validation เข้ม; QR payload ผิดพลาดแก้ภายหลังไม่ได้

**ตัดสินใจ:** `POST /api/qr/validate-destination` ตรวจ:

- scheme http/https เท่านั้น
- ไม่มี credentials ใน URL
- ความยาว ≤2048
- UTM keys อนุญาตเฉพาะ 5 ตัว + `ref`
- ค่า UTM ≤80 ตัวอักษร, ไม่มีอักขระควบคุม
- rate limit 60/min ต่อ user/IP
- ไม่ fetch URL (ไม่มี SSRF), ไม่ log URL เต็ม

**ผลลัพธ์:** client ใช้ URL ที่ผ่าน validation ในการสร้าง QR; server เป็น authority ของรูปแบบข้อมูล

---

## ADR-013: ไม่ใช้ `next/image` หรือ canvas ฝั่ง server

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** ต้องรองรับ Cloudflare Workers และไม่เพิ่ม native dependency

**ตัดสินใจ:** ใช้ `<canvas>` DOM ฝั่ง client เท่านั้น; test ใช้ pixel buffer + pngjs; SVG สร้างเอง

---

## ADR-014: ชื่อไฟล์และ metadata

**สถานะ:** ตัดสินใจแล้ว

**ตัดสินใจ:** ไฟล์ชื่อ `vibelink-qr-<host>-<yyyyMMdd>.png|svg` โดย sanitize เฉพาะ `[a-z0-9-]`; ไม่มีข้อมูลผู้ใช้/อีเมลในชื่อไฟล์; ไม่มี metadata ซ่อน

---

## ADR-015: ไม่เพิ่ม environment variable

**สถานะ:** ตัดสินใจแล้ว

**บริบท:** Approval Gate ข้อ 3 ห้ามสร้าง/แก้ env จริง

**ตัดสินใจ:** ใช้ `APP_URL`/`NEXT_PUBLIC_SITE_URL`/`SHORT_LINK_URL` ที่มีอยู่; ถ้าไม่มีให้ fallback `http://localhost:3000` เฉพาะ dev; ไม่มี secret ใหม่
