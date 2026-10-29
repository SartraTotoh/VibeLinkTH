import { prisma } from "@/lib/prisma";
import { liveJson, liveUser } from "@/lib/live/http.server";
import { publicShow } from "@/lib/live/store.server";
import { reconcileOutput } from "@/lib/live/service.server";
type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: Context) {
  const access = await liveUser(req); if (access.response) return access.response;
  const { id } = await context.params;
  const show = await prisma.liveShow.findFirst({ where: { id, userId: access.userId }, include: { output: true } });
  if (!show) return liveJson({ error: "ไม่พบรายการ" }, 404);
  let syncPending = false;
  if (!show.closedAt && show.output) try { await reconcileOutput(id); } catch { syncPending = true; }
  const latest = await prisma.liveShow.findUnique({ where: { id }, include: { output: true } });
  return liveJson({ show: publicShow(latest!), syncPending });
}
