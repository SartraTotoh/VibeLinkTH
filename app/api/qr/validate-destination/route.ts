import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { rateLimitDb } from "@/lib/rate-limit-db";
import { validateDestination, type QrUtmConfig } from "@/lib/qr/destination";

export const dynamic = "force-dynamic";

const schema = z.object({
  url: z.string().min(1).max(4096),
  utm: z
    .record(z.string(), z.union([z.string().max(120), z.null()]))
    .optional(),
});

/**
 * Server-side authority for the URL that ends up inside the QR.
 * It never fetches the URL (no SSRF) and never logs the URL value.
 */
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const limited = await rateLimitDb(req, "qr:validate", 60, 60_000, session?.user?.id ?? null);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `ตรวจ URL ถี่เกินไป — ลองใหม่ใน ${limited.retryAfter} วินาที` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const utm: QrUtmConfig = {};
  for (const [key, value] of Object.entries(parsed.data.utm ?? {})) {
    if (typeof value === "string" && value.trim() !== "") utm[key as keyof QrUtmConfig] = value;
  }

  const result = validateDestination(parsed.data.url, utm);
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    url: result.url,
    host: result.host,
    https: result.isHttps,
    hadUtm: result.hadUtm,
    warnings: result.warnings,
  });
}
