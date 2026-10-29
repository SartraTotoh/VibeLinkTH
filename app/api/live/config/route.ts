import { auth } from "@/auth";
import { liveReadiness } from "@/lib/live/config.server";
import { liveJson } from "@/lib/live/http.server";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return liveJson({ error: "ต้องเข้าสู่ระบบก่อน" }, 401);
  return liveJson(liveReadiness(session.user.email));
}
