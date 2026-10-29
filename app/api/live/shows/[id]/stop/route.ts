import { prisma } from "@/lib/prisma";
import { liveJson, liveUser } from "@/lib/live/http.server";
import { closeShow } from "@/lib/live/service.server";
import { publicShow } from "@/lib/live/store.server";
type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, context: Context) {
  const access = await liveUser(req, true, true); if (access.response) return access.response;
  const { id } = await context.params;
  const show = await prisma.liveShow.findFirst({ where: { id, userId: access.userId }, include: { output: true } });
  if (!show) return liveJson({ error: "ไม่พบรายการ" }, 404);
  if (show.closedAt) return liveJson({ show: publicShow(show) });
  try {
    const closed = await closeShow(id);
    const latest = await prisma.liveShow.findUnique({ where: { id }, include: { output: true } });
    return liveJson({ show: publicShow(latest!), pending: !closed }, closed ? 200 : 202);
  } catch { return liveJson({ error: "ยังยืนยันการหยุดไม่ได้ กำลังรอตรวจจากบริการสื่อ" }, 202); }
}
