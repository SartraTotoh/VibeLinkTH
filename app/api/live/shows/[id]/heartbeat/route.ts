import { prisma } from "@/lib/prisma";
import { liveJson, liveUser } from "@/lib/live/http.server";
type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, context: Context) {
  const access = await liveUser(req, true); if (access.response) return access.response;
  const { id } = await context.params;
  const updated = await prisma.$executeRaw`UPDATE "LiveShow" SET "lastSeenAt"=CURRENT_TIMESTAMP WHERE "id"=${id} AND "userId"=${access.userId} AND "closedAt" IS NULL AND "closingAt" IS NULL`;
  return updated ? liveJson({ ok: true }) : liveJson({ error: "ไม่พบรายการที่เปิดอยู่" }, 404);
}
