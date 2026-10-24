# Vibe QR Studio — Readability & Accessibility Audit

- วันที่ตรวจ: 24 ตุลาคม 2026
- เป้าหมาย: ตรวจสอบและยกระดับ Readability และ Accessibility ของหน้า `/qr` ให้ข้อความที่มองเห็นได้ทุกตัวมีขนาดอย่างน้อย 14px (Minimum 14px Rule)
- ขอบเขต: ปรับปรุงเฉพาะ CSS/Component ด้านการแสดงผล โดยไม่แตะต้อง QR Logic, QR Payload, Short Link, UTM, Booking, Analytics, Export Behavior หรือ Security Boundary
- กฎดีไซน์: ปฏิบัติตามกฎ `AGENTS.md` อย่างเคร่งครัด (ไร้เส้นขอบมีสี, ใช้ Radial Gradient / Radiant Glow, Icon-first, ปุ่มกลุ่มเดียวกันขยายเต็มพื้นที่)

---

## 1. ผลการตรวจนับ Baseline ก่อนปรับปรุง (Current Inventory)

จากการตรวจสอบไฟล์ `components/qr/qr-studio.module.css`, `components/qr/qr-studio.tsx` และ `app/globals.css` พบองค์ประกอบข้อความที่แสดงผลต่ำกว่า 14px จำนวนมากใน 7 กลุ่มหลัก ดังนี้:

| กลุ่มองค์ประกอบ | Selector / ตำแหน่ง | ขนาดเดิม (px) | ผลกระทบต่อความสามารถในการอ่าน (Readability Impact) |
|---|---|---|---|
| **Header & Hero** | `.hero p` (สโลแกนใต้หัวเรื่อง) | 12px | ตัวเล็กเกินไปสำหรับการอ่านบนมือถือและจอความละเอียดสูง |
| **Step Indicators & Titles** | `.stepIndex` (ป้ายระบุขั้น 01, 02, 03) | 10px | ตัวเลขขั้นมองเห็นยาก อ่านไม่ชัดเจน |
| | `.panelHead h2`, `.previewHead h2`, `.actionHead h2` | 12px | หัวข้อหลักของ Section ควรมีความโดดเด่นตาม Visual Hierarchy |
| **Step 1: Destination** | `.segment` (ปุ่มสลับโหมด URL/Vibe/Booking/Short) | 11.5px | ข้อความบนปุ่มกดหลักเล็กเกินมาตรฐานปุ่มสัมผัส |
| | `.authHint` (ข้อความแจ้งเตือนล็อกอิน) | 11.5px | ผู้ใช้ที่ยังไม่ล็อกอินอ่านคำแนะนำไม่สะดวก |
| | `.page :global(.field) > span` (Label ช่องกรอก) | 10px | ต่ำกว่ามาตรฐาน Accessibility (ควรเป็น 14px) |
| | `.page :global(.field) input, select` (ช่องกรอกและดรอปดาวน์) | 13px | เสี่ยงต่อการโดน iOS Safari ซูมอัตโนมัติ (ต้องการ >= 16px หรืออย่างน้อย 14px) |
| | `.hint` (คำแนะนำใต้ช่องกรอก URL) | 11px | ข้อความช่วยเหลือเล็กเกินไป |
| | `.inlineError` (ข้อความแจ้งเตือนข้อผิดพลาด) | 11.5px | ข้อความ Error สำคัญควรชัดเจนเพื่อลดความผิดพลาดของผู้ใช้ |
| | `.utmToggle` (ปุ่มเปิดแท็บพารามิเตอร์แคมเปญ) | 12px | ข้อความปุ่มไม่สะดุดตา |
| | `.emptyState p` (ข้อความเมื่อไม่พบหน้าปลายทาง) | 11.5px | อ่านไม่ชัดเจน |
| **Step 2: Style & Controls** | `.groupLabel` (ป้ายกำกับกลุ่มควบคุม Preset, Pattern, Eye, Frame, Logo, Size) | 10px | หัวข้อกำกับกลุ่มเล็กจนกลืนไปกับพื้นหลัง |
| | `.presetBtn b` (ชื่อพรีเซ็ต Blink, Pank, Print Safe) | 11.5px | ชื่อพรีเซ็ตอ่านยาก |
| | `.colorField > span` (Label สีหน้าและสีพื้น) | 10px | ป้ายกำกับช่องสีเล็กมาก |
| | `.colorControl code` (รหัส HEX สี) | 11px | ตัวเลขรหัสสีอ่านยาก |
| | `.rangeField > span` (ขนาดโลโก้ %) | 11px | ตัวเลขอัตราส่วนโลโก้อ่านยาก |
| | `.rangeField small` (คำแนะนำขนาดโลโก้) | 10px | คำเตือนเรื่องความจุ QR เล็กเกินไป |
| | `.marginBox b` (ข้อความระยะขอบปลอดภัย) | 11px | ป้ายกำกับระยะขอบปลอดภัยอ่านยาก |
| | `.sizeRow .segment` (ปุ่มเลือกขนาด Export 512, 1024, 2048) | 11.5px | ตัวเลขขนาดภาพบนปุ่มเล็กเกินไป |
| **Step 3: Scan Health** | `.scoreChip`, `.scoreChipWarn`, `.scoreChipFail` (ชิปนับผลการตรวจ) | 10.5px | ตัวเลขนับสถานะสุขภาพ QR เล็กเกินไป |
| | `.printField span` (Label ขนาดพิมพ์) | 10px | ป้ายกำกับช่องกรอกมิลลิเมตรเล็กเกินไป |
| | `.printField input` (ช่องกรอกขนาดพิมพ์ mm) | 11px | ตัวเลขมิลลิเมตรเล็กเกินไป |
| | `.printField small` (หน่วย "mm") | 9.5px | หน่วยวัดเล็กมาก |
| | `.healthItem b` (ชื่อกฎเกณฑ์ 10 ข้อ) | 11px | ชื่อข้อกำหนดด้านสุขภาพ QR อ่านยาก |
| | `.healthItem small` (คำอธิบายรายละเอียดผลการตรวจ) | 10px | คำแนะนำการแก้ไขคอนทราสต์หรือระยะขอบเล็กเกินไป |
| | `.healthBadge` (ป้ายสถานะ PASS/WARN/FAIL/INFO) | 9px | ป้ายสถานะเล็กที่สุดในระบบ (9px) จำเป็นต้องขยายทันที |
| | `.healthNote` (หมายเหตุด้านความปลอดภัยการสแกน) | 10px | ข้อความหมายเหตุสำคัญอ่านยาก |
| **Preview Panel** | `.readyBadge` (ป้ายสถานะความพร้อมตรวจรับ) | 9.5px | เล็กเกินไป |
| | `.placeholder p` (ข้อความระหว่างยังไม่มี QR หรือความจุเกิน) | 11px | คำแนะนำใน Canvas ว่างเล็กเกินไป |
| | `.previewCta` (ข้อความ CTA บนกรอบพรีวิว) | 11.5px | ข้อความกระตุ้นการสแกนไม่เด่นชัด |
| | `.reduced` (ข้อความแจ้งลดการเคลื่อนไหว) | 9.5px | ป้ายกำกับ Accessibility เล็กเกินไป |
| | `.animNote` (คำอธิบายเอฟเฟกต์แอนิเมชัน) | 9.5px | คำแนะนำเอฟเฟกต์อ่านยาก |
| **Actions Panel** | `.downloadBtn b` (ปุ่มดาวน์โหลด PNG และ SVG) | 12px | ป้ายกำกับปุ่ม Export สำคัญควรโดดเด่น |
| | `.downloadBtn small` (ขนาดพิกเซล / ชนิดเวกเตอร์) | 9.5px | คำอธิบายชนิดไฟล์ใต้ปุ่มเล็กมาก |
| | `.copyBtn` (ปุ่มคัดลอก URL) | 11.5px | ข้อความปุ่มคัดลอกเล็กเกินไป |
| | `.statusLine` (แถบสถานะการทำงาน / กำลังบันทึก / ล้มเหลว) | 10.5px | แถบแจ้งเตือนสถานะอ่านยาก |
| | `.createBtn` (ปุ่มสร้าง Short Link) | 11.5px | ข้อความปุ่มสร้างลิงก์สั้นเล็กเกินไป |
| | `.shortResult code` (URL ลิงก์สั้นที่ได้) | 10.5px | URL ตัวผลลัพธ์อ่านยาก |
| | `.toggleRow` (สวิตช์ใช้ลิงก์สั้นแทน URL เดิม) | 10.5px | ข้อความตัวเลือกช่องติ๊กเล็กเกินไป |
| | `.copyMini` (ปุ่มคัดลอกด่วน) | 10px | ปุ่มกดจิ๋ว คลุมพื้นที่กดไม่สะดวก |
| | `.loginNote` (ข้อความแนะนำล็อกอินใน Actions) | 10.5px | คำแนะนำอ่านยาก |
| | `.relationRow`, `.relationNode`, `code`, `.relationDest` | 10px | แผนผังเส้นทางความสัมพันธ์ URL อ่านยาก |
| **Top Navigation** | `.navActions :global(.mini-btn)` (ปุ่มไปยังแดชบอร์ด) | 11.5px – 13px | ปุ่มเมนูนำทางบนมือถือถูก globals.css บีบเหลือ 11.5px |
| | `.navActions :global(.lang-toggle button)` (ปุ่มเปลี่ยนภาษา) | 12px | ปุ่มสลับภาษา TH/EN ถูก globals.css กำหนดไว้ 12px |

---

## 2. เป้าหมายการปรับปรุง (Target Specification)

1. **Minimum 14px Floor:**
   - ข้อความที่มองเห็นได้ทุกองค์ประกอบในหน้า `/qr` (prose, labels, inputs, selects, hints, alerts, badges, buttons, chips, code, notes) ต้องมี `font-size >= 14px` (computed style >= 14px ทั้งบน Desktop และ Mobile)
   - หัวข้อ (`h2`) ปรับขึ้นเป็น `16px` เพื่อรักษาระดับความสำคัญของสายตา (Visual Hierarchy)
   - ป้ายระบุขั้น (`.stepIndex`) ปรับเป็น `14px` พร้อมปรับ padding ให้สมดุล
   - ช่องกรอกข้อมูล (`input`, `select`) ปรับเป็น `14px` (หรือ 16px บน mobile เพื่อป้องกัน auto-zoom ใน iOS)

2. **Zero Horizontal Overflow on Mobile:**
   - ทดสอบ viewport หน้าจอแคบ: 320px, 375px, 390px, 414px
   - เงื่อนไข: `document.documentElement.scrollWidth <= window.innerWidth` (ไม่มีแถบเลื่อนแนวนอนหลุดออกจากจอ)
   - ปรับ grid, flex-wrap และ word-break / overflow-wrap เพื่อให้ layout รองรับขนาดตัวอักษรที่ใหญ่ขึ้นได้อย่างสวยงาม

3. **No Colored Borders (กฎเหล็ก AGENTS.md):**
   - ห้ามใช้ `border: 1px solid <color>` เด็ดขาด
   - ใช้วัตถุ Radial Gradient, Inset Glow, หรือ Box-Shadow แทน

4. **Preserve All Logic:**
   - ไม่มีการแตะต้อง logic การสร้าง QR, matrix, contrast validation, SVG generation, download canvas, rate limit, authentication routing, หรือ URL safety

---

## 3. แผนการทดสอบและการยืนยัน (Verification Plan)

1. **Automated Computed Font Size Test:**
   - เขียน Playwright E2E Test ตรวจจับ computed `font-size` ของทุก element ที่มี text content ในหน้า `/qr` ว่ามีขนาด `>= 14px` ทั้งหมด
2. **Automated Mobile Overflow Test:**
   - เขียน Playwright E2E Test บน viewport มือถือขนาด 320x640, 375x667, 390x844 ตรวจสอบว่า `scrollWidth <= clientWidth`
3. **Full Quality Suite:**
   - `npm run typecheck`
   - `npm run test:unit`
   - Playwright E2E (`npx playwright test e2e/qr-studio.spec.ts`)
   - `npm run build`
   - `npm run check:charset`
   - `npm run check:security`
