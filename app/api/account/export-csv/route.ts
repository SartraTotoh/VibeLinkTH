import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActivePlan } from "@/lib/subscription";

function csvCell(v: string | number | null) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const plan = await getActivePlan(session.user.id);
  if (plan === "FREE") {
    return NextResponse.json(
      { error: "ส่งออก CSV ได้เฉพาะแพ็กเกจ Creator ขึ้นไป" },
      { status: 403 },
    );
  }

  const base = (process.env.SHORT_LINK_URL ?? "").replace(/\/$/, "");
  const links = await prisma.link.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: {
      _count: { select: { events: { where: { type: "CLICK" } } } },
    },
  });

  const lines = [
    "title,slug,short_url,destination_url,platform,status,clicks,created_at",
    ...links.map((l) =>
      [
        csvCell(l.title),
        csvCell(l.slug),
        csvCell(`${base}/${l.slug}`),
        csvCell(l.destinationUrl),
        csvCell(l.platform),
        csvCell(l.status),
        String(l._count.events),
        csvCell(l.createdAt.toISOString()),
      ].join(","),
    ),
  ];

  return new NextResponse("\uFEFF" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vibelink-links.csv"',
      "Cache-Control": "no-store",
    },
  });
}
