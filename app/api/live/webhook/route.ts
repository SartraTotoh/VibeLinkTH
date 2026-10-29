import { WebhookReceiver } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { liveJson, boundedBody } from "@/lib/live/http.server";
import { acceptProviderInfo, reconcileOutput } from "@/lib/live/service.server";
import { mediaConfigured } from "@/lib/live/config.server";
export async function POST(req: Request) {
  if (!mediaConfigured() || process.env.LIVE_SCHEMA_READY !== "true") return liveJson({ error: "unavailable" }, 503);
  let body: string;
  try { body = await boundedBody(req, 65536); } catch { return liveJson({ error: "payload-too-large" }, 413); }
  let event;
  try { event = await new WebhookReceiver(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!).receive(body, req.headers.get("authorization") ?? undefined); }
  catch { return liveJson({ error: "invalid-signature" }, 401); }
  const info = event.egressInfo;
  if (info && ["egress_started", "egress_updated", "egress_ended"].includes(event.event)) {
    const id = info.roomName.startsWith("vl-") ? info.roomName.slice(3) : "";
    const show = await prisma.liveShow.findUnique({ where: { id } });
    if (show) {
      await acceptProviderInfo(id, info, event.id || undefined);
      // A late start receipt after a stop request must also stop the actual provider job.
      await reconcileOutput(id);
    }
  }
  return liveJson({ ok: true });
}
