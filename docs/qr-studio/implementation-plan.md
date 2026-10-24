# Vibe QR Studio — Implementation Plan

> แผน MVP ที่ควบคุมขอบเขตได้ อ้างอิงจาก `inspection.md` + `capability-map.md`
> วันที่: 2026-10-24

---

## 1. เป้าหมาย MVP (Definition of Done)

1. สร้าง URL QR ได้ และสแกนได้จริงจากไฟล์ที่ export
2. เลือก Blink / Pank / Print Safe ได้
3. ปรับสี/logo/frame/CTA/pattern/eye ในขอบเขตที่ปลอดภัย
4. มี Scan Health Check ที่อธิบายเหตุผลได้ (ไม่เรียก SEO/Conversion score)
5. ดาวน์โหลด PNG และ SVG ได้จริง
6. เชื่อม Vibe Page / Booking Page จากข้อมูลเดิมได้ (เมื่อล็อกอิน)
7. UTM ไม่หาย และไม่สร้าง short link ซ้ำโดยไม่จำเป็น
8. Animated frame preview ทำงานโดยไม่ขยับ QR modules
9. `prefers-reduced-motion`, keyboard, focus, screen reader ใช้งานได้
10. Unit/decode/route/E2E tests ผ่าน; typecheck/lint/build/check scripts ผ่าน
11. ไม่มี secret ใหม่, ไม่มี deploy/migration

---

## 2. ลำดับงาน (ตรงตาม prompt ข้อ 13)

### Phase 0 — Inspection & Docs (เสร็จแล้ว)

- `docs/qr-studio/inspection.md`
- `docs/qr-studio/capability-map.md`
- `docs/qr-studio/implementation-plan.md`
- `docs/qr-studio/decisions.md`

### Phase 1 — QR Core แบบ Static URL

**ไฟล์:**

- `lib/qr/destination.ts` — validate/normalize URL, apply UTM, reject dangerous scheme/credentials
- `lib/qr/matrix.ts` — `createQrMatrix()`, `renderQrRgba()` (pure, ไม่พึ่ง canvas)
- `lib/qr/presets.ts` — Blink/Pank/Print Safe
- `lib/qr/style.ts` — zod schema, limits, normalize
- `lib/qr/health.ts` — health rules
- `lib/qr/svg.ts` — SVG renderer + escaping

**Acceptance:**

- `https://example.com/test` → matrix decode ได้
- `javascript:`, `data:`, `file:`, `vbscript:`, `ftp:` ถูกปฏิเสธ
- URL ที่มี `user:pass@` ถูกปฏิเสธ
- quiet zone ≥4 modules ทุกกรณี

### Phase 2 — Presets + Presentation

- สีจาก `--primary` (lime) และ `--secondary` (pink) แต่ใช้เป็น **accent/frame**; QR ใช้ dark-on-light เพื่อความปลอดภัยในการสแกน
- `components/qr/qr-studio.tsx`, `qr-studio.module.css`
- Preview บนพื้นขาว/มืด/social card

**Acceptance:**

- preset ทั้ง 3 ให้ contrast ≥4.5:1
- เปลี่ยน preset ไม่เปลี่ยน payload

### Phase 3 — Logo / Frame / CTA / Pattern

- Logo: raster only (PNG/JPEG/WebP), ≤512KB, ≤1024px, re-encode ผ่าน canvas, ratio 0–18%
- Frame: none / caption / ticket (อยู่นอก quiet zone)
- CTA: ≤48 ตัวอักษร, escape, อยู่ใต้ QR
- Pattern: square / rounded / dots; Eye: square / rounded
- บังคับ ECC H เมื่อมี logo

**Acceptance:**

- logo เกิน 18% ถูกปฏิเสธ/แจ้งเตือนและ export ไม่ได้ถ้า decode fail
- frame/CTA ไม่ทับโมดูล (ทดสอบ geometry)
- SVG ที่มี CTA ต้อง escape `<`, `>`, `&`, `"`, `'`

### Phase 4 — Scan Health Check

รายการตรวจ (แสดงเหตุผลทุกข้อ):

1. Decode จากภาพที่ render จริง (รวม logo) — `jsqr`
2. Contrast ratio (WCAG formula) — pass ≥4.5, warn 3–4.5, fail <3
3. Quiet zone — ต้อง ≥4 modules
4. Logo ratio — pass ≤15%, warn 15–18%, fail >18%
5. ขนาดขั้นต่ำ — print width (mm) ต่อ module ≥0.5mm; digital ≥4px/module
6. HTTPS — host ที่ไม่ใช่ localhost และเป็น http → warn
7. URL format — ต้อง parse ได้ + scheme ถูก
8. Frame/CTA — ต้องอยู่นอก quiet zone
9. Mobile — export ≥512px และ preview scale พอ
10. Print safe — ต้องเป็น dark-on-light; inverted → warn

**Acceptance:**

- ทุกข้อมีข้อความอธิบาย ไม่ใช้สีอย่างเดียว (มี icon + ข้อความ)
- Decode fail → ปุ่ม download ถูก disable พร้อมบอกเหตุผล
- ไม่มีคำว่า SEO Score / Conversion Score ใน UI

### Phase 5 — PNG / SVG Export

- PNG: `renderQrRgba` → `ImageData` → canvas → `toBlob("image/png")` → download
- SVG: `renderQrSvg` → Blob `image/svg+xml;charset=utf-8` → download
- ขนาด 512/1024/2048 px
- Filename sanitize
- Loading/success/error states

**Acceptance:**

- ไฟล์ที่ดาวน์โหลด decode ได้จริง (E2E + Node decode test)
- SVG เปิดได้และไม่มี `<script>`
- ไม่มี network request ออกนอกระหว่าง export

### Phase 6 — Vibe Page / Booking Page

- `GET /api/qr/destinations` (auth required)
  - `User.vibeSlug` → `${APP_URL}/vibe/${slug}`
  - `ServicePage.slug` (isPublished) → `${APP_URL}/book/${slug}`
  - `Link` ที่ ACTIVE → `shortUrl`
- UI แสดงเฉพาะเมื่อล็อกอิน; anonymous เห็นเฉพาะ URL
- ถ้าไม่มี Vibe Page/Booking Page → แสดงข้อความตรงไปตรงมา + CTA ไปสร้าง

**Acceptance:**

- cross-user ไม่ถูกส่งกลับ (where userId)
- ไม่มีข้อมูล user อื่นใน response
- URL สร้างจาก env ไม่ hardcode

### Phase 7 — Short Link / UTM

- ใช้ `POST /api/links` เดิม (ไม่เขียน logic ซ้ำ)
- UTM fields ตาม UTM builder เดิม
- แสดงความสัมพันธ์ QR ↔ short link
- ถ้าสิทธิ์ไม่พอ → ใช้ URL ตรง + บอกตามจริง

**Acceptance:**

- Free plan สร้าง custom slug ไม่ได้ (API เดิมตอบ 403)
- ไม่มี short link ถูกสร้างซ้ำเมื่อผู้ใช้เลือก link เดิม
- UTM ยังอยู่ใน payload ที่ decode ได้

### Phase 8 — Animation รอบ QR

- CSS เท่านั้น: frame glow, gradient motion ด้านหลัง, floating stickers, CTA pulse
- Canvas QR อยู่นิ่ง 100%
- toggle เปิด/ปิด; default ปิด
- `prefers-reduced-motion` ปิดอัตโนมัติ
- ไม่มี animated export

**Acceptance:**

- ตรวจ DOM ว่า animation อยู่ชั้นนอก canvas
- ปิด motion แล้วไม่มี animation
- preview ระบุชัดว่า "animation ไม่ถูกดาวน์โหลด"

### Phase 9 — Tests + Verification

- Unit: destination, style, health, svg, presets
- Decode: PNG จาก renderer → `jsqr` (พื้นฐาน/Blink/Pank/Print/logo/frame/UTM/short link/logo เกิน)
- Route: `/api/qr/destinations` (401, owner scope, mapping), `/api/qr/validate-destination` (scheme/UTM/rate limit)
- E2E: เปิด `/qr` → ใส่ URL → Blink → logo → เปิด animation → health → download PNG/SVG → decode ไฟล์จริง
- รัน `typecheck`, `test:unit`, `check:charset`, `check:security`, `lint`, `build`

---

## 3. โครงสร้างไฟล์ที่จะเพิ่ม

```
docs/qr-studio/
  inspection.md
  capability-map.md
  implementation-plan.md
  decisions.md

lib/qr/
  types.ts
  destination.ts
  presets.ts
  style.ts
  matrix.ts
  svg.ts
  health.ts
  copy.ts

app/qr/page.tsx
app/api/qr/destinations/route.ts
app/api/qr/validate-destination/route.ts

components/qr/
  qr-studio.tsx
  qr-preview.tsx
  qr-studio.module.css

tests/
  qr-destination.test.ts
  qr-style.test.ts
  qr-health.test.ts
  qr-svg.test.ts
  qr-decode.test.ts
  qr-routes.test.ts

e2e/
  qr-studio.spec.ts
```

> ไม่แตะ `prisma/schema.prisma`, `app/go/[slug]/route.ts`, `app/api/links/route.ts`

---

## 4. Dependencies

| Package | สถานะ | เหตุผล |
|---|---|---|
| `qrcode@1.5.4` | มีอยู่แล้ว | encoder/matrix |
| `jsqr@1.4.0` | เพิ่ม (runtime, dynamic import) | decode จริงฝั่ง client; Apache-2.0; ไม่ส่งข้อมูลออก |
| `pngjs@5.0.0` | มีใน tree ของ `qrcode`; ประกาศเป็น devDependency | เขียน PNG ใน Node test |
| `@types/pngjs@6.0.5` | เพิ่ม (dev) | type safety ใน test |

ไม่มีการเพิ่มบริการภายนอก, ไม่มีค่าใช้จ่าย, ไม่มี secret

---

## 5. Approval Gates ที่อาจเจอ

| Gate | แผนหลีกเลี่ยง |
|---|---|
| Deploy production | ไม่ deploy; ส่งมอบ local |
| Migration/DB | ไม่แก้ schema |
| Secret/env | ไม่เพิ่ม env ใหม่ |
| ค่าใช้จ่าย | client-side only |
| PII | ไม่เก็บ/ไม่ส่ง logo หรือ URL ขึ้น server |
| Social API | ไม่เกี่ยวข้อง |
| Dynamic redirect จริง | ใช้ `/go` เดิม |
| เปลี่ยน tracking เดิม | ไม่แตะ |
| Animated QR modules | ไม่ทำ |

---

## 6. ความเสี่ยงที่ต้องเฝ้า

1. **Logo + dots pattern อาจ decode ไม่ผ่านที่ขนาดเล็ก** → health check + block export เมื่อ fail; E2E ใช้ค่าที่ผ่าน
2. **jsQR อาจ decode QR ที่มี logo ไม่ได้ถ้า logo ใหญ่** → cap 18% + ECC H + decode จากภาพจริง
3. **SVG text ฟอนต์ไทย** → ใช้ `font-family` fallback และบันทึกข้อจำกัด
4. **Playwright E2E ต้องมี dev server** → รัน local port + `APP_TEST_URL`; ไม่ชน prod
5. **`pngjs` เป็น transitive** → ประกาศชัดใน devDependencies เพื่อกัน breaking
6. **Build บน Cloudflare** → ตรวจว่า `jsqr` ถูก bundle ฝั่ง client เท่านั้น (dynamic import)

---

## 7. แผนตรวจสอบ (Verification Matrix)

| ชั้น | คำสั่ง | เกณฑ์ |
|---|---|---|
| Type | `npm run typecheck` | 0 error |
| Unit/decode | `npm run test:unit` | ทุกไฟล์ผ่าน รวมของเดิม |
| Charset | `npm run check:charset` | clean |
| Security | `npm run check:security` | clean |
| Lint | `npm run lint` | 0 error (warning ยอมรับได้ตามเดิม) |
| Build | `npm run build` | สำเร็จ |
| E2E | `APP_TEST_URL=http://127.0.0.1:<port> npx playwright test e2e/qr-studio.spec.ts` | ผ่าน + decode ไฟล์จริง |
| Manual/a11y | keyboard + reduced motion + axe (ถ้ารันได้) | ไม่มี critical |

---

## 8. สิ่งที่ยังไม่ทำหลัง MVP (Phase 2+)

- บันทึก/แชร์ QR asset (QRAsset + migration)
- QR scan analytics แยก
- GIF/MP4/PDF/EPS
- Wi-Fi/vCard/payment/event/geo/deep link
- Workspace/team
- Custom domain
- A/B test QR style
- Server-side batch generation
