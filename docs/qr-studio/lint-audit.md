# Vibe QR Studio — Lint Audit

- วันที่ตรวจ: 24 ตุลาคม 2026
- สถานะ: **`npm run lint` ยังรันไม่ได้** — ไม่ใช่ "lint ผ่าน"
- รอบนี้ **ไม่ติดตั้ง ESLint และไม่เพิ่ม config** ตามข้อกำหนดของ Prompt A

---

## 1. ข้อเท็จจริงที่ตรวจ

| สิ่งที่ตรวจ | ผล |
|---|---|
| `.eslintrc`, `.eslintrc.*` | ไม่พบ |
| `eslint.config.js` / `.mjs` / `.cjs` / `.ts` | ไม่พบ |
| `eslint` ใน `package.json` (dependencies/devDependencies) | ไม่พบ |
| `eslint-config-next` | ไม่พบ |
| Script `lint` | มี แต่เป็น `next lint` |
| `npm run lint` | EXIT 1 และเปิด prompt interactive |

หลักฐานจาก `npm run lint` (ป้อน stdin ว่างเพื่อไม่ให้ค้าง):

```text
> vibelink@0.1.0 lint
> next lint

`next lint` is deprecated and will be removed in Next.js 16.
? How would you like to configure ESLint?
❯  Strict (recommended)
   Base
   Cancel

Exited with code 1
```

**ไม่มีไฟล์ config ถูกสร้างขึ้นจากคำสั่งนี้** (ตรวจซ้ำหลังรันแล้ว)

---

## 2. ทำไมจึงไม่แก้ในรอบนี้

1. Prompt A สั่งชัดเจนว่าห้ามติดตั้งหรือเพิ่ม ESLint config
2. การเพิ่ม ESLint ใน working tree ที่มีงานค้างจำนวนมากอาจทำให้เกิด error/pre-existing warnings ทั้ง repo
3. `next lint` ถูก deprecate แล้ว — ทางที่ถูกต้องคือ migrate ไป ESLint CLI (`eslint .`) พร้อม flat config
4. การเปลี่ยน lint toolchain ควรเป็นงานแยกที่มีเจ้าของอนุมัติ และควรทำหลังแยกงาน QR ออกจากงานค้างเดิม

---

## 3. งานแยกที่เสนอ (ยังไม่ทำ)

1. เพิ่ม `eslint@9` + `eslint-config-next` (หรือ config ที่ทีมเลือก) เป็น devDependency
2. สร้าง `eslint.config.mjs` แบบ flat config
3. เปลี่ยน script จาก `next lint` เป็น `eslint .`
4. กำหนด ignore สำหรับ `.next`, `node_modules`, `test-results`, `playwright-report`, ไฟล์ backup
5. รัน baseline แล้วแยก error เดิมออกจาก error ของ QR
6. เพิ่ม lint เข้า CI หลัง baseline สะอาดหรือมี approved rule set

**ต้องขออนุมัติก่อน** เพราะเป็นการเพิ่ม dependency และเปลี่ยนเครื่องมือคุณภาพทั้ง repo

---

## 4. สิ่งที่ใช้ทดแทนชั่วคราว (ไม่เท่ากับ lint)

รอบนี้ใช้:

- `npm run typecheck`
- `npm run test:unit`
- QR Playwright E2E
- `npm run build`
- `npm run check:charset`
- `npm run check:security`

ข้อจำกัด: ชุดนี้จับ type error, behavior regression, build error, encoding และ secret leak ได้บางส่วน แต่ **ไม่ทดแทนกฎ lint** เช่น unused vars, hook rules, accessibility rules หรือ import order

---

## 5. สรุป

| คำถาม | คำตอบ |
|---|---|
| มี ESLint config หรือไม่ | ไม่มี |
| `npm run lint` รันได้หรือไม่ | ไม่ได้ (EXIT 1, interactive prompt) |
| รายงานว่า lint ผ่านได้หรือไม่ | **ไม่ได้** |
| ติดตั้ง ESLint ในรอบนี้หรือไม่ | ไม่ได้ |
| เป็นงานแยกหรือไม่ | ใช่ |
