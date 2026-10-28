import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = new Set([
  "bank.cheewath@shopeemobile-external.com",
  "aun.intharavong@shopee.com",
  "opor.anukhroh@shopee.com",
  "hagrid.pornpras@shopee.com",
  "tongta.thaisath@shopee.com",
  "earth.chamnanphon@shopee.com",
  "first.thammaki@shopee.com",
  "bonus.sanwong@shopee.com",
  "dear.kulnaratorn@shopee.com",
  "mook.siriprap@shopee.com",
  "tao.sitikham@shopee.com",
  "sattra.th@gmail.com",
  "sartra.tapo@vibelinkth.com",
]);

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("cf-connecting-ip") || "anonymous";
    const limited = rateLimit(`pitch-broadcast:${ip}`, 5, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: "ส่งบ่อยเกินไป กรุณารอ 10 นาที" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.recipients) || body.recipients.length === 0) {
      return NextResponse.json({ error: "Invalid recipients" }, { status: 400 });
    }

    const { subject, html, text, recipients } = body;
    if (!subject || !html) {
      return NextResponse.json({ error: "Subject and HTML are required" }, { status: 400 });
    }

    const results: { to: string; ok: boolean }[] = [];
    for (const to of recipients) {
      const cleanTo = String(to).trim().toLowerCase();
      // Allow only the specified list or admin email for safety
      if (!ALLOWED_EMAILS.has(cleanTo)) {
        results.push({ to: cleanTo, ok: false });
        continue;
      }
      const ok = await sendEmail({
        to: cleanTo,
        subject,
        html,
        text: text || "VibeLinkTH Ex-Team Announcement",
      });
      results.push({ to: cleanTo, ok });
    }

    return NextResponse.json({
      ok: true,
      sentCount: results.filter((r) => r.ok).length,
      total: results.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
