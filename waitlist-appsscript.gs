/** ============================================================
 *  VibeLink Waitlist — Google Apps Script
 *  ------------------------------------------------------------
 *  วิธีติดตั้ง (ครั้งเดียว ~5 นาที):
 *  1. สร้าง Google Sheet ใหม่ → ตั้งชื่อ "VibeLink Waitlist"
 *  2. แถว 1 พิมพ์หัวคอลัมน์: A1=เวลา, B1=อีเมล, C1=ที่มา
 *     (ไม่พิมพ์ก็ได้ สคริปต์สร้างให้อัตโนมัติ)
 *  3. เมนู Extensions → Apps Script → ลบโค้ดตัวอย่าง
 *     แล้ววางโค้ดนี้ทั้งหมด → กด Save
 *  4. กด Deploy → New deployment → เฟือง ⚙ → เลือก Web app
 *     - Execute as: Me
 *     - Who has access: Anyone   ← สำคัญ ต้องเป็น Anyone
 *  5. กด Deploy → อนุญาตสิทธิ์ (Authorize) → คัดลอก Web app URL
 *     (URL จะลงท้ายด้วย /exec)
 *  6. เอา URL ไปวางในตัวแปร WAITLIST_ENDPOINT ในไฟล์ index.html
 *  ------------------------------------------------------------
 *  หลักการทำงาน: รับ POST จากหน้า Landing → ตรวจรูปแบบอีเมล
 *  → กันอีเมลซ้ำ → บันทึกลงชีต (เวลา, อีเมล, ที่มา)
 *  ข้อมูลเป็นของเรา 100% ส่งออก CSV ย้ายไปฐานข้อมูลจริงได้ทุกเมื่อ
 * ============================================================ */

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Emails");
  if (!sheet) { sheet = ss.getSheets()[0]; }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["เวลา", "อีเมล", "ที่มา"]);
  }

  // อ่านอีเมลจาก JSON body (รองรับทั้ง text/plain และ form)
  var email = "";
  var source = "landing";
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    email = String(body.email || "").trim().toLowerCase();
    source = String(body.source || "landing");
  } catch (err) {
    email = String((e && e.parameter && e.parameter.email) || "").trim().toLowerCase();
  }

  // ตรวจรูปแบบอีเมล (กันสแปม/ค่าว่างฝั่งเซิร์ฟเวอร์)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return out({ ok: false, error: "invalid_email" });
  }

  // กันอีเมลซ้ำ — เคยสมัครแล้วถือว่าสำเร็จ ไม่เพิ่มแถวซ้ำ
  var last = sheet.getLastRow();
  if (last > 1) {
    var seen = sheet.getRange(2, 2, last - 1, 1).getValues();
    for (var i = 0; i < seen.length; i++) {
      if (String(seen[i][0]).trim().toLowerCase() === email) {
        return out({ ok: true, duplicate: true });
      }
    }
  }

  sheet.appendRow([new Date(), email, source]);
  return out({ ok: true });
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
