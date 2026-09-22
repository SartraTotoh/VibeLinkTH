type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const FROM = process.env.EMAIL_FROM ?? "VibeLink <no-reply@vibelinkth.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] to=${to}\nsubject=${subject}\n${text}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
        text,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      }),
    });

    if (!res.ok) {
      console.error("[email] resend failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send error", String(err));
    return false;
  }
}

function layout(heading: string, body: string, cta: { label: string; url: string }) {
  return `<!doctype html><html lang="th"><body style="margin:0;background:#090b10;color:#e2e2e9;font-family:Inter,'Noto Sans Thai',Arial,sans-serif;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#11141c;border:1px solid rgba(185,255,44,.16);border-radius:18px;padding:28px">
    <div style="font-size:20px;font-weight:800;color:#fff">Vibe<span style="color:#b9ff2c">Link</span></div>
    <h1 style="font-size:22px;color:#fff;margin:18px 0 10px">${heading}</h1>
    <div style="color:#c2caae;font-size:14px;line-height:1.7">${body}</div>
    <a href="${cta.url}" style="display:inline-block;margin-top:20px;padding:12px 22px;border-radius:14px;background:linear-gradient(135deg,#ff4fd8,#8b5cf6);color:#fff;font-weight:700;text-decoration:none">${cta.label}</a>
    <p style="margin-top:22px;font-size:12px;color:#8c947a;line-height:1.6">ถ้าปุ่มกดไม่ได้ ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์<br><span style="color:#b9ff2c;word-break:break-all">${cta.url}</span></p>
  </div>
  <p style="max-width:520px;margin:14px auto 0;font-size:11px;color:#8c947a;text-align:center">© 2026 VibeLink · ตอบกลับอีเมลนี้ได้เลยหากต้องการความช่วยเหลือ</p>
</body></html>`;
}

export async function sendVerificationEmail(to: string, name: string | null, url: string) {
  return sendEmail({
    to,
    subject: "ยืนยันอีเมลของคุณเพื่อเริ่มใช้ VibeLink",
    html: layout(
      `สวัสดี${name ? ` ${name}` : ""} 👋`,
      "ยืนยันอีเมลนี้เพื่อเปิดใช้บัญชี VibeLink ของคุณ ลิงก์จะหมดอายุใน 24 ชั่วโมง",
      { label: "ยืนยันอีเมล", url },
    ),
    text: `ยืนยันอีเมล VibeLink ของคุณ: ${url} (ลิงก์หมดอายุใน 24 ชั่วโมง)`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string | null, url: string) {
  return sendEmail({
    to,
    subject: "ตั้งรหัสผ่านใหม่สำหรับ VibeLink",
    html: layout(
      `สวัสดี${name ? ` ${name}` : ""}`,
      "เราได้รับคำขอตั้งรหัสผ่านใหม่ ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องทำอะไร",
      { label: "ตั้งรหัสผ่านใหม่", url },
    ),
    text: `ตั้งรหัสผ่านใหม่ VibeLink: ${url} (ลิงก์หมดอายุใน 1 ชั่วโมง)`,
  });
}
