import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { liveJson } from "@/lib/live/http.server";
import { mediaConfigured } from "@/lib/live/config.server";
import { closeShow } from "@/lib/live/service.server";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = req.headers.get("authorization") ?? "";
  if (!expected) return liveJson({ error: "unavailable" }, 503);
  const a = Buffer.from(supplied); const b = Buffer.from(`Bearer ${expected}`);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return liveJson({ error: "unauthorized" }, 401);
  if (!mediaConfigured() || process.env.LIVE_SCHEMA_READY !== "true") return liveJson({ error: "unavailable" }, 503);
  // Run at least once a minute. Both bounds are server authoritative.
  const now = Date.now();
  const shows = await prisma.liveShow.findMany({ where: { closedAt: null, OR: [
    { closingAt: { not: null } },
    { connectedAt: { not: null }, lastSeenAt: { lt: new Date(now - 90_000) } },
    { connectedAt: { lt: new Date(now - 15 * 60_000) } },
    { connectedAt: null, createdAt: { lt: new Date(now - 60 * 60_000) } },
  ] }, take: 20 });
  let closed = 0; let pending = 0;
  for (const show of shows) try { if (await closeShow(show.id)) closed++; else pending++; } catch { pending++; }
  return liveJson({ checked: shows.length, closed, pending });
}
