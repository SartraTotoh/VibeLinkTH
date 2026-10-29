import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { liveJson, liveUser, smallJson } from "@/lib/live/http.server";
import { publicShow } from "@/lib/live/store.server";

const schema = z.object({ id: z.uuid(), title: z.string().trim().min(1).max(100), aspect: z.enum(["landscape", "portrait"]) });
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const access = await liveUser(req); if (access.response) return access.response;
  const shows = await prisma.liveShow.findMany({ where: { userId: access.userId }, include: { output: true }, orderBy: { createdAt: "desc" }, take: 20 });
  return liveJson({ shows: shows.map(publicShow) });
}
export async function POST(req: Request) {
  const access = await liveUser(req, true); if (access.response) return access.response;
  const parsed = schema.safeParse(await smallJson(req).catch(() => null));
  if (!parsed.success) return liveJson({ error: "ข้อมูลรายการไม่ถูกต้อง" }, 400);
  const d = parsed.data;
  await prisma.$executeRaw`INSERT INTO "LiveShow" ("id","userId","title","aspect") VALUES (${d.id},${access.userId},${d.title},${d.aspect}) ON CONFLICT DO NOTHING`;
  const show = await prisma.liveShow.findFirst({ where: { id: d.id, userId: access.userId }, include: { output: true } });
  if (!show) return liveJson({ error: "มีรายการที่ยังไม่ปิด กรุณากลับเข้ารายการเดิมก่อน" }, 409);
  return liveJson({ show: publicShow(show) });
}
