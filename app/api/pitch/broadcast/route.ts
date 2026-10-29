import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { emailConfigured, sendEmail } from "@/lib/email";
import { rateLimitDb } from "@/lib/rate-limit-db";

export const dynamic = "force-dynamic";

// Public Pitch Studio creates drafts. Server delivery is a separate, opt-in admin capability.
const payloadSchema = z.object({
  recipients: z.array(z.string().trim().email().max(254)).length(1),
  subject: z.string().trim().min(1).max(200).refine((s) => !/[\r\n]/.test(s)),
  html: z.string().trim().min(1).max(20_000),
  text: z.string().trim().min(1).max(10_000),
  requestId: z.string().uuid(),
  consentConfirmed: z.literal(true),
}).strict();

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const origin = req.headers.get("origin");
  let allowedOrigin: string | null = null;
  try {
    allowedOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;
  } catch { /* Invalid configuration must fail closed. */ }
  if (!allowedOrigin || origin !== allowedOrigin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  if (process.env.PITCH_EMAIL_ENABLED !== "true" || !emailConfigured()) {
    return NextResponse.json({ error: "Server delivery is disabled. Use Pitch Studio to prepare a draft." }, { status: 503 });
  }
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  }

  try {
    const raw = await req.text();
    if (raw.length > 40_000) return NextResponse.json({ error: "Message too large" }, { status: 413 });
    const parsed = payloadSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: "Invalid message or recipient confirmation" }, { status: 400 });
    const burst = await rateLimitDb(req, "pitch:send", 3, 10 * 60_000, session.user.id, "closed");
    const daily = burst.ok
      ? await rateLimitDb(req, "pitch:daily", 20, 24 * 60 * 60_000, session.user.id, "closed")
      : burst;
    if (!burst.ok || !daily.ok) {
      return NextResponse.json({ error: "Delivery limit reached or temporarily unavailable" }, {
        status: 429, headers: { "Retry-After": String(Math.max(burst.retryAfter, daily.retryAfter)) },
      });
    }
    const { recipients, subject, html, text, requestId } = parsed.data;
    const idempotencyKey = createHash("sha256").update(`${session.user.id}:${requestId}`).digest("hex");
    const accepted = await sendEmail({ to: recipients[0]!, subject, html, text, idempotencyKey });
    if (!accepted) return NextResponse.json({ error: "Email provider did not accept the message" }, { status: 502 });
    return NextResponse.json({ ok: true, acceptedCount: 1 });
  } catch {
    return NextResponse.json({ error: "Unable to process the message" }, { status: 400 });
  }
}
