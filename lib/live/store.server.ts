import { prisma } from "@/lib/prisma";
import type { LiveOutput, LiveShow } from "@prisma/client";
import type { CloudShow } from "./types";
import type { ProviderObservation } from "./provider.server";

export const terminalOutput = (state: string) => state === "ENDED" || state === "FAILED";

export async function reserveOutput(showId: string, userId: string, requestId: string, destinationHost: string, videoTrackId: string, audioTrackId: string) {
  // Single statement and a unique showId: concurrent/retried requests cannot start a second output.
  const rows = await prisma.$queryRaw<{ showId: string }[]>`
    WITH active AS (
      SELECT "id" FROM "LiveShow" WHERE "id"=${showId} AND "userId"=${userId}
        AND "closedAt" IS NULL AND "closingAt" IS NULL FOR UPDATE
    )
    INSERT INTO "LiveOutput" ("showId","requestId","destinationHost","videoTrackId","audioTrackId")
    SELECT "id",${requestId},${destinationHost},${videoTrackId},${audioTrackId}
    FROM active
    ON CONFLICT DO NOTHING RETURNING "showId"`;
  return rows.length > 0;
}

export async function beginCloseShow(showId: string) {
  await prisma.$executeRaw`UPDATE "LiveShow" SET "closingAt"=COALESCE("closingAt",CURRENT_TIMESTAMP) WHERE "id"=${showId}`;
}

export async function observeOutput(showId: string, observation: ProviderObservation, eventId: string) {
  // Order on provider nanoseconds, preserve terminal state, and log each accepted event once.
  // No raw provider payload is stored: it can contain the destination Stream Key.
  return prisma.$queryRaw<{ showId: string }[]>`
    WITH changed AS (
      UPDATE "LiveOutput" SET "egressId"=${observation.egressId},
        "state"=CASE WHEN "stopRequestedAt" IS NOT NULL AND ${observation.state} IN ('STARTING','ACTIVE') THEN 'STOPPING' ELSE ${observation.state} END,
        "transport"=${observation.transport}, "providerVersion"=${observation.version},
        "startedAt"=COALESCE("startedAt",${observation.startedAt}::timestamp),
        "endedAt"=COALESCE("endedAt",${observation.endedAt}::timestamp),
        "streamStartedAt"=COALESCE("streamStartedAt",${observation.streamStartedAt}::timestamp),
        "streamEndedAt"=COALESCE("streamEndedAt",${observation.streamEndedAt}::timestamp)
      WHERE "showId"=${showId} AND ("egressId" IS NULL OR "egressId"=${observation.egressId})
        AND "providerVersion" <= ${observation.version}
        AND ("state" NOT IN ('ENDED','FAILED') OR ${observation.state} IN ('ENDED','FAILED'))
      RETURNING "showId"
    ), logged AS (
      INSERT INTO "LiveOutputEvent" ("id","showId","state")
      SELECT ${eventId},"showId",${observation.state} FROM changed ON CONFLICT DO NOTHING
    ) SELECT "showId" FROM changed`;
}

export async function requestOutputStop(showId: string) {
  await prisma.$executeRaw`UPDATE "LiveOutput" SET "stopRequestedAt"=COALESCE("stopRequestedAt",CURRENT_TIMESTAMP),
    "state"=CASE WHEN "state" IN ('ENDED','FAILED') THEN "state" ELSE 'STOPPING' END WHERE "showId"=${showId}`;
}

export function publicShow(show: LiveShow & { output: LiveOutput | null }): CloudShow {
  const o = show.output;
  return { id: show.id, title: show.title, aspect: show.aspect, createdAt: show.createdAt.toISOString(), closedAt: show.closedAt?.toISOString() ?? null, connectedAt: show.connectedAt?.toISOString() ?? null, closing: Boolean(show.closingAt && !show.closedAt),
    output: o ? { state: o.state, transport: o.transport, destinationHost: o.destinationHost, startedAt: o.startedAt?.toISOString() ?? null, endedAt: o.endedAt?.toISOString() ?? null, streamStartedAt: o.streamStartedAt?.toISOString() ?? null, streamEndedAt: o.streamEndedAt?.toISOString() ?? null, stopRequested: Boolean(o.stopRequestedAt), usageSeconds: o.streamStartedAt && o.streamEndedAt ? Math.max(0, (o.streamEndedAt.getTime() - o.streamStartedAt.getTime()) / 1000) : null } : null };
}
