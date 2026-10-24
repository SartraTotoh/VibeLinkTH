# Vibe QR Studio — Authenticated E2E Gap Report

- วันที่ตรวจ: 24 ตุลาคม 2026
- ขอบเขต: `/api/qr/destinations` และเส้นทาง authenticated ของ Vibe Page / Booking Page / Short Link
- สถานะ: **ไม่มี Authenticated E2E ที่รันด้วย session จริงในรอบนี้**
- เหตุผล: ไม่มี test session/credential ที่ปลอดภัย และ Prompt A ห้ามสร้าง credential เอง

---

## 1. สิ่งที่ตรวจได้แล้ว (ไม่ใช้ credential)

### 1.1 Route unit tests (mock session + mock Prisma)

ไฟล์: `tests/qr-destinations-route.test.ts` — 6 tests ผ่าน

| กรณี | ผล |
|---|---|
| ไม่มี session → `401` และไม่แตะ DB | ผ่าน |
| มี session → คิวรีด้วย `user.id` ของ session เท่านั้น | ผ่าน |
| Booking ที่ `isPublished: false` ถูกซ่อน | ผ่าน |
| บัญชีที่ไม่มี Vibe Page → ไม่แต่ง URL ขึ้นมา | ผ่าน |
| session ชี้ไป user ที่ไม่มีจริง → `404` | ผ่าน |
| `SHORT_LINK_URL` ไม่ตั้ง → fallback เป็น `APP_URL/go` | ผ่าน |

หลักฐานการผูกขอบเขตผู้ใช้ในโค้ด `app/api/qr/destinations/route.ts`:

```ts
prisma.user.findUnique({ where: { id: session.user.id } })
prisma.servicePage.findUnique({ where: { ownerUserId: session.user.id } })
prisma.link.findMany({ where: { userId: session.user.id, status: "ACTIVE" } })
```

ไม่มี `userId` ที่รับมาจาก client และไม่มี workspace model ใน repo นี้ (single-user boundary)

### 1.2 URL validation

ไฟล์: `tests/qr-validate-route.test.ts` — 8 tests ผ่าน

- scheme allowlist / credentials / UTM keys / malformed body / 429
- ใช้ `session.user.id` เป็น rate-limit key เมื่อล็อกอิน และ `null` เมื่อไม่ล็อกอิน
- **ไม่เรียก `fetch`** (fetch spy) → ไม่มี SSRF
- route ไม่ log URL

### 1.3 Short Link behavior

- ไม่มีการแก้ `app/go/[slug]/route.ts` หรือ logic redirect ในรอบ QR
- QR เป็นเพียงการฝัง URL ของ Short Link เดิมลงในภาพ
- การนับคลิกยังเกิดที่ `/go` ตามเดิม
- **แต่ยังไม่มี E2E ที่ยืนยันพฤติกรรมนี้กับระบบจริงในรอบนี้**

---

## 2. สิ่งที่ยังขาด

| ข้อที่ Prompt A ต้องการ | สถานะ | หมายเหตุ |
|---|---|---|
| `/api/qr/destinations` ไม่มี session → 401 | ✅ unit test | ยังไม่มี E2E |
| User A ไม่เห็น Destination ของ User B | ⚠️ อ่านโค้ด + assert where clause | ยังไม่ได้ทดสอบสองบัญชีจริง |
| Booking ที่ยังไม่ Publish ต้องไม่แสดง | ✅ unit test | ยังไม่ได้ทดสอบกับ DB จริง |
| Vibe Page ที่ไม่มีสิทธิ์ต้องไม่แสดง | ✅ unit test (ไม่มี `vibeSlug`) | repo ไม่มี workspace/ACL จึงไม่มี "สิทธิ์" แบบหลายคน |
| URL Validation ไม่ Fetch ปลายทาง | ✅ unit test | ควรตรวจ outbound log ใน staging อีกชั้น |
| Short Link ไม่เปลี่ยน Behavior เดิม | ⚠️ ตรวจ diff/โค้ด | ยังไม่มี E2E `/go` |
| UI authenticated (dropdown Vibe/Booking/Short) | ❌ | ยังไม่ได้รันด้วย session จริง |

---

## 3. ทำไมจึงยังไม่เพิ่ม E2E

1. `e2e/authed.spec.ts` ใช้ `E2E_EMAIL` และ `E2E_PASS`
2. รอบนี้ตรวจแล้วว่า **ทั้งสองตัวแปรไม่มีค่า** (`E2E_EMAIL is not set`, `E2E_PASS is not set`)
3. ถ้าไม่มี `E2E_EMAIL` test จะถูก `test.skip(...)` ทันที
4. ไม่มี staging account สำหรับ QR โดยเฉพาะ
5. Prompt A ห้ามสร้าง credential เอง และห้ามใช้ Production Database
6. การใช้บัญชีส่วนตัวของเจ้าของหรือบัญชี Production เพื่อทดสอบ cross-user เป็นสิ่งที่ต้องได้รับอนุญาตชัดเจนและควรทำใน staging

> ไม่มีการสร้างบัญชี ไม่มีการเดารหัสผ่าน และไม่มีการใช้ข้อมูลผู้ใช้จริงในรอบนี้

---

## 4. แผนเพิ่ม E2E เมื่อมี Staging Session (งานแยก)

### 4.1 สิ่งที่เจ้าของต้องเตรียม

- Staging environment ที่มี DB แยกจาก Production
- บัญชีทดสอบ 2 บัญชี (A และ B) ที่เจ้าของสร้างเอง
- บัญชี A: มี Vibe Page, Booking Page ที่ Publish แล้ว, Short Link 1 รายการ
- บัญชี B: มีข้อมูลต่างจาก A และมี Booking ที่ยังไม่ Publish 1 รายการ
- ตั้ง environment variable เฉพาะ staging (ห้าม commit ค่า):
  - `E2E_QR_USER_A_EMAIL`
  - `E2E_QR_USER_A_PASS`
  - `E2E_QR_USER_B_EMAIL`
  - `E2E_QR_USER_B_PASS`
  - `APP_TEST_URL` = staging URL

### 4.2 Test cases ที่ต้องเพิ่ม

1. Anonymous `GET /api/qr/destinations` → `401`
2. Login A → API คืนเฉพาะ Vibe/Booking/Short Link ของ A
3. Login B → API คืนเฉพาะของ B
4. A ต้องไม่เห็น slug/URL ของ B แม้แต่รายการเดียว
5. Booking ที่ B ยังไม่ Publish → ไม่ปรากฏในผลของ B
6. บัญชีที่ไม่มี Vibe Page → ไม่มี Vibe destination
7. UI `/qr` ของ A → dropdown แสดงเฉพาะรายการของ A
8. สร้าง QR จาก Short Link ของ A → decode แล้วได้ `https://.../go/<slug>` ของ A
9. คลิก Short Link แล้ว `/go` ยัง redirect และบันทึก event ตาม behavior เดิม
10. `POST /api/qr/validate-destination` → ตรวจ server log ว่าไม่มี outbound request ไปปลายทาง

### 4.3 เกณฑ์ผ่าน

- ทุกข้อข้างต้นผ่านใน staging
- ไม่มีข้อมูลข้ามบัญชีใน response หรือ UI
- ไม่มี regression ของ `/go` หรือ analytics เดิม
- ไม่มี secret/credential ถูก commit

---

## 5. ความเสี่ยงของการเว้นช่องว่างนี้

**ระดับ: กลาง**

- โค้ดฝั่ง server ผูก `userId` จาก session อย่างชัดเจนและมี unit test ยืนยัน where clause
- แต่ unit test ใช้ Prisma mock จึงพิสูจน์ไม่ได้ว่า DB จริง + session จริง + route จริงให้ผลตามที่คาด
- ความเสี่ยงสูงสุดคือ regression ในอนาคต (มีคนแก้ where clause หรือเพิ่ม workspace โดยไม่เพิ่ม test)
- ก่อน Deploy Production ต้องมีอย่างใดอย่างหนึ่ง:
  1. Authenticated E2E ใน staging ผ่านครบ หรือ
  2. เจ้าของ Product ยอมรับ gap เป็นลายลักษณ์อักษร พร้อมระบุความเสี่ยง

---

## 6. สรุป

| คำถาม | คำตอบ |
|---|---|
| มี E2E authenticated ที่รันจริงหรือยัง | **ไม่มี** |
| มี unit/route test ครอบคลุมหรือไม่ | มี 6 + 8 tests |
| มีการสร้าง credential ในรอบนี้หรือไม่ | **ไม่มี** |
| มีการใช้ Production DB หรือไม่ | **ไม่มี** |
| Short Link behavior เปลี่ยนหรือไม่ | ไม่เปลี่ยนจากโค้ดที่ตรวจ |
| ผ่านเกณฑ์ Prompt C ข้อ 4 หรือยัง | **ยังไม่ผ่าน** จนกว่าจะมี E2E staging หรือ written acceptance |
