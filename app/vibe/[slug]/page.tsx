import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "../vibe.module.css";

type Params = { params: Promise<{ slug: string }> };

function platformIcon(platform: string | null) {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("shopee")) return "🛍️";
  if (p.includes("tiktok")) return "🎵";
  if (p.includes("lazada")) return "👗";
  if (p.includes("youtube")) return "▶️";
  if (p.includes("instagram")) return "📸";
  if (p.includes("line")) return "💬";
  return "🔗";
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const user = await prisma.user.findUnique({
    where: { vibeSlug: slug.toLowerCase() },
    select: { displayName: true, vibeTitle: true, vibeBio: true, vibeEmoji: true },
  });
  if (!user) return { title: "Vibe Page | VibeLink" };
  const name = user.displayName || "Vibe";
  return {
    title: `${user.vibeTitle ? `${user.vibeTitle} — ` : ""}${name} | VibeLink`,
    description: user.vibeBio ?? undefined,
    openGraph: {
      title: `${name} | VibeLink`,
      description: user.vibeBio ?? undefined,
      type: "profile",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function VibePage({ params }: Params) {
  const { slug } = await params;
  const user = await prisma.user.findUnique({
    where: { vibeSlug: slug.toLowerCase() },
    select: {
      id: true,
      displayName: true,
      vibeTitle: true,
      vibeBio: true,
      vibeEmoji: true,
    },
  });

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <div className={styles.avatar}>⚡</div>
          <h1 className={styles.name}>ไม่พบหน้า Vibe นี้</h1>
          <p className={styles.bio}>ถ้าคุณเป็นเจ้าของหน้า ลองเช็ก slug ใน Dashboard → Vibe Page อีกครั้ง</p>
        </div>
      </main>
    );
  }

  const now = new Date();
  const links = await prisma.link.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { events: { where: { type: "CLICK" } } } },
    },
    take: 50,
  });

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logoRow}>
          Vibe<em>Link</em> ⚡
        </Link>
        <div className={styles.avatar}>{user.vibeEmoji || "⚡"}</div>
        <h1 className={styles.name}>{user.displayName || "คุณ"}</h1>
        {user.vibeTitle ? <p className={styles.title}>{user.vibeTitle}</p> : null}
        {user.vibeBio ? <p className={styles.bio}>{user.vibeBio}</p> : null}
        <div className={styles.links}>
          {links.length === 0 ? (
            <p className={styles.bio}>ยังไม่มีลิงก์ในหน้านี้</p>
          ) : (
            links.map((l) => (
              <a key={l.id} href={`/go/${l.slug}`} target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                <span className={styles.linkIcon}>{platformIcon(l.platform)}</span>
                <span className={styles.linkBody}>
                  <b>{l.title}</b>
                  <small>{l.destinationUrl.replace(/^https?:\/\//, "")}</small>
                </span>
                <span className={styles.linkClicks}>
                  ⚡ {l._count.events.toLocaleString("en-US")}
                </span>
              </a>
            ))
          )}
        </div>
        <p className={styles.foot}>
          สร้างด้วย <a href="https://vibelinkth.com">VibeLink</a> · สำหรับครีเอเตอร์สายวาร์ป
        </p>
      </div>
    </main>
  );
}