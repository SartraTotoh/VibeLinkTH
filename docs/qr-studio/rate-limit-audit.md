# Vibe QR Studio — Rate Limit Audit (Read-only)

- วันที่ตรวจ: 24 ตุลาคม 2026
- ขอบเขต: ตรวจโค้ด/Configuration ของ `rateLimitDb` และตาราง `_rate_limit`
- **ไม่มีการสร้างตาราง ไม่มีการรัน Migration ไม่มีการเชื่อมต่อ Production Database และไม่มีการแก้ไขข้อมูลใด ๆ**
- สถานะ: ยังไม่ผ่านเกณฑ์ Rate Limit สำหรับ Production จนกว่าผู้ดูแลจะยืนยันตารางจริง

---

## 1. กลไกที่ระบบคาดหวัง

โค้ดจริง: `lib/rate-limit-db.ts`

| องค์ประกอบ | รายละเอียด |
|---|---|
| ฟังก์ชัน | `rateLimitDb(req, namespace, limit, windowMs, userKey?, mode = "open")` |
| Key | `userKey` ถ้ามี (เช่น user id) ไม่อย่างนั้นใช้ `ip:${clientIp(req)}` |
| Namespace | นำหน้าด้วยชื่อ endpoint เช่น `qr:validate`, `links:create`, `auth:signin` |
| Window | Fixed window: `Math.floor(Date.now() / windowMs)` |
| SQL | `INSERT INTO _rate_limit (key, window_start, count) ... ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 RETURNING count` |
| Timeout | 3,000 ms (`RL_TIMEOUT_MS`) |
| ค่า default เมื่อ DB ล้ม | `mode: "open"` → ผ่าน (`FAIL_OPEN_RESULT`) |
| ค่าเมื่อระบุ `mode: "closed"` | ตั้งใจให้บล็อก (`FAIL_CLOSED_RESULT`) แต่ดูข้อ 4 — ในทางปฏิบัติโค้ดกลืน error ก่อนถึงขั้นตอนนี้ |

**ตารางที่คาดหวัง**

```sql
CREATE TABLE IF NOT EXISTS _rate_limit (
  key TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
```

แหล่งสร้างตารางที่มีอยู่ใน repo: `scripts/create-rate-limit-table.mjs` (สร้างด้วย `CREATE TABLE IF NOT EXISTS`)

**ข้อเท็จจริงสำคัญ**

- ไม่มี model `_rate_limit` ใน `prisma/schema.prisma`
- ไม่มี migration SQL สำหรับตารางนี้ใน `prisma/migrations/`
- ดังนั้น `prisma migrate` / `prisma db push` **ไม่สร้างตารางนี้ให้**
- ตารางต้องถูกสร้างแยกด้วยสคริปต์ข้างต้น หรือด้วยมือ โดยผู้ดูแลเท่านั้น
- `cleanupRateLimitTable()` มีอยู่ในโค้ด แต่ **ไม่มี caller ใน repository** → ไม่มี scheduled cleanup
- `clientIp()` เชื่อเฉพาะ `CF-Connecting-IP`; ถ้าไม่มี header นี้ จะได้ค่า `"unknown"` (ทุกคนใช้ bucket เดียวกัน)

**ขนาดที่ QR ใช้**

- `POST /api/qr/validate-destination` → `rateLimitDb(req, "qr:validate", 60, 60_000, userId ?? null)`
- เป็น public endpoint (ไม่ต้องล็อกอิน) จึงใช้ IP เป็น key เมื่อไม่มี session
- ไม่ fetch ปลายทาง; งานต่อ request เบา (zod + URL parsing)

---

## 2. สภาพแวดล้อมใดมี `_rate_limit`

| สภาพแวดล้อม | สถานะตาราง | หลักฐาน |
|---|---|---|
| Local dev (พอร์ต 3010 รอบนี้) | **ไม่มี** | Dev log แสดง `relation "_rate_limit" does not exist` ขณะ E2E export เรียก `validate-destination` |
| CI / test runner | **ไม่ได้ provision** | Unit tests mock `rateLimitDb`; ไม่มี integration DB สำหรับตารางนี้ |
| Staging | **ยังไม่ยืนยัน** | รอบนี้ไม่เชื่อมต่อ staging DB |
| Production | **ยังไม่ยืนยัน** | รอบนี้ไม่เชื่อมต่อ production DB และไม่มีหลักฐานว่าเคยรันสคริปต์สร้างตาราง |

> สรุปอย่างซื่อสัตย์: **ยังไม่มีสภาพแวดล้อมใดที่ตรวจแล้วยืนยันว่ามีตารางจริง** — local dev ยืนยันว่าไม่มี, staging/production ยังไม่ตรวจ

---

## 3. ทำไม Dev จึง fail-open

1. ตาราง `_rate_limit` ไม่มีใน dev DB
2. `prisma.$queryRawUnsafe(...)` reject ด้วย `relation "_rate_limit" does not exist`
3. โค้ดมี `.catch(() => [{ count: 1 }])` ต่อท้าย query
4. Error ถูกกลืน → ได้ `count = 1`
5. เมื่อ `1 <= limit` ฟังก์ชันคืน `{ ok: true, remaining: ... }`
6. ผลคือ request ผ่านโดยไม่มีการนับจริง

นี่คือ behavior ที่ตั้งใจให้ระบบทน DB ล่ม (`fail-open`) แต่ผลข้างเคียงคือ **ตราบใดที่ตารางยังไม่มี rate limit จะไม่ทำงานเลย**

---

## 4. Production มีความเสี่ยงหรือไม่

**มีความเสี่ยง และไม่ควรถือว่า Rate Limit พร้อมใช้งาน**

ความเสี่ยงหลัก:

1. **ตารางอาจไม่มีใน Production** — ถ้าไม่เคยรัน `scripts/create-rate-limit-table.mjs` ด้วย `DATABASE_URL` ของ Production ตารางจะไม่มี และทุก endpoint ที่พึ่ง `rateLimitDb` จะ fail-open
2. **`mode: "closed"` ไม่ fail-closed จริงเมื่อ DB ล้ม** — เพราะ `.catch(() => [{ count: 1 }])` กลืน error ก่อนถึง `catch` ด้านนอก ทำให้ `FAIL_CLOSED_RESULT` แทบไม่ถูกใช้
   - กระทบเส้น auth ที่ตั้งใจป้องกัน brute force: signin, register, forgot/reset password
   - เป็นปัญหาเดิมของแพลตฟอร์ม ไม่ได้เกิดจาก QR Studio
   - รอบนี้ **ไม่แก้** เพราะอยู่นอกขอบเขต QR และอาจกระทบพฤติกรรม auth/booking ที่ห้ามแตะ
3. **ไม่มี cleanup อัตโนมัติ** — `cleanupRateLimitTable()` ไม่มี caller ทำให้แถวสะสมตามจำนวน key × window
4. **Fallback IP = `"unknown"`** — ถ้า Production ไม่ได้อยู่หลัง Cloudflare จริง หรือ header หลุด ทุกคนจะแชร์ bucket เดียวกัน (อาจ block ผิดคน หรือถูกใช้เป็น denial of service)
5. **QR เป็น public endpoint** — แม้ราคาต่อ request ต่ำและไม่ fetch ปลายทาง แต่ถ้า rate limit ไม่ทำงาน จะไม่มีเพดานป้องกันการยิงถี่

**ระดับความเสี่ยงของ QR เอง:** ต่ำ–กลาง (validation เบา, ไม่มี SSRF, ไม่เขียน DB)  
**ระดับความเสี่ยงของแพลตฟอร์ม:** สูง ถ้า Production ไม่มีตาราง เพราะ auth/register/forgot/reset จะไม่มีการจำกัดความพยายาม

---

## 5. คำสั่งตรวจสอบแบบ Read-only สำหรับผู้ดูแล

รันใน Neon SQL Editor หรือ read-only role เท่านั้น ห้ามรัน `CREATE`, `INSERT`, `UPDATE`, `DELETE`, `DROP` ในขั้นนี้

```sql
-- 1) มีตารางหรือไม่ (NULL = ไม่มี)
SELECT to_regclass('public._rate_limit') AS rate_limit_table;

-- 2) โครงสร้างตาราง
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '_rate_limit'
ORDER BY ordinal_position;

-- 3) Primary key
SELECT a.attname AS pk_column
FROM pg_index i
JOIN pg_attribute a
  ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'public._rate_limit'::regclass
  AND i.indisprimary;

-- 4) จำนวนแถวและช่วงเวลา (อ่านเท่านั้น)
SELECT COUNT(*) AS rows,
       MIN(window_start) AS oldest_window,
       MAX(window_start) AS newest_window
FROM _rate_limit;

-- 5) namespace ที่มีการใช้งาน (ไม่แสดง IP/user id)
SELECT split_part(key, ':', 1) AS namespace, COUNT(*) AS rows
FROM _rate_limit
GROUP BY 1
ORDER BY 2 DESC;

-- 6) ยืนยันว่ากำลังดูฐานข้อมูลไหน (อ่านเท่านั้น)
SELECT current_database(), current_user, version();
```

**วิธีอ่านผล**

- ข้อ 1 ได้ `NULL` → ตารางไม่มี → Rate Limit ไม่ทำงานใน environment นั้น
- ข้อ 1 ได้ `_rate_limit` → ตรวจต่อข้อ 2–3 ว่า column/PK ตรงกับโค้ด
- ข้อ 4 มีแถวเก่ากว่า 1 ชั่วโมงจำนวนมาก → cleanup ไม่ทำงาน
- ข้อ 5 ควรเห็น namespace เช่น `qr`, `links`, `auth`; ถ้าเห็น `ip` หรือ `unknown` ปนกัน ให้ตรวจ header/Edge configuration

**หลังตรวจแล้ว (ต้องขออนุมัติแยกก่อนทำจริง)**

ถ้าตารางไม่มีและเจ้าของอนุมัติ ให้ผู้ดูแลรัน:

```powershell
# ตัวอย่างเท่านั้น — ห้ามรันใน Prompt A
node --env-file=.env scripts/create-rate-limit-table.mjs
```

สคริปต์นี้เป็น `CREATE TABLE IF NOT EXISTS` (ไม่มีข้อมูลเดิมถูกแก้) แต่ยังเป็นการเปลี่ยนแปลง Production Database จึงต้องมี Approval Gate แยก

---

## 6. ข้อสรุปและ Gate

| ข้อ | สถานะ |
|---|---|
| กลไกในโค้ด | มี (`lib/rate-limit-db.ts`) |
| ตารางใน Prisma schema/migration | ไม่มี |
| สคริปต์สร้างตาราง | มี (`scripts/create-rate-limit-table.mjs`) แต่ต้องรันเอง |
| Local dev table | ไม่มี (ยืนยันจาก log) |
| Staging table | ยังไม่ยืนยัน |
| Production table | ยังไม่ยืนยัน |
| Cleanup อัตโนมัติ | ไม่มี |
| `closed` mode fail-closed จริง | ไม่จริงเมื่อ DB error (พบข้อบกพร่องเดิม) |
| ผ่านเกณฑ์ Prompt C ข้อ 6 | **ยังไม่ผ่าน** |

**Gate ก่อน Deploy**

1. ผู้ดูแลรันคำสั่ง read-only ข้างต้นใน Production และแนบผล
2. ถ้าตารางไม่มี → ห้าม Deploy จนกว่าจะได้รับอนุมัติสร้างตาราง หรือมีมาตรการจำกัด public `/qr` ที่ปลอดภัยเทียบเท่า
3. ต้องยอมรับเป็นลายลักษณ์อักษรว่า `mode: "closed"` ยัง fail-open เมื่อ DB error หรืออนุมัติงานแยกให้แก้
4. ต้องมีแผน cleanup แถวเก่า (cron/scheduled query) หรือยอมรับการเติบโตของตาราง
