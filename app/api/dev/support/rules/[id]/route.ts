import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { recordSecurityAttempt } from "@/lib/security";
import { hasHardSig, sanitizeValue } from "@/lib/charset";
import { writeAudit } from "@/lib/audit";

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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/support/rules",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const rl = rateLimit(`support:rule:${session?.user?.email}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "แก้ไขบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const existing = await prisma.autoReplyRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบกฎนี้" }, { status: 404 });
  }

  const raw = (await req.json().catch(() => null)) as {
    enabled?: boolean;
    priority?: number;
    keywords?: string;
    replyTh?: string;
    replyEn?: string;
    faqTh?: string | null;
    faqEn?: string | null;
    category?: string;
  } | null;
  if (!raw) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const cleaned = sanitizeValue(raw);
  const data: {
    enabled?: boolean;
    priority?: number;
    keywords?: string;
    replyTh?: string;
    replyEn?: string;
    faqTh?: string | null;
    faqEn?: string | null;
    category?: string;
  } = {};

  if (typeof cleaned.enabled === "boolean") data.enabled = cleaned.enabled;
  if (typeof cleaned.priority === "number" && Number.isFinite(cleaned.priority)) {
    data.priority = Math.max(0, Math.min(9999, Math.round(cleaned.priority)));
  }
  if (typeof cleaned.category === "string") data.category = cleaned.category.trim().slice(0, 60) || "general";

  if (typeof cleaned.keywords === "string") {
    const kw = cleaned.keywords.split(",").map((k) => k.trim()).filter(Boolean).join(",");
    if (kw.length > 600) return NextResponse.json({ error: "คำค้นยาวเกินไป" }, { status: 400 });
    if (hasHardSig(kw)) return NextResponse.json({ error: "อักขระผิด (mojibake)" }, { status: 400 });
    data.keywords = kw;
  }

  for (const field of ["replyTh", "replyEn"] as const) {
    if (typeof cleaned[field] === "string") {
      const v = cleaned[field]!.trim();
      if (v.length > TEXT_MAX) return NextResponse.json({ error: "คำตอบยาวเกินไป" }, { status: 400 });
      if (hasHardSig(v)) return NextResponse.json({ error: "อักขระผิด (mojibake)" }, { status: 400 });
      data[field] = v;
    }
  }

  for (const field of ["faqTh", "faqEn"] as const) {
    if (typeof cleaned[field] === "string" || cleaned[field] == null) {
      const v = (cleaned[field] ?? "").trim();
      if (hasHardSig(v)) return NextResponse.json({ error: "อักขระผิด (mojibake)" }, { status: 400 });
      data[field] = v.slice(0, 300) || null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลให้แก้" }, { status: 400 });
  }

  const rule = await prisma.autoReplyRule.update({ where: { id }, data });

  await writeAudit({
    actorEmail: session?.user?.email ?? undefined,
    action: "support.update_rule",
    subjectType: "SUPPORT",
    subjectRef: rule.id,
    detail: `แก้ไขกฎ auto-reply`,
    result: "success",
  });

  return NextResponse.json({ rule: ruleShape(rule) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    await recordSecurityAttempt({
      path: "/api/dev/support/rules",
      ip: clientIp(req),
      reason: "unauthorized dev access",
    });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.autoReplyRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบกฎนี้" }, { status: 404 });
  }

  await prisma.autoReplyRule.delete({ where: { id } });
  await writeAudit({
    actorEmail: session?.user?.email ?? undefined,
    action: "support.delete_rule",
    subjectType: "SUPPORT",
    subjectRef: id,
    detail: `ลบกฎ auto-reply`,
    result: "success",
  });

  return NextResponse.json({ ok: true });
}