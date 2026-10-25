import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

type DestinationOption = {
  type: "vibe" | "booking";
  label: string;
  url: string;
};

type ShortLinkOption = {
  id: string;
  title: string;
  slug: string;
  shortUrl: string;
  destinationUrl: string;
};

/**
 * Reads only the signed-in user's own Vibe Page, published Booking Page and
 * active Short Links. There is no workspace model in this repo, so user scoping
 * is the boundary (see docs/qr-studio/inspection.md).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const [user, links] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { displayName: true, vibeSlug: true, vibeTitle: true, vibeEmoji: true },
    }),
    prisma.link.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, slug: true, destinationUrl: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
  }

  const base = appUrl();
  const destinations: DestinationOption[] = [];

  if (user.vibeSlug) {
    destinations.push({
      type: "vibe",
      label: user.vibeTitle || user.displayName || `Vibe ${user.vibeEmoji ?? ""}`.trim(),
      url: `${base}/vibe/${user.vibeSlug}`,
    });
  }

  // Booking/VibeBook destinations are intentionally omitted in this release
  // because the ServicePage model is not available in this codebase snapshot.
  // Re-enable when VibeBook is integrated into the deployed schema.

  const shortBase = (process.env.SHORT_LINK_URL ?? `${base}/go`).replace(/\/$/, "");
  const shortLinks: ShortLinkOption[] = links.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    shortUrl: `${shortBase}/${l.slug}`,
    destinationUrl: l.destinationUrl,
  }));

  return NextResponse.json({
    ok: true,
    destinations,
    shortLinks,
    bookingPublished: false,
    vibeReady: Boolean(user.vibeSlug),
  });
}
