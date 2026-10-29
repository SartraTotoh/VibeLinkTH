import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { destinationUrl, liveAllowedHosts } from "@/lib/live/config.server";
import { liveJson, liveUser, smallJson } from "@/lib/live/http.server";
import { startProviderOutput, verifyProgramTracks } from "@/lib/live/provider.server";
import { acceptProviderInfo, reconcileOutput } from "@/lib/live/service.server";
import { publicShow, reserveOutput } from "@/lib/live/store.server";
const schema = z.object({ requestId: z.uuid(), endpoint: z.string().max(512), streamKey: z.string().min(1).max(256), videoTrackId: z.string().regex(/^TR_[A-Za-z0-9]+$/), audioTrackId: z.string().regex(/^TR_[A-Za-z0-9]+$/) });
type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, context: Context) {
  const access = await liveUser(req, true); if (access.response) return access.response;
  const { id } = await context.params;
  const show = await prisma.liveShow.findFirst({ where: { id, userId: access.userId }, include: { output: true } });
  if (!show) return liveJson({ error: "ไม่พบรายการ" }, 404);
  if (show.closedAt || show.closingAt) return liveJson({ error: "รายการปิดแล้วหรือกำลังปิด" }, 409);
  const parsed = schema.safeParse(await smallJson(req).catch(() => null));
  if (!parsed.success) return liveJson({ error: "ข้อมูลปลายทางหรือภาพรายการไม่ถูกต้อง" }, 400);
  const d = parsed.data;
  if (show.output) return show.output.requestId === d.requestId ? liveJson({ show: publicShow(show) }) : liveJson({ error: "รายการนี้มีคำขอส่งออกแล้ว ตรวจสถานะเดิมก่อน" }, 409);
  let url: string;
  try { url = destinationUrl(d.endpoint, d.streamKey, liveAllowedHosts()); }
  catch { return liveJson({ error: "URL หรือ Stream Key ไม่ถูกต้อง ใช้โฮสต์ที่เปิดให้ทดสอบเท่านั้น" }, 400); }
  try { await verifyProgramTracks(id, d.videoTrackId, d.audioTrackId); }
  catch { return liveJson({ error: "ยังไม่พบภาพและเสียงรายการในห้อง" }, 409); }
  const reserved = await reserveOutput(id, access.userId, d.requestId, new URL(d.endpoint).hostname, d.videoTrackId, d.audioTrackId);
  if (!reserved) return liveJson({ error: "มีคำขอเดิมหรือรายการปิดแล้ว กรุณาตรวจสถานะ" }, 409);
  try {
    const info = await startProviderOutput(id, url, d.videoTrackId, d.audioTrackId, show.aspect);
    await acceptProviderInfo(id, info);
    // A stop can arrive while the start request is in flight. Honor its durable marker.
    await reconcileOutput(id);
  } catch {
    await prisma.$executeRaw`UPDATE "LiveOutput" SET "state"='UNKNOWN' WHERE "showId"=${id} AND "egressId" IS NULL AND "state"='STARTING'`;
    return liveJson({ error: "ยังยืนยันผลเริ่มส่งไม่ได้ ระบบจะตรวจคำขอเดิม ห้ามเริ่มซ้ำ" }, 202);
  }
  const latest = await prisma.liveShow.findUnique({ where: { id }, include: { output: true } });
  return liveJson({ show: publicShow(latest!) });
}
