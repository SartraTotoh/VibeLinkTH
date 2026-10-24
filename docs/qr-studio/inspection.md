# Vibe QR Studio — Repository Inspection

> วันที่สำรวจ: 2026-10-24
> ขอบเขต: อ่านโค้ดจริงใน repository `vibelink` (working tree) โดยยังไม่แก้ไข feature ใด ๆ
> เอกสารนี้เป็นหลักฐานการสำรวจก่อน implement ตาม Master Prompt ข้อ 5

---

## 1. สรุปสั้น

| หัวข้อ | ข้อเท็จจริงจาก repo |
|---|---|
| Framework | Next.js App Router (installed `next@15.5.25`, `package.json` ระบุ `^15.5.4`) |
| Runtime | React 19.3.0, TypeScript 5.9.3, Node 24 (เครื่อง local) |
| Deploy target | Cloudflare Workers ผ่าน OpenNext (`@opennextjs/cloudflare@1.20.6`) + `wrangler.jsonc` |
| Database | PostgreSQL (Neon) ผ่าน Prisma 6.19.3 + `@prisma/adapter-neon` |
| Auth | NextAuth v5 beta (`next-auth@5.0.0-beta.32`) แบบ Credentials + JWT session |
| QR ที่มีอยู่ | `qrcode@1.5.4` (encode only) ใช้ใน `components/dashboard/link-qr-modal.tsx` |
| Workspace model | **ไม่มี** — ระบบเดิม scope ข้อมูลด้วย `userId` (single-user boundary) |
| Storage สำหรับ export | **ไม่มี object storage** — export เดิม stream CSV/JSON จาก route โดยตรง |
| Test runner | Vitest 5.0.1 (`tests/**/*.test.ts`) + Playwright 1.63 |
| Design language | Dark glass + radial gradient + lime/violet, Material Symbols, ห้ามเส้นขอบสี |

**ข้อสรุปสำคัญ:** QR Studio ควรเป็น **client-side renderer** ที่ใช้ `qrcode` เดิมสร้าง matrix และเพิ่ม presentation layer เอง โดยไม่เพิ่มตาราง DB, ไม่แตะ redirect เดิม และไม่สร้างระบบ Short Link/UTM/Analytics ซ้ำ

---

## 2. Framework และ Runtime

### 2.1 Next.js

- App Router อยู่ใต้ `app/` ทั้งหมด
- หน้า public ใช้ server component + `export const dynamic = "force-dynamic"` เมื่ออ่าน DB
- API ใช้ Route Handlers (`app/api/**/route.ts`) และตอบ JSON รูปแบบ `{ ok, ... }` หรือ `{ error: "ข้อความไทย" }`
- CSP ถูกกำหนดที่ `next.config.ts` และอนุญาต `img-src 'self' data: blob: https:` — รองรับ QR preview/export แบบ data URL และ blob URL ได้โดยไม่ต้องแก้ CSP
- `Permissions-Policy` ปิด `camera=()` ไว้ — **ห้ามออกแบบฟีเจอร์ที่ต้องใช้กล้องใน MVP** (เช่น live scanner)
- `X-Frame-Options: DENY` — preview ต้องอยู่ในหน้าเว็บเท่านั้น ไม่ทำ embed iframe

### 2.2 Cloudflare Workers

- `wrangler.jsonc` ชี้ `main: custom-worker.ts`, เปิด `nodejs_compat`
- Routes ของแอปอยู่บน `app.vibelinkth.com/*`; apex `vibelinkth.com` รับเฉพาะ `/api/*`, `/go/*`, `/book/*`, `_next/*` และ guard `.env`
- **ผลต่อการออกแบบ:** ถ้าเพิ่มหน้า public `/qr` บน `app.vibelinkth.com` จะใช้งานได้ทันทีโดยไม่ต้องแก้ route/DNS — แต่การ deploy ยังต้องขออนุมัติ (Approval Gate)
- Workers ไม่มี Canvas API และมี CPU limit → การ export PNG/SVG ต้องทำฝั่ง client หรือสร้าง pixel buffer เองแบบ pure TS (ไม่พึ่ง native canvas บน server)

### 2.3 Fonts / Icons

- IBM Plex Sans + IBM Plex Sans Thai ผ่าน `next/font/google` (`app/layout.tsx`)
- Material Symbols โหลดจาก Google Fonts ใน `<head>` และใช้ผ่าน class `.ms`
- **ไม่มี icon library อื่น** — ต้องใช้ Material Symbols ตามเดิม

---

## 3. คำสั่งจริงสำหรับ Dev / Test / Lint / Typecheck / Build

จาก `package.json` (ไม่มีการเดา):

```bash
npm run dev                 # next dev
npm run build               # next build
npm run lint                # next lint
npm run typecheck           # tsc --noEmit
npm run test:unit           # vitest run
npm run test:e2e            # playwright test e2e/smoke.spec.ts (baseURL = prod โดย default)
npm run test:a11y           # playwright test e2e/a11y.spec.ts
npm run check:charset       # node scripts/check-charset.mjs
npm run check:security      # node scripts/check-security.mjs (secret scan + env guard)
npm run cf:build            # opennextjs-cloudflare build + patch prisma
npm run cf:deploy           # charset + security + cf:build + wrangler deploy
```

ข้อควรระวัง:

- `test:e2e` ค่า default ชี้ `https://app.vibelinkth.com` (`playwright.config.ts`) → **ห้ามรัน E2E ใหม่ชน production โดยไม่ตั้ง `APP_TEST_URL` ไป local**
- ไม่มีสคริปต์ `format` และไม่มี Prettier config → ใช้รูปแบบไฟล์เดิม (2 spaces, double quotes, semicolons)
- `lint` เป็น `next lint` ซึ่งอาจ interactive ครั้งแรก — ต้องรันแบบ CI ให้ผ่านก่อนอ้างผล
- `check:security` สแกนเฉพาะไฟล์ที่ **track อยู่ใน git** และตรวจ guard routes ใน `wrangler.jsonc`

---

## 4. Route / API ที่เกี่ยวข้อง

### 4.1 หน้าเว็บ

| Route | ไฟล์ | บทบาท |
|---|---|---|
| `/` | `app/page.tsx` | landing ในแอป |
| `/dashboard` | `app/dashboard/page.tsx` | workspace หลัก: links, analytics, Vibe, VibeBook, campaigns |
| `/vibe/[slug]` | `app/vibe/[slug]/page.tsx` | Vibe Page สาธารณะ (อ่าน `User.vibeSlug`) |
| `/book/[slug]` | `app/book/[slug]/page.tsx` | Booking Page สาธารณะ (อ่าน `ServicePage.slug` + `isPublished`) |
| `/go/[slug]` | `app/go/[slug]/route.ts` | redirect authority ของ short link |
| `/settings` | `app/settings/page.tsx` | account/billing/PDPA |
| `/cookies` | `app/cookies/page.tsx` | นโยบายคุกกี้ v2 + consent |
| `/login`, `/signup` | `app/login/page.tsx`, `app/signup/page.tsx` | auth |

### 4.2 API ที่เกี่ยวกับ QR Studio

| API | ไฟล์ | สิ่งที่ทำ |
|---|---|---|
| `POST/GET /api/links` | `app/api/links/route.ts` | สร้าง/อ่าน short link; ตรวจ plan, quota, slug, rate limit |
| `PATCH/DELETE /api/links/[id]` | `app/api/links/[id]/route.ts` | แก้/ปิดลิงก์; ตรวจเจ้าของ |
| `GET /api/links/[id]/stats` | `app/api/links/[id]/stats/route.ts` | สถิติคลิก |
| `GET /go/[slug]` | `app/go/[slug]/route.ts` | redirect + บันทึก `LinkEvent` |
| `POST /api/service-events` | `app/api/service-events/route.ts` | event ของ VibeBook (view/booking) |
| `POST /api/campaigns` | `app/api/campaigns/route.ts` | campaign/UTM record |
| `GET /api/health` | `app/api/health/route.ts` | health (ซ่อนรายละเอียด stripe แล้ว) |

**ไม่มี** API สำหรับ QR โดยเฉพาะ, ไม่มี validate-destination, ไม่มี export endpoint

---

## 5. Auth และขอบเขตข้อมูล

- `auth.ts`: NextAuth Credentials + PrismaAdapter + JWT session; `session.user.id` คือ user id
- `middleware.ts` กันเฉพาะ `/dashboard`, `/settings`, `/support` ด้วยการเช็ค cookie ชื่อ session (ไม่ได้ตรวจ role)
- ทุก API ที่แตะข้อมูลส่วนตัวเรียก `auth()` เองและกรองด้วย `session.user.id`
- **ไม่มี `Workspace` / `Team` / membership table** → คำว่า "workspace isolation" ใน prompt ต้อง map เป็น **user isolation** ตามข้อเท็จจริง
- `Link` มี `userId` + `@@index([userId, status])`; `ServicePage` มี `ownerUserId` แบบ unique; `Booking` มี `providerUserId`
- การเข้าถึงข้าม user ต้อง fail ที่ query level (where userId) ไม่ใช่แค่ซ่อน UI

**ข้อห้ามที่พบ:** ห้ามสร้าง model Workspace ใหม่เพื่อให้ตรง prompt — จะซ้ำและผิดสถาปัตยกรรมเดิม

---

## 6. Model/Table เดิมที่นำกลับมาใช้ได้

| Model | ใช้ทำอะไรใน QR Studio |
|---|---|
| `User` | `vibeSlug`, `vibeTitle`, `displayName` → สร้าง Vibe Page URL |
| `Link` | short link ที่มีอยู่ → สร้าง QR ชี้ `/go/[slug]` |
| `LinkEvent` | นับ scan/click เมื่อผู้ใช้สแกน QR ที่ชี้ short link (ผ่าน `/go`) |
| `ServicePage` | `slug`, `isPublished` → สร้าง Booking Page URL |
| `Service` | ใช้แสดงชื่อบริการในตัวเลือก (ถ้าต้องการ) |
| `ServiceEvent` | ไม่แตะใน MVP |
| `Campaign` | เก็บ UTM/campaign ที่มีอยู่แล้ว — ไม่สร้างใหม่ |
| `Plan`/`Subscription` | ตรวจสิทธิ์สร้าง short link (ผ่าน `/api/links` เดิม) |

**ไม่ต้องเพิ่ม model `QRAsset` ใน MVP** เพราะยังไม่มี requirement ให้บันทึก/แชร์/แก้ไข QR ภายหลัง และการเพิ่มตาราง = migration (Approval Gate)

---

## 7. วิธีสร้าง Short Link และ Redirect (ของเดิม)

### 7.1 สร้าง

`POST /api/links`:

1. `auth()` → 401 ถ้าไม่ล็อกอิน
2. `rateLimitDb(req, "links:create", 30, 60_000, session.user.id)`
3. zod: `destinationUrl` 1–2048, `title` ≤120, `slug` ≤30
4. `sanitizeObject` + `hasHardSig` กัน mojibake
5. `normalizeDestination` อนุญาตเฉพาะ `http:`/`https:`
6. `limitsOf(await getActivePlan(userId))` → `customSlug`, `maxActiveLinks`
7. ตรวจ slug ซ้ำ/สงวน (`isValidSlug` + `RESERVED_SLUGS`)
8. `prisma.link.create` แล้วคืน `shortUrl = ${SHORT_LINK_URL}/${slug}`

### 7.2 Redirect

`GET /go/[slug]`:

1. rate limit 600/min ต่อ IP (in-memory)
2. หา link ตาม slug; ต้อง `ACTIVE` และไม่หมดอายุ
3. ถ้าไม่พบ → redirect ไป `/?link=not-found`
4. หา campaign ที่ match แล้วบันทึก `LinkEvent` (CLICK, device/browser/os/country/referrer)
5. redirect 302 ไป `destinationUrl`

**จุดสำคัญ:** ปลายทางมาจาก DB เท่านั้น; client กำหนดเองไม่ได้ → สอดคล้องกฎ "server-side redirect authority"

### 7.3 Slug

- `randomSlug()` 6 ตัวจาก alphabet ที่ตัดตัวอักษรคล้ายกัน
- `isValidSlug()` 3–30 ตัว, a-z/0-9/ขีดกลาง, ห้าม reserved
- Free plan ตั้ง slug เองไม่ได้ (`customSlug: false`)

**ผลต่อ QR Studio:** Flow C ต้องเรียก `/api/links` เดิมเท่านั้น ห้ามเขียน logic สร้าง link ใหม่ใน QR Studio

---

## 8. UTM / Campaign

- `components/dashboard/utm-builder-modal.tsx` ทำงานฝั่ง client: เติม `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ref=vibelink` ลง `destinationUrl` แล้ว `PATCH /api/links/[id]`
- `Campaign` model เก็บ source/medium/content และผูก `linkId`
- `lib/campaign-attribution.ts` ใช้ match campaign จาก destination ตอน redirect
- **ไม่มี API สร้าง UTM แยก** และไม่มี validation UTM แบบเข้ม (ความยาว/อักขระ) ในโค้ดเดิม

**ผลต่อ QR Studio:** ใช้รูปแบบเดียวกับ UTM builder (เติม query param ลง destination) และให้ server validate ค่าที่จะใส่ QR ผ่าน endpoint ใหม่ที่ไม่แตะ DB

---

## 9. Analytics

- `LinkEvent`: CLICK + device/browser/os/country/referrer; query ตาม `userId` และ `linkId`
- `ServiceEvent`: VibeBook events (view/booking)
- Dashboard อ่านสูงสุด 20,000 events ต่อช่วง plan
- GA4 เป็น consent-first: `components/consent/analytics-gate.tsx` + `lib/analytics` (เฉพาะ `ga-event.ts`), ID ว่าง = ไม่ยิงอะไรเลย
- **ไม่มี QR scan analytics แยก** — ถ้า QR ชี้ short link การนับจะเกิดที่ `/go` ตามปกติ; ถ้า QR ชี้ URL ตรง จะวัดไม่ได้ และต้องบอกผู้ใช้ตามจริง

---

## 10. Storage และวิธีสร้างไฟล์ Export

- ไม่มี R2/S3 binding ใน `wrangler.jsonc`
- ไม่มี `fs` write ใน production routes
- Export เดิม:
  - `app/api/account/export/route.ts` → JSON stream
  - `app/api/account/export-csv/route.ts` → CSV
- QR เดิม: `QRCode.toDataURL()` สร้าง PNG data URL ใน browser แล้ว `<a download>` — ไม่มี server roundtrip
- `pngjs@5.0.0` มีอยู่แล้วใน dependency tree ของ `qrcode` (ใช้ได้ใน test)
- `sharp@0.35.4` เป็น transitive ของ Next (ไม่ควรใช้เป็น dependency โดยตรงของ feature)

**ผลต่อ QR Studio:** export PNG/SVG ฝั่ง client เท่านั้น; ไม่มีไฟล์ผู้ใช้ถูกอัปโหลดขึ้น server; ไม่มีค่าใช้จ่าย storage เพิ่ม

---

## 11. QR ที่มีอยู่แล้ว (ตรวจก่อนติดตั้งอะไรใหม่)

`components/dashboard/link-qr-modal.tsx`:

```ts
import QRCode from "qrcode";
QRCode.toDataURL(shortUrl, { width: 640, margin: 1 })
```

ข้อจำกัด:

- ได้แค่ PNG สี่เหลี่ยมสีเดียว
- `margin: 1` → **quiet zone ไม่ผ่านมาตรฐาน** (ควร ≥4 modules)
- ไม่มี logo/frame/CTA/pattern/eye
- ไม่มี SVG
- ไม่มี decode/health check
- ไม่มี preview หลายพื้นผิว

**สรุป:** `qrcode` ใช้เป็น encoder ต่อได้ (มี `create()` คืน matrix) แต่ต้องสร้าง renderer/presentation ใหม่เอง; ยังไม่มี decoder ใน repo

---

## 12. UI / Design conventions ที่ต้องทำตาม

จาก `AGENTS.md` และ `app/globals.css`:

- **ห้ามเส้นขอบสี** — ใช้ `border: 1px solid transparent` + `radial-gradient(...)` + `box-shadow`
- การ์ดใช้ `background: radial-gradient(...), var(--panel)` และ `box-shadow`
- ปุ่มกลุ่มเดียวกันขนาดเท่ากันและเต็มความกว้าง (`display: grid; grid-template-columns: repeat(n, 1fr)`)
- Icon-first ด้วย Material Symbols + accessible label
- `prefers-reduced-motion` มี global override อยู่แล้วใน `globals.css` (但仍ต้องออกแบบ animation ให้ปิดได้)
- ภาษาไทยเป็นหลัก; `useLang()` + `t()` สำหรับข้อความทั่วไป
- Modal ใช้ `.modal-overlay` / `.modal-card`; ปุ่ม `.button`, `.mini-btn`; ฟิลด์ `.field`
- Dashboard tabs อยู่ใน `components/dashboard/tabs/*` และมี CSS module ของตัวเอง

---

## 13. Testing conventions

- Vitest: `tests/*.test.ts`, import จาก `../lib/...` หรือ alias `@/`
- Playwright: `e2e/*.spec.ts`, config baseURL = prod โดย default
- Tests เดิมเน้น pure logic (links, plans, funnel, security paths) และ route handler tests บางส่วน
- **ไม่มี test DB fixture กลาง** และไม่มี seed script สำหรับ integration
- `tests/kill-switches.test.mjs` เป็นไฟล์ต่างถิ่น (untracked) — ห้ามแตะ/ลบโดยไม่ได้รับอนุญาต
- Chromium ของ Playwright ติดตั้งแล้ว (`chromium-1200`, `chromium-1243`)

---

## 14. จุดที่ยังไม่ควรเดา

1. **Production URL ของ Vibe Page / Booking Page** — ต้องสร้างจาก `APP_URL`/`NEXT_PUBLIC_SITE_URL` + path จริง (`/vibe/[slug]`, `/book/[slug]`) ไม่ใช่ hardcode โดเมน
2. **สิทธิ์สร้าง short link ในแผนจริง** — ต้องใช้ `/api/links` เดิม; ห้ามคำนวณ quota เอง
3. **พฤติกรรม `/go` เมื่อลิงก์หมดอายุ** — มีอยู่แล้ว; QR Studio ต้องไม่เปลี่ยน
4. **ว่า QR scan จะถูกนับเป็น click อะไร** — นับเป็น CLICK ที่ `/go` ตามเดิมเท่านั้น; URL ตรงวัดไม่ได้
5. **GA4 property ID** — ยังว่าง; ห้ามสมมติว่ามี analytics ภายนอก
6. **Workspace** — ไม่มีในระบบ; ห้ามสร้าง
7. **ฟอนต์ใน SVG** — ฟอนต์ไทยอาจไม่ถูก embed; ต้องยอมรับว่าข้อความ CTA ใน SVG ขึ้นกับฟอนต์ปลายทาง
8. **ขนาด QR ที่พิมพ์จริง** — ขึ้นกับผู้ใช้; ต้องให้ผู้ใช้ระบุ mm และเตือนตามค่าจริง

---

## 15. ความเสี่ยงและคำถามค้าง

| ความเสี่ยง | ระดับ | แนวทาง |
|---|---|---|
| Decode test ต้องใช้ decoder ใหม่ (`jsqr`) | กลาง | เพิ่มเป็น dependency ฝั่ง client + dev test; บันทึกเวอร์ชัน/เหตุผล; ไม่ส่งข้อมูลออก |
| `qrcode` ไม่รองรับ eye/pattern custom | กลาง | ใช้ `QRCode.create()` แล้ว render เองจาก matrix |
| การ decoration (logo/frame) ทำให้สแกนไม่ผ่าน | สูง | บังคับ quiet zone ≥4, logo ≤18%, ECC H เมื่อมี logo, decode จากภาพจริงก่อนอนุญาต export |
| SVG อาจมี XSS ถ้ารับ SVG ผู้ใช้ | สูง | **ปฏิเสธ SVG logo**; รับเฉพาะ raster ที่ re-encode ผ่าน canvas; SVG export สร้างเองและ escape ข้อความ |
| Public tool ถูก spam | กลาง | generation ฝั่ง client ไม่มี server cost; `/api/qr/validate-destination` มี rate limit; `/api/links` มี rate limit เดิม |
| เพิ่ม dependency ใหม่ | ต่ำ | `jsqr` (Apache-2.0, local-only) + `pngjs` (dev, มีอยู่แล้วใน tree) |
| E2E ชน production | สูง | บังคับ `APP_TEST_URL=http://127.0.0.1:<port>` และใช้ mock URL เท่านั้น |
| Working tree มี cambios ค้างจำนวนมาก | กลาง | ไม่ commit/deploy; รายงานเฉพาะไฟล์ที่เพิ่ม/แก้ในรอบนี้ |

### คำถามที่ต้องตอบก่อน Phase 2 (ไม่บล็อก MVP)

- ต้องการบันทึก QR asset ลง DB หรือไม่ (ต้อง migration + approval)
- ต้องการ QR analytics แยก (scan event) หรือพอใจกับ click ที่ `/go`
- ต้องการ animated export (GIF/MP4) หรือไม่ — ต้อง decode ทุกเฟรมและมีค่าใช้จ่าย
- ต้องการ custom domain สำหรับ public QR tool หรือไม่

---

## 16. สรุปทางเลือกสถาปัตยกรรม

| ทางเลือก | ข้อดี | ข้อเสีย | ข้อสรุป |
|---|---|---|---|
| A. Client-only render + public `/qr` | ไม่มี server cost, ไม่มี PII อัปโหลด, E2E ไม่ต้องใช้ DB, เร็ว | วัดผล QR ตรงไม่ได้, โหลด bundle | **เลือก** |
| B. Server render ผ่าน Workers | ควบคุม output ได้ | ไม่มี canvas, CPU limit, ต้อง rate limit/queue, เพิ่ม cost | ไม่เลือก |
| C. ใช้ third-party QR API | เร็ว | ส่ง URL ผู้ใช้ออกนอก, cost, privacy | **ห้าม** |
| D. เพิ่ม QRAsset table | แชร์/แก้ไขภายหลังได้ | migration + approval + scope โต | Phase 2 |

---

## 17. หลักฐานการสำรวจ (ไฟล์ที่อ่าน)

- `AGENTS.md`, `package.json`, `package-lock.json`, `next.config.ts`, `wrangler.jsonc`, `middleware.ts`, `auth.ts`
- `prisma/schema.prisma` (22 models/enums)
- `lib/links.ts`, `lib/url.ts`, `lib/plans.ts`, `lib/rate-limit-db.ts`, `lib/security.ts`
- `app/api/links/route.ts`, `app/go/[slug]/route.ts`, `app/api/service-events/route.ts`
- `app/dashboard/page.tsx`, `app/vibe/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, `app/layout.tsx`
- `components/dashboard/link-qr-modal.tsx`, `utm-builder-modal.tsx`, `link-manager.tsx`, `tabs/*`
- `app/globals.css` (tokens/motion), `components/i18n/language.tsx`, `lib/i18n.ts`
- `scripts/check-security.mjs`, `vitest.config.ts`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `tests/links.test.ts`
- `docs/HANDOVER.md`, `docs/vibelink-audit-2026-10-23.md`
