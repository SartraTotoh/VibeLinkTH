import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MOBILE_RE = /Mobile|Android|iPhone/i;
const TABLET_RE = /iPad|Tablet/i;

function parseUA(ua: string | null) {
  if (!ua) return { device: null, browser: null, os: null };
  const device = TABLET_RE.test(ua) ? "tablet" : MOBILE_RE.test(ua) ? "mobile" : "desktop";

  let browser = "other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";

  let os = "other";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { device, browser, os };
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limited = rateLimit(`go:${clientIp(req)}`, 600, 60_000);
  if (!limited.ok) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }

  const { slug } = await params;
  const now = new Date();
  const link = await prisma.link.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { id: true, userId: true, destinationUrl: true, status: true, expiresAt: true },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (!link || link.status !== "ACTIVE" || (link.expiresAt && link.expiresAt <= now)) {
    return NextResponse.redirect(`${appUrl}/?link=not-found`, 302);
  }

  const ua = parseUA(req.headers.get("user-agent"));
  await prisma.linkEvent.create({
    data: {
      type: "CLICK",
      userId: link.userId,
      linkId: link.id,
      referrer: req.headers.get("referer"),
      device: ua.device,
      browser: ua.browser,
      os: ua.os,
      country: req.headers.get("cf-ipcountry"),
    },
  });

  return NextResponse.redirect(link.destinationUrl, 302);
}
