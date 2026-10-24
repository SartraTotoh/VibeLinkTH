# Vibe QR Studio — Final Report (MVP)

- วันที่: 24 ตุลาคม 2026
- รอบ: **Prompt A — ตรวจรับ, hardening และเตรียม Staging** (ยังไม่ commit / ยังไม่ deploy)
- Repo: `C:\Users\totoh.taponchai\Documents\Default Project` (VibeLink)
- สถานะ: **LOCAL MVP DELIVERED — ยังไม่ commit และยังไม่ deploy**
- ขอบเขต: URL QR, Vibe Page QR, Booking Page QR, Short Link QR, UTM QR + ธีม/โลโก้/กรอบ/CTA + Scan Health + Export PNG/SVG
- UI ล่าสุด: **Gen Z redesign** — hero สั้น, ขั้นตอน 01/02/03, ปุ่ม icon-first, สถานะ selected เป็น lime ชัดเจน, ไม่มีเส้นขอบสี และไม่มีของตกแต่งที่ไม่จำเป็น
- หลักฐานที่ยังไม่มี: **ยังไม่ได้สแกน PNG/SVG ด้วยกล้องโทรศัพท์จริง** และ **ยังไม่ได้พิมพ์จริง** — ต้องทำก่อน Prompt B

---

## 1. สรุปผล

สร้างหน้า **`/qr` (Vibe QR Studio)** เป็นเครื่องมือสร้าง QR แบบ client-side ทั้งหมด โดยใช้ `qrcode@1.5.4` สร้าง matrix และ renderer ของเราเองวาด PNG/SVG เพื่อควบคุม pattern, eye shape, โลโก้กลาง, frame, CTA และ quiet zone ได้จริง

**สิ่งที่ส่งมอบและตรวจแล้ว**

- สร้าง QR จาก URL ตรง, Vibe Page, Booking Page (ที่ publish แล้ว) และ Short Link เดิมของผู้ใช้
- UTM 5 พารามิเตอร์แบบเดียวกับ UTM builder เดิม + `ref=vibelink` โดยตรวจที่ server
- ธีม Blink / Pank / Print Safe (dark-on-light ทุกธีม), pattern 3 แบบ, eye 2 แบบ, โลโก้กลาง ≤18% (บังคับ ECC H), frame 3 แบบ, CTA ≤48 ตัวอักษร, quiet zone ขั้นต่ำ 4 modules
- Preview บนพื้นขาว / พื้นมืด / Social Card และ animation รอบ QR 3 แบบ (Glow / Gradient / CTA Pulse) — ปิดเป็นค่าเริ่มต้น, ไม่แตะโมดูล/ข้อมูล, เคารพ `prefers-reduced-motion`
- UI แบบ Gen Z: hero “QR STUDIO”, เลขขั้น 01/02/03, ปุ่มเลือกแบบ icon-only พร้อม `aria-label`/`title`, ปุ่มที่เลือกเปลี่ยนเป็น lime ทันที (รวมตอน hover), เอา chip/footer/sticker/ข้อความอธิบายยาวออก, จัดลำดับ mobile เป็น 1 → 2 → 3 → Preview → Download
- Scan Health 10 ข้อที่อธิบายเหตุผลได้ + decode จากภาพที่ render จริงด้วย jsQR ก่อนปลดล็อกดาวน์โหลด
- ดาวน์โหลด PNG (composed card) และ SVG (escape แล้ว) พร้อมสถานะ loading/success/error
- ไม่มีตาราง `QRAsset`, ไม่มี Prisma migration, ไม่มี environment variable ใหม่, ไม่แตะ `/go`, UTM builder, analytics, booking หรือ short-link behavior เดิม

**ผลตรวจสุดท้าย**

| คำสั่ง | ผล |
| --- | --- |
| `npm run typecheck` | EXIT 0 |
| `npm run test:unit` | 28 ไฟล์ / 230 tests ผ่านทั้งหมด (รวม QR ใหม่ 75 unit/integration tests) |
| `npx vitest run --testTimeout=30000` | 28 ไฟล์ / 230 tests ผ่าน (ใช้กับเครื่อง cold/CI) |
| `npm run check:charset` | clean |
| `npm run check:security` | clean |
| `npm run build` | EXIT 0, `/qr` เป็น static 43.8 kB / first load 166 kB |
| Playwright `e2e/qr-studio.spec.ts` | **9/9 ผ่าน** (มีดาวน์โหลด PNG/SVG จริง + decode จริง + design control + ตรวจ computed font-size >= 14px + zero mobile overflow 320/375/390px) |
| `npm run lint` | **รันไม่ได้** — repo ไม่มี ESLint config และ `next lint` เปิด prompt interactive (EXIT 1) |

**ไม่กล้าอ้างว่าพร้อมสำหรับ Production หรือ “สแกนผ่านทุกเครื่อง”** — หลักฐาน decode มาจาก jsQR ในเบราว์เซอร์/CI และ sharp rasterize เท่านั้น ยังไม่ได้ทดสอบสแกนด้วยกล้องโทรศัพท์จริงหรือพิมพ์จริง

**หลักฐานแยกตามประเภท**

| ประเภท | สิ่งที่พิสูจน์ได้ | สิ่งที่ยังพิสูจน์ไม่ได้ |
|---|---|---|
| Unit / integration (Vitest) | logic, validation, contrast, health rules, SVG safety, route scoping ด้วย mock | DB/session จริง, กล้องจริง |
| E2E (Playwright + Chromium) | UI flow, ดาวน์โหลดไฟล์จริง, decode PNG/SVG, animation ไม่แตะ canvas, reduced motion, dangerous URL, over-capacity | มือถือจริง, กล้องจริง, การพิมพ์ |
| Manual device | **ยังไม่มี** | ทั้งหมดข้างต้น — ดู `docs/qr-studio/manual-device-test.md` |

---

## 2. ไฟล์ที่แก้ไข

### ไฟล์ใหม่ — เอกสาร

- `docs/qr-studio/inspection.md`
- `docs/qr-studio/capability-map.md`
- `docs/qr-studio/implementation-plan.md`
- `docs/qr-studio/decisions.md` (ADR-001…015)
- `docs/qr-studio/final-report.md` (ไฟล์นี้)
- `docs/qr-studio/manual-device-test.md` — คู่มือทดสอบด้วยมือถือจริง 10 กรณี (Prompt A)
- `docs/qr-studio/rate-limit-audit.md` — ผลตรวจ Rate Limit แบบ read-only (Prompt A)
- `docs/qr-studio/authenticated-e2e-gap.md` — ช่องว่าง Authenticated E2E (Prompt A)
- `docs/qr-studio/lint-audit.md` — สถานะ ESLint ที่ยังรันไม่ได้ (Prompt A)
- `docs/qr-studio/readability-audit.md` — การตรวจและปรับปรุง Readability / Accessibility (Minimum 14px Text & Mobile Overflow)

### ไฟล์ใหม่ — QR engine

- `lib/qr/types.ts` — types/limits (`QR_MIN_MARGIN=4`, `QR_MAX_LOGO_RATIO=0.18`, export 512/1024/2048)
- `lib/qr/presets.ts` — Blink / Pank / Print Safe
- `lib/qr/destination.ts` — scheme allowlist, credentials rejection, UTM validation
- `lib/qr/style.ts` — zod schema, contrast, geometry, effective ECC
- `lib/qr/matrix.ts` — QR matrix → RGBA renderer (square/rounded/dots + eyes + logo)
- `lib/qr/svg.ts` — standalone SVG renderer + XML escaping + logo sanitisation
- `lib/qr/health.ts` — 10 Scan Health checks + Thai/English explanations
- `lib/qr/decode.ts` — jsQR decode (dynamic import)
- `lib/qr/export.ts` — canvas composition, PNG/SVG download, filename sanitisation
- `lib/qr/copy.ts` — Thai-first copy + English fallback

### ไฟล์ใหม่ — API / UI / tests

- `app/api/qr/destinations/route.ts` — auth-only, user-scoped Vibe/Booking/Short Link list
- `app/api/qr/validate-destination/route.ts` — server URL + UTM authority, rate limit `qr:validate`
- `app/qr/page.tsx` — public static page + metadata
- `components/qr/qr-studio.tsx` — main client UI
- `components/qr/qr-studio.module.css` — Gen Z compact layout: gradient type, radial-gradient surfaces, lime selected states, icon-only controls, no coloured borders, focus-visible, reduced motion
- `e2e/qr-studio.spec.ts` — 9 E2E tests (เพิ่ม design-control coverage ใน Prompt A, และเพิ่ม computed font-size >= 14px + mobile overflow test)
- `tests/qr-destination.test.ts`, `qr-style.test.ts`, `qr-health.test.ts`, `qr-svg.test.ts`, `qr-decode.test.ts`, `qr-destinations-route.test.ts`, `qr-validate-route.test.ts` — 75 tests

### ไฟล์เดิมที่แก้

- `app/dashboard/page.tsx` — เพิ่มลิงก์ “QR Studio” ใน nav
- `app/sitemap.ts` — เพิ่ม `/qr`
- `package.json` / `package-lock.json` — เพิ่ม `jsqr` (runtime), `pngjs`, `@types/pngjs`, `sharp` (dev)
  - **หมายเหตุสำหรับ Prompt B:** `package.json` มีการเพิ่ม script `cron:daily` จากงานเดิมที่ไม่เกี่ยวกับ QR — ห้าม stage รวมกับงาน QR; ต้องแยก hunk หรือใช้ patch เฉพาะ dependency ของ QR
  - `package-lock.json` ใน diff รอบนี้เป็น dependency ของ QR (`jsqr`, `pngjs`, `@types/pngjs`, `sharp`) ไม่พบ dependency อื่นปน

### ไม่แตะ

- `prisma/schema.prisma`, migrations, `.env`, secrets
- `/go` redirect, `lib/links.ts` behavior, UTM builder, analytics/consent, booking, subscription
- `next.config.ts` (CSP เดิมอนุญาต `img-src data: blob:` อยู่แล้ว)

---

## 3. Architecture

ลำดับชั้นตามที่กำหนด: **Destination → Tracking → QR Data → Presentation**

1. **Destination**
   - UI รับ URL หรือเลือก Vibe Page / Booking Page / Short Link
   - `GET /api/qr/destinations` ต้องมี session และกรองด้วย `userId` ของผู้ใช้เท่านั้น (ไม่มีการเดา/สร้างข้อมูลแทน)
   - `POST /api/qr/validate-destination` เป็นผู้ตัดสิน URL ขั้นสุดท้าย: zod, scheme allowlist `http`/`https`, ปฏิเสธ credentials/control chars/URL เกิน 2048, ตรวจ UTM และเติม `ref=vibelink`
   - endpoint นี้ **ไม่ fetch ปลายทาง** และ **ไม่ log URL** → ไม่มี SSRF และไม่เพิ่ม PII

2. **Tracking**
   - UTM ใช้ 5 คีย์เดิม + `ref=vibelink`; ไม่สร้าง campaign ใหม่
   - Short Link ยังชี้ `/go/<slug>` และการนับคลิกยังเป็นของระบบเดิมทั้งหมด — QR เป็นเพียงปลายทางที่ฝัง URL

3. **QR Data**
   - `qrcode.create()` ให้ matrix + version/ECC
   - ไม่เก็บ QR ลงฐานข้อมูล (stateless) → ไม่มี migration และไม่มีข้อมูลส่วนบุคคลเพิ่ม
   - โลโก้บังคับ ECC H; ถ้าข้อมูลเกินความจุของ ECC H จะอธิบายและล็อกดาวน์โหลด (ไม่ปล่อยภาพเปล่า)

4. **Presentation**
   - RGBA renderer สำหรับ preview/PNG และ SVG renderer สำหรับงานพิมพ์
   - Style validation อยู่ที่ `lib/qr/style.ts` และใช้ทั้ง preview, health, export
   - Scan Health ตรวจจากภาพที่ render จริง (contrast, quiet zone, logo, module size, print size, HTTPS, host, frame/CTA, print-safe, decode)
   - Animation เป็น CSS รอบ canvas เท่านั้น; ไม่มี frame ใดเปลี่ยนโมดูล/ข้อมูล และไม่ถูก export

**ทางเลือกที่บันทึกไว้ (ADR)**

- Client-side renderer, ไม่มี `QRAsset`/migration (ADR-001/002)
- ใช้ `qrcode` เดิม + renderer เอง (ADR-003)
- `jsqr` decode local-only (ADR-004)
- preset dark-on-light (ADR-005), quiet zone ≥4 + logo ≤18% (ADR-006)
- ปฏิเสธ SVG logo (ADR-007), `/qr` public (ADR-008)
- animation รอบ canvas (ADR-009), health ไม่ใช่ SEO score (ADR-010)
- ไม่แตะ `/go` (ADR-011), UTM validation server-side (ADR-012)
- ไม่ใช้ `next/image` กับ canvas (ADR-013), metadata ครบ (ADR-014), ไม่เพิ่ม env (ADR-015)

---

### 3.1 Local Flow Acceptance (Prompt A)

รัน Dev Server จริงด้วย `npm run dev -- -p 3010` และเปิด `http://127.0.0.1:3010/qr` (HTTP 200) จากนั้นตรวจด้วย Playwright ที่ตั้ง `APP_TEST_URL=http://127.0.0.1:3010` เท่านั้น
หลังตรวจเสร็จ **หยุด Dev Server แล้ว** (พอร์ต 3010 ไม่มี process ค้าง) — ผู้ใช้ต้องเริ่มใหม่ตามคู่มือเมื่อจะทดสอบด้วยมือถือ

| รายการ | หลักฐาน | ผล |
|---|---|---|
| URL QR | E2E full flow: กรอก `https://example.com/test` → canvas + decode ตรง | ผ่าน |
| Blink | E2E design control เปลี่ยนธีมแล้ว canvas เปลี่ยน + unit decode | ผ่าน |
| Pank | E2E design control เปลี่ยนธีมแล้ว canvas เปลี่ยน + unit decode | ผ่าน |
| Print Safe | E2E design control เปลี่ยนธีมแล้ว canvas เปลี่ยน + unit decode | ผ่าน |
| Print Safe (print size) | Scan Health ข้อ `ขนาดพิมพ์ผ่าน` ที่ความกว้างเริ่มต้น 40 mm | ผ่าน |
| Logo PNG | E2E อัปโหลด PNG 96×96 → โลโก้ ≤18% + ECC H → ดาวน์โหลด PNG decode ตรง | ผ่าน |
| Pattern | E2E เลือก Dots + unit decode square/rounded/dots | ผ่าน |
| Eye | E2E เลือก Rounded + unit decode square/rounded | ผ่าน |
| Frame + CTA | E2E เลือก Ticket + CTA `Scan to Book` → PNG decode ตรง | ผ่าน |
| Glow / Gradient / CTA Pulse | E2E เปิดทั้ง 3 แล้ว `canvas.toDataURL()` ไม่เปลี่ยน | ผ่าน |
| Scan Health | E2E เห็น `Decode สำเร็จ` + `พร้อมดาวน์โหลด`; 10 checks ไม่มี fail | ผ่าน |
| PNG Export | E2E ดาวน์โหลดจริง 1024px → jsQR decode = payload | ผ่าน |
| SVG Export | E2E ดาวน์โหลดจริง → ไม่มี script/external href → sharp rasterize → decode = payload | ผ่าน |
| Reduced Motion | E2E `prefers-reduced-motion: reduce` → ปุ่ม disabled + animation `none` | ผ่าน |
| URL อันตราย | E2E `javascript:alert(1)` → ข้อความปฏิเสธ + ปุ่มดาวน์โหลด disabled | ผ่าน |
| URL ยาวเกินความจุ | E2E URL + โลโก้ → ข้อความ `ยาวเกินความจุ` + ปุ่ม disabled | ผ่าน |
| UTM | unit + route test (5 คีย์ + `ref=vibelink`) — **ยังไม่มี E2E UI ของ UTM** | ผ่านระดับ unit/route |

> หมายเหตุ: ตารางนี้เป็นการตรวจ flow ในเบราว์เซอร์จริงบนเครื่อง local ไม่ใช่การสแกนด้วยกล้องโทรศัพท์

---

## 4. ฟีเจอร์ที่ตรวจ

| ฟีเจอร์ | สถานะ | หลักฐาน |
| --- | --- | --- |
| URL QR | ✅ | E2E กรอก `https://example.com/test` → decode ตรง |
| Vibe Page QR | ✅ (API + UI) | route test คืน URL ของเจ้าของ; UI แสดงเฉพาะเมื่อมี `vibeSlug` |
| Booking Page QR | ✅ (API + UI) | แสดงเฉพาะ `isPublished`; หน้าที่ไม่ publish ถูกซ่อน |
| Short Link QR | ✅ (API + UI) | ดึงลิงก์ ACTIVE ของผู้ใช้; สร้างใหม่ผ่าน `POST /api/links` เดิม |
| UTM | ✅ | unit + route test 5 พารามิเตอร์ + `ref=vibelink`, คง query เดิม, overwrite ค่าเดิม |
| ธีม Blink/Pank/Print Safe | ✅ | unit contrast ≥4.5:1 + decode ทั้ง 3 ธีม |
| Pattern/eye | ✅ | decode square/rounded/dots และ eye square/rounded |
| โลโก้กลาง | ✅ | decode 14% + ECC H; >18% ถูกบล็อก; ไฟล์ >512KB/>1024px/SVG ถูกปฏิเสธ |
| Frame + CTA | ✅ | SVG escape + rasterize decode; CTA >48 ตัวอักษร fail |
| Quiet zone | ✅ | บังคับ ≥4 modules ทั้ง validation และ geometry |
| Preview 3 พื้น | ✅ (โค้ด/UI) | ปุ่ม 3 พื้นทำงาน; screenshot ตรวจพื้นขาวบน desktop/mobile — พื้นมืด/Social ยังไม่ได้แคปแยก |
| Animation | ✅ | E2E: เปิด Glow/Gradient/CTA Pulse แล้ว `canvas.toDataURL()` เท่าเดิม |
| Gen Z UI / selected state | ✅ | Desktop + mobile screenshots; ปุ่ม preset/pattern/eye/frame/size/animation เปลี่ยนเป็น lime หรือ pink ชัดเจน; hover ทับ active ไม่ทำให้สีหาย; ไม่มี `border` สี |
| Icon-first controls | ✅ | Pattern/eye/frame/surface/logo/animation เป็น icon-only พร้อม `aria-label` + `title`; ปุ่มหลักยังมีข้อความ PNG/SVG/Copy/Short Link |
| Reduced motion | ✅ | E2E: ปุ่ม disabled + `animationName = none` |
| Scan Health | ✅ | 10 checks, มี title/detail/icon ทุกข้อ, ห้ามใช้คำ SEO/Conversion score |
| PNG export | ✅ | E2E ดาวน์โหลดจริง 1024px แล้ว jsQR decode ได้ |
| SVG export | ✅ | E2E ตรวจไม่มี `<script>`/external href แล้ว sharp rasterize + decode ได้ |
| Loading/success/error | ✅ | UI มีสถานะ `exporting`/`exported`/`exportError`; ปุ่มล็อกเมื่อ health ไม่ผ่าน |
| URL อันตราย | ✅ | `javascript:` ถูกปฏิเสธทั้ง client/server และปุ่มดาวน์โหลด disabled |
| ข้อมูลเกินความจุ QR | ✅ | E2E อัปโหลดโลโก้ (บังคับ ECC H) + URL ยาว → ข้อความอธิบาย + ปุ่ม disabled |
| ปุ่มกลุ่มเดียวกัน | ✅ | E2E วัดความกว้างเท่ากัน + `borderTopColor: rgba(0,0,0,0)` |
| Mobile order | ✅ | แก้ให้ Step 1 → 2 → 3 → Preview → Actions (ไม่เอา preview เปล่าขึ้นก่อน) |
| Nav + sitemap | ✅ | `/qr` ปรากฏใน dashboard nav และ `sitemap.xml` |

---

## 5. Tests

### 5.1 Unit / integration (Vitest)

```
npm run test:unit
→ Test Files 28 passed (28)
→ Tests 230 passed (230)
```

- ของใหม่ 75 tests ใน 7 ไฟล์:
  - scheme allowlist / credentials / length / UTM / localhost
  - preset contrast / style clamp / logo cap / ECC forcing / geometry
  - Scan Health 10 checks + blocking rules + Thai/English
  - SVG escaping / no script / no external href / PNG-only logo
  - decode จริงด้วย jsQR: 3 presets, 3 patterns, 2 eyes, logo 14%, UTM, short link, quiet zone
  - SVG rasterize ด้วย sharp แล้ว decode: frame+CTA, raster logo
  - route: 401, user scoping, unpublished booking, no Vibe page, missing user, `SHORT_LINK_URL` fallback
  - validate route: scheme/credentials/UTM/malformed/429/no fetch (fetch spy)

หมายเหตุ: รอบแรกที่เครื่อง cold (Neon) และ jsQR ยังไม่ warm มี timeout ที่ 5s 2 เคส (pre-existing `concurrent-booking.test.ts` + decode) จึงเพิ่ม `testTimeout: 30s` เฉพาะไฟล์ decode และรายงานคำสั่ง `npx vitest run --testTimeout=30000` สำหรับ CI; รอบสุดท้าย `npm run test:unit` ผ่านที่ 5.24s

### 5.2 E2E (Playwright, Chromium)

```
$env:APP_TEST_URL='http://127.0.0.1:3010'
npx playwright test e2e/qr-studio.spec.ts
→ 7 passed (42.3s)
```

1. full flow: health ผ่าน → ดาวน์โหลด PNG 1024 → jsQR decode = payload → ดาวน์โหลด SVG → ไม่มี script/external href → sharp rasterize → decode = payload
2. **design controls:** เปลี่ยน Blink → Pank → Print Safe (canvas เปลี่ยนจริงทุกธีม) → Dots + Rounded eye + Ticket + CTA + โลโก้ PNG → ดาวน์โหลด PNG → decode = payload
3. animation เปิด Glow + Gradient + CTA Pulse แล้ว canvas ข้อมูลเดิมทุกไบต์
4. `prefers-reduced-motion` ปิดปุ่มและ animation
5. `javascript:` ถูกปฏิเสธ + ปุ่มดาวน์โหลด disabled
6. ปุ่มดาวน์โหลดสองปุ่มกว้างเท่ากัน + ไม่มีขอบสี
7. ข้อมูลเกินความจุ ECC H → ข้อความอธิบาย + ปุ่ม disabled

### 5.3 Manual Device Test (ยังไม่ได้ทำ)

- ไฟล์คู่มือ: `docs/qr-studio/manual-device-test.md`
- สถานะ: **ยังไม่มีการสแกนด้วยกล้องโทรศัพท์จริง และยังไม่มีการพิมพ์จริง**
- ต้องผ่านก่อน Prompt B: สแกน PNG และ SVG ด้วยโทรศัพท์จริง, ตรวจ Blink/Pank/Print Safe, Logo/Frame, UTM, Desktop/Mobile, และ (ถ้าทำได้) พิมพ์แล้วสแกน
- ห้ามบันทึก token/password/API key/URL ส่วนตัวในผลทดสอบ

### 5.4 Build / static checks

```
npm run typecheck        → EXIT 0
npm run check:charset    → clean (no mojibake detected)
npm run check:security   → clean (no secrets, no asset leaks, guard routes intact)
npm run build            → EXIT 0
  ├ ○ /qr                43.8 kB    166 kB
```

### 5.5 สิ่งที่รันไม่ได้ / ไม่ได้รัน

- `npm run lint` — repo ไม่มี ESLint config, `next lint` เปิด prompt “How would you like to configure ESLint?” และ EXIT 1 → **ไม่ใช่ “lint ผ่าน”** (รายละเอียด: `docs/qr-studio/lint-audit.md`)
- Authenticated E2E สำหรับ Vibe/Booking/Short Link — ไม่มี test session/credential ที่ปลอดภัย (`E2E_EMAIL`/`E2E_PASS` ไม่ได้ตั้งค่า); ตรวจได้แค่ route unit tests + การอ่านโค้ด (รายละเอียด: `docs/qr-studio/authenticated-e2e-gap.md`)
- สแกนด้วยกล้องโทรศัพท์จริง / พิมพ์จริง — ยังไม่ได้ทำ; ใช้ jsQR + sharp เป็นตัวแทน
- Integration กับ Vibe/Booking test env จริง — ไม่ได้เขียนลง DB (ตามข้อห้ามใช้ข้อมูลจริง) จึงไม่มีการทดสอบข้ามผู้ใช้แบบสองบัญชีจริง; แต่ route test ยืนยันว่าคิวรีด้วย `userId` ของ session และ 401 โดยไม่แตะ DB
- Rate Limit กับตารางจริง — local dev ไม่มีตาราง `_rate_limit`; staging/production ยังไม่ตรวจ (รายละเอียด: `docs/qr-studio/rate-limit-audit.md`)

---

## 6. Security

- **Scheme allowlist**: รับเฉพาะ `http:`/`https:` ทั้ง client และ server; ปฏิเสธ `javascript:`, `data:`, `file:`, `vbscript:`, `ftp:`
- **No SSRF**: `validate-destination` ไม่ fetch ปลายทาง; มี fetch spy test ยืนยันว่าไม่เรียก `fetch`
- **No credential leakage**: ปฏิเสธ URL ที่มี `user:pass@`; ไม่ log URL; ไม่ส่ง URL ไป third-party QR API
- **Auth boundary**: `/api/qr/destinations` คืน 401 เมื่อไม่มี session และไม่แตะ DB; คิวรีด้วย `userId` จาก session เท่านั้น (ทดสอบแล้วว่า where clause ถูกต้อง)
- **SVG safety**: escape `& < > " '`, ไม่มี `<script>`, ไม่มี external `href`, ไม่มี `foreignObject`; รับโลโก้เฉพาะ `data:image/png;base64,...`
- **Logo handling**: รับ PNG/JPEG/WebP ≤512KB, ≤1024px, re-encode ผ่าน canvas ในเบราว์เซอร์, ไม่ upload; SVG logo ถูกปฏิเสธโดยเจตนา
- **No new secrets/env**: ไม่มี environment variable ใหม่, ไม่มี cloud service/ค่าใช้จ่ายเพิ่ม
- **Rate limit (ยังไม่ผ่านเกณฑ์ Production)**: `POST /api/qr/validate-destination` ใช้ `rateLimitDb(..., "qr:validate", 60, 60_000, userId|null)`
  - ตาราง `_rate_limit` ไม่มีใน Prisma schema/migration; ต้องสร้างแยกด้วย `scripts/create-rate-limit-table.mjs`
  - Local dev: table ไม่มี → `relation "_rate_limit" does not exist` → fail-open
  - พบข้อบกพร่องเดิม: `.catch(() => [{ count: 1 }])` กลืน DB error ทำให้ `mode: "closed"` ไม่ fail-closed จริง — กระทบ auth endpoints และต้องแก้เป็นงานแยก
  - `cleanupRateLimitTable()` ไม่มี caller → ไม่มี cleanup อัตโนมัติ
  - Staging/Production ยังไม่ยืนยันว่ามีตาราง — ดู `docs/qr-studio/rate-limit-audit.md`
- **Existing behavior untouched**: `/go`, UTM builder, analytics consent, booking, subscription, short-link quota/slug rules ไม่ถูกแก้ (QR ฝัง URL เดิมเท่านั้น)

---

## 7. Approval Gates

งานนี้ **หยุดก่อนทุก gate** ต่อไปนี้ และยังไม่ได้ดำเนินการใด ๆ:

- ❌ Production deploy / DNS / Cloudflare config
- ❌ Production DB / migration / ข้อมูลจริง (ไม่มี schema change อยู่แล้ว)
- ❌ Secrets / environment variables ใหม่
- ❌ Cloud/External service ที่มีค่าใช้จ่าย (ไม่เพิ่ม)
- ❌ Pricing / quota / billing
- ❌ PII เพิ่มเติม (ไม่เก็บ QR/โลโก้/URL)
- ❌ Social credentials ใหม่
- ❌ เปลี่ยน dynamic redirect / short-link / tracking behavior เดิม
- ❌ Animated QR ที่ขยับ data modules (ไม่ทำ; animation รอบ canvas เท่านั้น)

**ยังไม่ commit และยังไม่ deploy** — ต้องได้คำสั่งชัดเจนจากพี่ก่อน

---

## 8. ความเสี่ยง / ข้อจำกัด

1. **Lint ไม่มีในระบบ** — repo ไม่มี ESLint config, `next lint` เปิด prompt และ EXIT 1; ต้องตัดสินใจเพิ่ม ESLint เป็นงานแยก หรือยอมรับ typecheck + tests แทน (ยังไม่ใช่ lint ผ่าน)
2. **Authenticated E2E ยังไม่มี** — Vibe/Booking/Short Link ตรวจด้วย unit/route tests + การอ่านโค้ด; ยังไม่มี session จริงสองบัญชี และห้ามสร้าง credential เอง → ดู `authenticated-e2e-gap.md`
3. **Rate limit ยังไม่พร้อม Production** — local dev ไม่มีตาราง `_rate_limit`; พบว่า `mode: "closed"` ไม่ fail-closed จริงเมื่อ DB error; ไม่มี cleanup อัตโนมัติ; staging/production ยังไม่ยืนยัน — ดู `rate-limit-audit.md`
4. **ยังไม่ได้สแกนด้วยโทรศัพท์จริง** — หลักฐานทั้งหมดเป็น jsQR/sharp; ต้องผ่าน `manual-device-test.md` ก่อน Prompt B
5. **Dots pattern radius 0.52** — ต้องใหญ่ขนาดนี้เพื่อให้ jsQR decode ผ่าน; ตาเปล่าจะเห็นเป็นเม็ดเกือบชิดกัน ไม่กลมแยกเม็ดแบบงานดีไซน์ทั่วไป; ถ้าอยากกลมกว่านี้ต้องทดสอบสแกนจริงก่อน
6. **SVG logo ถูกปฏิเสธ** — ผู้ใช้ที่มีโลโก้ SVG ต้อง export เป็น PNG เอง (security trade-off)
7. **ไม่มีประวัติ/จัดการ QR** — เป็น stateless ตาม MVP; การเก็บ asset ต้องผ่าน gate DB/migration และออกแบบใหม่
8. **ข้อมูลยาว** — `QR_MAX_URL_LENGTH=2048` ผ่านที่ ECC M แต่ ECC H (เมื่อมีโลโก้) รับได้ประมาณ 1,273 ไบต์; ตอนนี้อธิบายและบล็อกแล้ว แต่ถ้าอยากให้รับยาวกว่านี้ต้องลด Logo/เปลี่ยน ECC หรือใช้ short link
9. **CTA/โลโก้เป็นข้อความ/ภาพของผู้ใช้** — escape แล้วใน SVG แต่ PNG วาดตามข้อมูล; ไม่มี XSS
10. **Working tree มีการเปลี่ยนแปลงเดิมจำนวนมาก** — ก่อน commit ต้องเลือกเฉพาะไฟล์ QR เพื่อไม่ปนงานค้างอื่น
11. **First load 166 kB** — รวม `qrcode` + `jsqr` (dynamic import สำหรับ decode); ยอมรับได้สำหรับเครื่องมือ แต่ถ้าต้องการลด ต้อง code-split หน้า `/qr` เพิ่ม
12. **Rate limit ของ QR เป็น public endpoint** — ถ้าตารางไม่มี จะไม่มีเพดานป้องกันการยิงถี่; แม้งานต่อ request เบาและไม่ fetch ปลายทาง แต่ควรมีเพดานก่อนเปิด public
13. **Print/scan ยังไม่ผ่านการพิสูจน์** — Scan Health ใช้ขนาดพิมพ์ที่ผู้ใช้กรอก ไม่ได้วัดจากเครื่องพิมพ์จริง; ต้องยืนยันด้วยการพิมพ์ใน Manual Test

---

## 9. ขั้นตอนถัดไป

**ฝั่งพี่ผู้ใช้**

1. เปิด `http://127.0.0.1:3010/qr` (หรือ dev server ที่พี่เปิด) แล้วลอง URL สาธารณะ 1 ลิงก์
2. ดู UI รอบ Gen Z: hero, ขั้น 01/02/03, ปุ่ม icon-only, สถานะ selected สี lime, mobile order
3. ทำตาม `docs/qr-studio/manual-device-test.md` ให้ครบ 10 ข้อ โดยเฉพาะ **ดาวน์โหลด PNG และ SVG แล้วสแกนด้วยกล้องโทรศัพท์จริง** — นี่คือ Gate ของ Prompt B
4. ตรวจ docs ใน `docs/qr-studio/` และไฟล์รายงานนี้
5. สั่งชัดเจนว่า **ให้ commit หรือไม่** (Prompt B) และแยกคำสั่ง **deploy** (Prompt C) — ห้ามรวมกัน

**ฝั่งพี่เสือ (ก่อน commit/deploy)**

1. รันคำสั่ง read-only ใน `rate-limit-audit.md` กับ Production และแนบผล (ห้ามสร้างตารางเองใน Prompt A)
2. ตัดสินใจ/อนุมัติงานแยกสำหรับ `mode: "closed"` ที่ยัง fail-open เมื่อ DB error และ cleanup ของ `_rate_limit`
3. เตรียม staging account 2 บัญชี + รัน E2E authenticated ตาม `authenticated-e2e-gap.md`
4. ตัดสินใจ ESLint config (แยกงาน) — ห้ามรายงานว่า lint ผ่านจนกว่าจะรันได้จริง
5. Commit เฉพาะไฟล์ QR (ตามรายการข้อ 2) หลังได้รับอนุญาต; ห้ามรวมงานค้างอื่น
6. ถ้าจะ deploy: ทำตาม Preconditions ของ Prompt C และรายงานผลหลัง deploy แยกอีกฉบับ

---

_รายงานนี้ยืนยันเฉพาะสิ่งที่รันและเห็นผลจริงในเครื่องนี้ ไม่มีการกล่าวอ้างเกินหลักฐาน_
