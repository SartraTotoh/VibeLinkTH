import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { limitsOf } from "@/lib/plans";
import { getActivePlan } from "@/lib/subscription";
import { bangkokDayKey, reportingWindow, REPORT_TIME_ZONE } from "@/lib/reporting-time";

type Params = { params: Promise<{ id: string }> };

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

const MAX_EVENTS = 20000;

function dayKey(d: Date) {
  return bangkokDayKey(d);
}

function hostOf(raw: string | null) {
  if (!raw) return "direct";
  try {
    return new URL(raw).hostname.replace(/^www\./, "") || "direct";
  } catch {
    return "direct";
  }
}

function countBy<T>(rows: T[], pick: (r: T) => string | null) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r) || "unknown";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, clicks]) => ({ name, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { id } = await params;
  const link = await prisma.link.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, slug: true, title: true },
  });
  if (!link) {
    return NextResponse.json({ error: "ไม่พบลิงก์นี้" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("range") ?? "30d";
  const format = searchParams.get("format") ?? "json";

  const plan = await getActivePlan(session.user.id);
  const limits = limitsOf(plan);
  if (format === "csv" && plan === "FREE") {
    return NextResponse.json(
      { error: "ส่งออก CSV ได้เฉพาะแพ็กเกจ Creator ขึ้นไป" },
      { status: 403 },
    );
  }
  let days = RANGE_DAYS[requested] ?? 30;
  let limited = false;
  if (days > limits.analyticsDays) {
    days = limits.analyticsDays;
    limited = true;
  }

  const window = reportingWindow(days);
  const since = new Date(window.since);
  const fetched = await prisma.linkEvent.findMany({
    where: { linkId: link.id, type: "CLICK", createdAt: { gte: since, lte: new Date(window.until) } },
    select: {
      createdAt: true,
      device: true,
      browser: true,
      os: true,
      country: true,
      referrer: true,
    },
    orderBy: { createdAt: "asc" },
    take: MAX_EVENTS + 1,
  });

  const truncated = fetched.length > MAX_EVENTS;
  const events = fetched.slice(0, MAX_EVENTS);
  const perDay = window.dates.map((date) => ({ date, clicks: 0 }));
  const dayIndex = new Map(perDay.map((p, i) => [p.date, i]));
  for (const e of events) {
    const idx = dayIndex.get(dayKey(e.createdAt));
    if (idx !== undefined) perDay[idx]!.clicks += 1;
  }

  const byDevice = countBy(events, (e) => e.device);
  const byBrowser = countBy(events, (e) => e.browser);
  const byOS = countBy(events, (e) => e.os);
  const byCountry = countBy(events, (e) => e.country);
  const topReferrers = countBy(events, (e) => hostOf(e.referrer)).slice(0, 10);

  if (format === "csv") {
    if (truncated) {
      return NextResponse.json({ error: "ข้อมูลเกินขอบเขต export กรุณาเลือกช่วงวันที่สั้นลง" }, { status: 422 });
    }
    const lines = ["date,clicks", ...perDay.map((p) => `${p.date},${p.clicks}`)];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vibelink-${link.slug}-${days}d.csv"`,
        "Cache-Control": "no-store",
        "X-Report-Timezone": REPORT_TIME_ZONE,
      },
    });
  }

  return NextResponse.json({
    link: { id: link.id, slug: link.slug, title: link.title },
    range: `${days}d`,
    requested,
    limited,
    total: events.length,
    timeZone: REPORT_TIME_ZONE,
    partialToday: true,
    perDay,
    byDevice,
    byBrowser,
    byOS,
    byCountry,
    topReferrers,
    truncated,
  });
}
