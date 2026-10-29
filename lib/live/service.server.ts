import { prisma } from "@/lib/prisma";
import { observeOutput, requestOutputStop, terminalOutput, beginCloseShow } from "./store.server";
import { provider, providerObservation, roomName } from "./provider.server";
import type { EgressInfo } from "livekit-server-sdk";

export async function acceptProviderInfo(showId: string, info: EgressInfo, eventId?: string) {
  const output = await prisma.liveOutput.findUnique({ where: { showId } });
  if (!output || info.roomName !== roomName(showId)) return;
  if (!output.egressId) {
    // Reconcile an ambiguous start only against the originally reserved program tracks.
    if (info.request.case !== "trackComposite" || info.request.value.videoTrackId !== output.videoTrackId || info.request.value.audioTrackId !== output.audioTrackId) return;
  } else if (output.egressId !== info.egressId) return;
  const observation = providerObservation(info);
  await observeOutput(showId, observation, eventId ?? `${info.egressId}:${observation.version}:${observation.state}`);
}

export async function reconcileOutput(showId: string) {
  let output = await prisma.liveOutput.findUnique({ where: { showId } });
  if (!output || terminalOutput(output.state)) return;
  const p = provider();
  const infos = await p.egress.listEgress({ roomName: roomName(showId) });
  for (const info of infos) await acceptProviderInfo(showId, info);
  output = await prisma.liveOutput.findUnique({ where: { showId } });
  if (output?.stopRequestedAt && output.egressId && !terminalOutput(output.state)) {
    const stopped = await p.egress.stopEgress(output.egressId);
    await acceptProviderInfo(showId, stopped);
  }
}

export async function stopOutput(showId: string) {
  await requestOutputStop(showId);
  await reconcileOutput(showId);
}

export async function closeShow(showId: string) {
  // Lock out late start reservations before checking output or deleting the room.
  await beginCloseShow(showId);
  const output = await prisma.liveOutput.findUnique({ where: { showId } });
  if (output && !terminalOutput(output.state)) { await stopOutput(showId); return false; }
  try { await provider().rooms.deleteRoom(roomName(showId)); }
  catch (error) {
    // Only a confirmed missing room is equivalent to successful cleanup.
    if (!(error && typeof error === "object" && "code" in error && error.code === "not_found")) throw error;
  }
  await prisma.liveShow.update({ where: { id: showId }, data: { closedAt: new Date() } });
  return true;
}
