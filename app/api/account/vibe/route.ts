import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  for (const key of ["displayName", "vibeTitle", "vibeBio", "vibeEmoji", "vibeSlug"] as const) {
    const raw = body[key];
    if (raw === undefined) continue;
    if (typeof raw !== "string") {
      return NextResponse.json({ error: `${key} ต้องเป็นข้อความ` }, { status: 400 });
    }
    data[key] = raw.trim();
  }

  let vibeSlug: string | null = null;
  if (data.vibeSlug !== undefined && data.vibeSlug !== "") {
    const slug = data.vibeSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "slug ต้องเป็นตัวอักษรพิมพ์เล็ก ตัวเลข หรือขีดกลาง ยาว 3–30 ตัว" },
        { status: 400 },
      );
    }
    const taken = await prisma.user.findUnique({
      where: { vibeSlug: slug },
      select: { id: true },
    });
    if (taken && taken.id !== session.user.id) {
      return NextResponse.json({ error: "slug นี้ถูกใช้แล้ว ลองใหม่" }, { status: 409 });
    }
    vibeSlug = slug;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName: data.displayName === "" ? null : data.displayName,
      vibeTitle: data.vibeTitle === "" ? null : data.vibeTitle,
      vibeBio: data.vibeBio === "" ? null : data.vibeBio,
      vibeEmoji: data.vibeEmoji === "" ? null : data.vibeEmoji,
      vibeSlug: vibeSlug === null && data.vibeSlug !== undefined ? null : vibeSlug,
    },
    select: {
      displayName: true,
      vibeSlug: true,
      vibeTitle: true,
      vibeBio: true,
      vibeEmoji: true,
    },
  });

  return NextResponse.json({ vibe: user });
}