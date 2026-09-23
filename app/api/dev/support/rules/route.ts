import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordSecurityAttempt } from "@/lib/security";
import { hasHardSig, sanitizeValue } from "@/lib/charset";
import { DEFAULT_RULES } from "@/lib/support";
import { writeAudit } from "@/lib/audit";

const KEYWORDS_MAX = 60;
const TEXT_MAX = 1200;

function ruleShape(r: {
  id: string;
  enabled: boolean;
  priority: number;
  keywords: string;
  replyTh: string;
  replyEn: string;
  faqTh: string | null;
  faqEn: string | null;
  category: string;
  hitCount: number;
}) {
  return {
    id: r.id,
    enabled: r.enabled,
    priority: r.priority,
    keywords: r.keywords,
    replyTh: r.replyTh,
    replyEn: r.replyEn,
    faqTh: r.faqTh,
    faqEn: r.faqEn,
    category: r.category,
    hitCount: r.hitCount,
  };
}

function validateRule(input: {
  priority?: unknown;
  keywords?: unknown;
  replyTh?: unknown;
  replyEn?: unknown;
  faqTh?: unknown;
  faqEn?: unknown;
  category?: unknown;
  enabled?: unknown;
}) {
  const out: Record<string, string | number | boolean> = {};

  if (typeof input.keywords === "string") {
    const kw = input.keywords.split(",").map((k) => k.trim()).filter(Boolean).join(",");
    if (!kw) return { error: "ใส่คำค้นอย่างน้อย 1 คำ" };
    if (kw.length > 600) return { error: "คำค้นยาวเกินไป" };
    if (hasHardSig(kw)) return { error: "อักขระผิด (mojibake)" };
    out.keywords = kw;
  }

  for (const field of ["replyTh", "replyEn"] as const) {
    if (typeof input[field] === "string") {
      const v = input[field]!.trim();
      if (!v) return { error: "กรอกคำตอบให้ครบ (ไทย/อังกฤษ)" };
      if (v.length > TEXT_MAX) return { error: "คำตอบยาวเกินไป" };
      if (hasHardSig(v)) return { error: "อักขระผิด (mojibake)" };
      out[field] = v;
    }
  }

  for (const field of ["faqTh", "faqEn"] as const) {
    if (typeof input[field] === "string") {
      const v = input[field]!.trim();
      if (hasHardSig(v)) return { error: "อักขระผิด (mojibake)" };
      out[field] = v.slice(0, 300);
    }
  }

  if (typeof input.category === "string") {
    out.category = input.category.trim().slice(0, 60) || "general";
  }

  if (typeof input.priority === "number" && Number.isFinite(input.priority)) {
    out.priority = Math.max(0, Math.min(9999, Math.round(input.priority)));
  }

  if (typeof input.enabled === "boolean") {
    out.enabled = input.enabled;
  }

  return { patch: out };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/support/rules",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rules = await prisma.autoReplyRule.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    rules: rules.map(ruleShape),
    totalHits: rules.reduce((n, r) => n + r.hitCount, 0),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/support/rules",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const action = new URL(req.url).searchParams.get("action");
  if (action === "seed") {
    const existing = await prisma.autoReplyRule.count();
    const rl = rateLimit(`support:seed:${session?.user?.email}`, 2, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "ลองใหม่ในอีกสักครู่" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
    if (existing > 0) {
      return NextResponse.json({ error: "มีกฎอยู่แล้ว — ลบทั้งหมดก่อนจึงค่อย seed ใหม่", rules: existing }, { status: 409 });
    }
    await prisma.autoReplyRule.createMany({
      data: DEFAULT_RULES.map((r, i) => ({
        enabled: true,
        priority: r.priority,
        keywords: r.keywords,
        replyTh: r.replyTh,
        replyEn: r.replyEn,
        faqTh: r.faqTh,
        faqEn: r.faqEn,
        category: r.category,
        hitCount: 0,
      })),
      skipDuplicates: true,
    });
    await writeAudit({
      actorEmail: session?.user?.email ?? undefined,
      action: "support.seed_rules",
      subjectType: "SUPPORT",
      detail: `สร้างกฎ auto-reply เริ่มต้น ${DEFAULT_RULES.length} ข้อ`,
      result: "success",
    });
    const rules = await prisma.autoReplyRule.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "asc" }] });
    return NextResponse.json({ rules: rules.map(ruleShape) });
  }

  const raw = (await req.json().catch(() => null)) as {
    priority?: number;
    keywords?: string;
    replyTh?: string;
    replyEn?: string;
    faqTh?: string;
    faqEn?: string;
    category?: string;
    enabled?: boolean;
  } | null;
  if (!raw) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const cleaned = sanitizeValue(raw);
  const check = validateRule(cleaned);
  if (check.error) return NextResponse.json({ error: check.error }, { status: 400 });

  const patch = check.patch!;
  if (typeof patch.keywords !== "string" || typeof patch.replyTh !== "string" || typeof patch.replyEn !== "string") {
    return NextResponse.json({ error: "ต้องกรอกคำค้น + คำตอบทั้งไทย/อังกฤษ" }, { status: 400 });
  }

  const rule = await prisma.autoReplyRule.create({
    data: {
      enabled: patch.enabled !== undefined ? (patch.enabled as boolean) : true,
      priority: (patch.priority as number) ?? 100,
      keywords: patch.keywords,
      replyTh: patch.replyTh,
      replyEn: patch.replyEn,
      faqTh: (patch.faqTh as string | undefined) ?? null,
      faqEn: (patch.faqEn as string | undefined) ?? null,
      category: (patch.category as string) ?? "general",
    },
  });

  await writeAudit({
    actorEmail: session?.user?.email ?? undefined,
    action: "support.create_rule",
    subjectType: "SUPPORT",
    subjectRef: rule.id,
    detail: `สร้างกฎ auto-reply`,
    result: "success",
  });

  return NextResponse.json({ rule: ruleShape(rule) });
}