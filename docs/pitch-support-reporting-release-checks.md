# Pitch, Support Admin และ CEO — ชุดแก้ไขและเงื่อนไขก่อนปล่อย

วันที่ตรวจ: 29 ตุลาคม 2026
Base: main 0355149a3bfb6cb372e1dde949cace07867948ed

## สิ่งที่ยืนยันจาก source และแก้ในสาขานี้

| พื้นที่ | ปัญหา | การแก้ |
| --- | --- | --- |
| Support Admin / CEO | SupportChatModule ใช้ fontSize 150–158px และกริดขั้นต่ำรวมมากกว่า 700px | ใช้ 15–24px, คอลัมน์ยุบที่ 900px, ตัดคำยาว, เลื่อนเฉพาะกล่องข้อความ |
| Support Admin | การอ่าน Inbox ล้มเหลวแต่แสดงเหมือนงานว่าง | แสดงสถานะโหลด/ข้อผิดพลาด/ลองใหม่ ป้องกันผลตอบกลับเก่าทับข้อมูลใหม่ |
| CEO | breakpoint 860px อยู่ท้าย breakpoint 480px จึงทับ mobile layout | เรียง breakpoint ให้ mobile override ทำงานท้ายสุด |
| CEO | ดึงสถานะ Resend โดยไม่มี timeout | จำกัดเวลาแต่ละ request 5 วินาที และมี route error boundary เมื่อโหลดหน้าไม่สำเร็จ |
| CEO | ส่งค่าลับเต็มไปยังเบราว์เซอร์เพื่อ reveal/copy | ส่งเฉพาะ boolean configured ไม่ส่งค่า secret |
| Public /pitch | เครื่องมือภายในฝังรายชื่อ/อีเมลและส่งจากหน้าเว็บ | แทนด้วย Pitch Studio หนึ่งฟีเจอร์: ร่าง/แก้/คัดลอก/ดาวน์โหลดข้อความในเบราว์เซอร์ ไม่มีรายชื่อสำเร็จรูป ไม่มีการส่ง ไม่มี localStorage |
| Static landing | pitch.html และ CSV มีข้อมูลผู้รับ | แทน pitch.html ด้วยทางเข้าฟีเจอร์ ลบ CSV ทั้งสองไฟล์ เพิ่ม redirect สำหรับ /pitch และ /pitch.html |
| Email API | ไม่พบ auth check ใน main | ต้อง login + admin + same Origin; ปิดส่งโดย default; ยืนยันผู้รับหนึ่งราย; schema validation; DB quota แบบ fail closed; provider idempotency key |
| Attribution | fallback จากเลขที่คล้ายกัน/แคมเปญเดียวทำให้ผูกผิด | รับ ID หรือชื่อ/slug ที่ตรงชัดเจน ไม่มี fallback จากเลขหรือจำนวนแคมเปญ; duplicate UTM ไม่ผูกแคมเปญ |
| Redirect | การอ่าน/เขียนข้อมูล analytics ล้มเหลวทำให้ destination ไม่เปิด | analytics failure ไม่ขวาง redirect และไม่ log URL หรือผู้ใช้ |
| รายงาน | bucket UTC กับวันที่ไทยคลาดกัน; export ตัดข้อมูลเงียบ | bucket และ calendar window Asia/Bangkok, ระบุวันนี้ยังไม่ครบวัน; JSON แจ้ง partial; CSV ปฏิเสธเมื่อเกิน 20,000 events |
| Retention / conversion | ใช้ visitor clicks แทนกิจกรรม creator และหาร subscription ด้วยคลิก | แสดง D7/D30 และ attributed purchase conversion ว่ายังไม่มีข้อมูล; ไม่สร้าง historical MRR/growth จากเฉพาะแถว ACTIVE ปัจจุบัน |
| การตลาด | สัญญา Dynamic QR scan analytics, มัดจำ, 0.04s, commission/scan guarantee | ปรับ visible copy และ JSON-LD ให้ตรง Static QR / Short Link / click analytics; booking และ Vibe Page ระบุสถานะพัฒนา/ต้นแบบ |
| ระยะจัดเก็บ | ระยะดูรายงานอาจถูกอ่านว่าเป็นนโยบายลบ | แยก report access window ออกจาก data deletion ในคำอธิบาย |

## สิ่งที่ยังยืนยัน production ไม่ได้

การเข้าสู่ระบบผ่านเบราว์เซอร์ตรวจงานถูกปฏิเสธด้วยข้อความอีเมลหรือรหัสผ่านไม่ถูกต้อง จึงยังไม่ได้ตรวจ Console หลัง login ของ Support Admin หรือ CEO และยังไม่ทราบว่า deployed version ตรงกับ base commit ใด ไม่มีการลองส่งอีเมลจริงหรือยิง mutation เพื่อพิสูจน์ช่องโหว่บน production

Console ที่อ่านได้ก่อน login มีข้อความจาก chrome-extension:// เท่านั้น ไม่ใช่หลักฐานว่า application มีข้อผิดพลาดเดียวกัน การตรวจ UI fixture ในเครื่องผ่าน cloud browser ถูก ERR_CONNECTION_REFUSED จึงยังไม่มี visual acceptance หลังแก้

ผลในเอกสารนี้เป็นผล source audit ไม่ใช่การยืนยันว่า production มีช่องโหว่ หรือได้รับการแก้แล้ว

## ขั้นตอนตรวจ staging ก่อน merge/deploy

- [ ] ระบุ release SHA ของ app และ landing เทียบ main อย่างชัดเจน
- [ ] ใช้บัญชีทดสอบ admin เปิด /support > Admin และ /ceo; ตรวจ Console และ Network โดยไม่เก็บ token, cookie, payload ผู้รับ หรือ secret ในหลักฐาน
- [ ] ตรวจที่ viewport 360, 390, 768, 1024 และ 1440px: ไม่มี horizontal overflow, หัวข้อและไอคอนขนาดปกติ, มือถือแสดงคอลัมน์เดียว
- [ ] ตรวจ Inbox: loading, empty, data, 401/403/404/500, offline และ retry; เปลี่ยน filter/เลือกเธรดเร็ว; ไม่ขึ้นว่าไม่มีงานเมื่อ API ล้มเหลว
- [ ] ใช้เธรดทดสอบเท่านั้น ตรวจ reply/resolve/reopen และเลื่อนข้อความ; เปิดเธรดมีผลต่อสถานะอ่านแล้ว
- [ ] ตรวจ /ceo เมื่อ Resend ช้า/ล่ม และเมื่อ DB ใช้งานไม่ได้; ไม่แสดง stack trace หรือค่าลับใน HTML, RSC, JS หรือ Network
- [ ] เปิด /pitch ทั้ง app และ landing; view source, JS assets และ Network ต้องไม่มีรายชื่อเดิมหรือการส่งข้อมูลฟอร์มออกนอกหน้า
- [ ] สร้างร่างด้วยชื่อสมมติ; แก้ subject/body, copy, download; ตรวจที่จอเล็ก
- [ ] Email API ใน staging: anonymous=401, member=403, origin ผิด/ไม่มี=403, default disabled=503, schema ผิด=400, quota unavailable=429; อย่าส่งเมลจริง ใช้ provider mock/sandbox
- [ ] อย่าเปิด PITCH_EMAIL_ENABLED จนกว่าจะมี suppression/opt-out processing, หลักฐานสิทธิ์ติดต่อ, audit trail, bounce/complaint handling และผู้รับผิดชอบตรวจคำกล่าวอ้าง ระบบนี้ยังไม่ใช่ self-service email sending สำหรับสมาชิก
- [ ] ตรวจ attribution: Thai name, exact ID, slug, ชื่อซ้ำ, UTM ซ้ำ, ไม่มี UTM และเลขโปรโมชันเหมือนกัน; ห้ามตีความคลิกเป็นคนไม่ซ้ำ/scan/ยอดขาย
- [ ] ตรวจ timezone ตัดวันที่ 17:00 UTC = 00:00 Bangkok; ยอดรายวันตรง CSV; วันนี้มีป้าย partial
- [ ] ทดสอบ 20,000 และ 20,001 events; เคสหลังแจ้ง JSON partial และไม่ export CSV ที่ขาดข้อมูล
- [ ] Retention ต้องแสดงว่าไม่ได้วัดจนกว่าจะมี creator activity event และ cohort definition; ไม่แสดง 0% เป็นผลจริง
- [ ] นโยบายลบข้อมูลจริง: ยังไม่พบ scheduled purge ของ LinkEvent ตาม 7/90/365 วัน อย่าอ้างว่าช่วงดูรายงานเป็น retention/deletion policy; ยืนยัน owner, ตารางข้อมูล, backup lifecycle และ deletion evidence ก่อนสัญญาอายุข้อมูล
- [ ] แก้ support rules ที่เคยบันทึกใน DB ด้วยผู้ดูแล: การเปลี่ยน DEFAULT_RULES ไม่เขียนทับ rule ที่มีอยู่แล้วโดยอัตโนมัติ

## หลัง deploy ที่ได้รับอนุมัติ

- [ ] อัปเดตทั้ง Next app และ static landing (คนละชุด artifact)
- [ ] ล้าง CDN/cache ของ pitch.html และ CSV เก่า ตรวจ URL เก่าแบบไม่ login และ search index ตามที่ควบคุมได้
- [ ] การลบไฟล์ในสาขานี้ไม่ลบ Git history, clone, cache หรือสำเนาที่บุคคลอื่นดาวน์โหลด; ต้องประเมินและจัดการข้อมูลที่เผยแพร่ไปแล้วแยกต่างหาก ห้ามประกาศว่าลบทุกสำเนาสำเร็จ
- [ ] ตรวจ Console และ UI ซ้ำบน deployed SHA พร้อมหลักฐานที่ไม่เผยข้อมูลผู้รับ
- [ ] ยังไม่ส่ง Wave 1 จนกว่าจะผ่าน contact verification, claims/CTA review และ readiness ของแต่ละราย; วันที่ follow-up 30 ต.ค. ไม่ใช่เส้นตายส่ง
- [ ] ไม่มี automatic write-back ไป Workbook และไม่มีการส่งอีเมลในงานชุดนี้

## Admin Desk follow-up (29 ตุลาคม 2026)

แก้ปุ่มตั้งค่าให้ PUT /api/dev/support ซึ่งเป็น route ที่รองรับจริง (เดิมส่งไป /rules ซึ่งไม่มี PUT) และแก้ partial settings update ไม่ให้ล้างเวลาทำการที่ไม่ได้ส่งมา เพิ่มการ refresh เธรดที่เปิดทุก 8 วินาทีโดยเก็บร่างที่ยังไม่ส่งไว้ รีเฟรช Inbox หลังตอบกลับ และล็อกการสลับเธรด/ส่งซ้ำระหว่าง mutation รวมถึงไม่ส่ง Enter ขณะ IME กำลังประกอบข้อความ

ตัวนับรอตอบมาจาก count แยกจาก filter และรายการ “ทั้งหมด” ไม่ตัดเธรดที่ปิดแล้วเกิน 7 วันออก รายการยังจำกัด 500 เธรดตาม API เดิม

เพิ่ม regression tests 8 กรณี ครอบคลุม component ที่ render จริงด้วย API จำลองและ API settings/counts โดยไม่มีการส่งข้อความหาสมาชิกจริง ทั้งชุดผ่าน 173 tests จาก 25 ไฟล์, TypeScript และ production build ผ่าน ยังรอการตรวจ Console/ภาพหน้าจอหลัง login บน production เพราะการเข้าถึง Session ยังไม่สำเร็จ

## Deep review และ deploy attempt — 29 ตุลาคม 2026

ผล source/deployment audit รอบเพิ่มเติม:

- พบ `PrismaNeonHttp.startTransaction()` ใน dependency ปัจจุบัน reject ด้วย `Transactions are not supported in HTTP mode` แต่ทั้ง member auto-reply และ admin reply เรียก Prisma `$transaction` อยู่ จึงเปลี่ยนเป็น parameterized PostgreSQL CTE statement เดียวต่อหนึ่ง turn เพื่อให้ message, ticket status และ rule counter สำเร็จ/rollback พร้อมกัน ไม่เปลี่ยน schema หรือ migrate production
- ทดสอบ SQL ที่ใช้งานจริงกับ PostgreSQL ผ่าน PGlite: ภาษาไทย/อักขระ SQL ถูกเก็บเป็นข้อมูล, ลำดับ MEMBER→AUTO ถูกต้อง, matched/unmatched queue ถูกต้อง และข้อผิดพลาดตอนอัปเดต ticket ย้อนกลับ message ได้จริง
- ฝั่งสมาชิกแสดงข้อผิดพลาดโหลดข้อมูลพร้อม retry, ไม่เปิดส่งก่อนโหลดสำเร็จ, กันส่งซ้ำและ stale polling response, รองรับ IME และเลื่อนเฉพาะกล่องข้อความ
- พบ `cf:build` ล้มเหลวหลัง Next build ผ่าน เพราะ Prisma WASM patch รองรับเฉพาะ loader รุ่นเก่า แก้ให้รองรับ generated edge loader และเอา absolute build-machine WASM path ออก พร้อม fail-closed เมื่อพบรูปแบบไม่รู้จัก และ regression tests
- อัปเดต Next เป็น 15.5.28, sharp เป็น 0.35.5 และ Zod ตั้งแต่ 4.6.7 รวมถึง overrides สำหรับ PostCSS, source-map-js และ deepmerge-ts แก้ advisory โดยไม่ย้าย major Prisma/schema ทั้งระบบ ตรวจ Prisma validate/generate, TypeScript และ Worker build หลังแก้แล้ว
- Override deepmerge-ts ข้าม major ใช้เฉพาะ dependency ของ Prisma config ในต้นไม้ปัจจุบัน ตรวจ Prisma CLI validate/generate กับ schema โครงการผ่านแล้ว ควรลบ override เมื่ออัปเกรด Prisma ที่อ้างอิง dependency ที่แก้ไขโดยตรงในรอบถัดไป
- CI ตรวจ source security และ npm production audit เพิ่มเติม ส่วน E2E ใช้ localhost และชุด public smoke แบบ read-only แทนการส่ง request ที่อาจสร้างบัญชี/ส่งเมลบน production
- ตั้ง `PITCH_EMAIL_ENABLED=false` ใน Worker config โดยชัดแจ้ง และเพิ่ม health release field ซึ่งรับ `RELEASE_SHA` เมื่อ deploy

ผลตรวจ:

| การตรวจ | ผล |
| --- | --- |
| Unit/component/PostgreSQL regression | 183 tests / 28 files ผ่าน |
| Public smoke บน build จริงที่ localhost | 12 ผ่าน (HTTP request checks ไม่ใช่ visual/a11y acceptance) |
| Prisma schema validate + generate | ผ่าน ไม่มีการเปลี่ยนฐานข้อมูลจริง |
| TypeScript / charset / source security / diff whitespace | ผ่าน |
| OpenNext Cloudflare build รวม WASM patch | ผ่าน |
| Wrangler deploy --dry-run | ผ่าน |
| npm audit --omit=dev | 0 รายการที่รายงาน ณ เวลาตรวจ ไม่ใช่การรับประกันว่าไม่มีช่องโหว่ทุกชนิด |
| Production deploy | ไม่สำเร็จ: ไม่มี CLOUDFLARE_API_TOKEN และไม่มี Wrangler login |
| Authenticated production Console / visual acceptance / live Neon round-trip | ยังไม่ได้ตรวจ: ไม่มี authenticated session/production credentials |

ได้ลอง `CI=1 npx wrangler deploy` จริงแล้ว CLI หยุดด้วยข้อความว่าใน non-interactive environment ต้องตั้ง CLOUDFLARE_API_TOKEN ก่อน ไม่ได้อัปโหลดหรือเปลี่ยน production ไม่สร้าง temporary account เพราะไม่ใช่บัญชี/โดเมน production ของโครงการ การอนุญาต deploy จากผู้ใช้มีแล้ว สิ่งที่ยังขาดคือข้อมูลยืนยันตัวตน Cloudflare ในสภาพแวดล้อม deploy และข้อมูลโครงการ static landing ที่ผูกโดเมนอยู่

แหล่งอ้างอิงประกอบการเลือกแพตช์:
- https://nextjs.org/blog/nextjs-security-update-october-14-2026
- dependency advisory metadata จาก npm audit และ implementation ของไดรเวอร์ใน node_modules/@prisma/adapter-neon
