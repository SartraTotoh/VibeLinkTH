import { prisma } from "@/lib/prisma";
import { liveJson, liveUser } from "@/lib/live/http.server";
import { provider, roomName, roomToken } from "@/lib/live/provider.server";
type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, context: Context) {
  const access = await liveUser(req, true); if (access.response) return access.response;
  const { id } = await context.params;
  const show = await prisma.liveShow.findFirst({ where: { id, userId: access.userId }, include: { output: true } });
  if (!show) return liveJson({ error: "ไม่พบรายการ" }, 404);
  if (show.closedAt || show.closingAt || show.output || (show.connectedAt && Date.now() - show.connectedAt.getTime() >= 15 * 60_000)) return liveJson({ error: "รายการนี้ไม่พร้อมเปิดห้องใหม่ กรุณาปิดรายการเดิมก่อน" }, 409);
  try {
    const connection = await roomToken(id);
    const updated = await prisma.$executeRaw`UPDATE "LiveShow" SET "connectedAt"=COALESCE("connectedAt",CURRENT_TIMESTAMP),"lastSeenAt"=CURRENT_TIMESTAMP WHERE "id"=${id} AND "closedAt" IS NULL AND "closingAt" IS NULL`;
    if (!updated) { await provider().rooms.deleteRoom(roomName(id)); return liveJson({ error: "รายการปิดแล้ว" }, 409); }
    return liveJson(connection);
  } catch { return liveJson({ error: "เชื่อมห้องไม่ได้ กรุณาลองใหม่" }, 502); }
}
