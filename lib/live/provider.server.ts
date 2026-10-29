import { AccessToken, AudioCodec, EgressClient, EgressInfo, EgressStatus, EncodingOptions, RoomServiceClient, StreamOutput, StreamProtocol, TrackSource, TrackType, VideoCodec } from "livekit-server-sdk";
import { mediaConfigured } from "./config.server";
import { dimensions } from "./studio";

export function roomName(showId: string) { return `vl-${showId}`; }
export const PROGRAM_IDENTITY = "program";
export function provider() {
  if (!mediaConfigured()) throw new Error("media-unavailable");
  const url = process.env.LIVEKIT_URL!;
  const host = url.replace(/^wss:/, "https:");
  const key = process.env.LIVEKIT_API_KEY!; const secret = process.env.LIVEKIT_API_SECRET!;
  // No automatic start retry: an ambiguous timeout must be reconciled, never replayed.
  const options = { requestTimeout: 12, failover: false };
  return { rooms: new RoomServiceClient(host, key, secret, options), egress: new EgressClient(host, key, secret, options), url };
}

export async function roomToken(showId: string) {
  const p = provider(); const room = roomName(showId);
  await p.rooms.createRoom({ name: room, emptyTimeout: 60, departureTimeout: 20, maxParticipants: 2 });
  const token = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity: PROGRAM_IDENTITY, ttl: 300 });
  token.addGrant({ roomJoin: true, room, canPublish: true, canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE], canSubscribe: false, canPublishData: false });
  return { url: p.url, token: await token.toJwt() };
}

export async function verifyProgramTracks(showId: string, videoTrackId: string, audioTrackId: string) {
  const participant = await provider().rooms.getParticipant(roomName(showId), PROGRAM_IDENTITY);
  if (!participant.tracks.some(t => t.sid === videoTrackId && t.type === TrackType.VIDEO && t.name === "program-video") || !participant.tracks.some(t => t.sid === audioTrackId && t.type === TrackType.AUDIO && t.name === "program-audio")) throw new Error("program-not-ready");
}

export function outputEncoding(aspect: string) {
  return new EncodingOptions({ ...dimensions(aspect === "portrait" ? "portrait" : "landscape"), framerate: 30, videoCodec: VideoCodec.H264_MAIN, videoBitrate: 2500, audioCodec: AudioCodec.AAC, audioBitrate: 128, keyFrameInterval: 2 });
}
export async function startProviderOutput(showId: string, url: string, videoTrackId: string, audioTrackId: string, aspect: string) {
  return provider().egress.startTrackCompositeEgress(roomName(showId), new StreamOutput({ protocol: StreamProtocol.RTMP, urls: [url] }), { videoTrackId, audioTrackId, encodingOptions: outputEncoding(aspect) });
}

function nsDate(ns: bigint) {
  if (ns <= BigInt(0)) return null;
  const ms = Number(ns / BigInt(1_000_000));
  return Number.isSafeInteger(ms) && ms < 8.64e15 ? new Date(ms) : null;
}
export function providerObservation(info: EgressInfo) {
  const states: Record<number, string> = { [EgressStatus.EGRESS_STARTING]: "STARTING", [EgressStatus.EGRESS_ACTIVE]: "ACTIVE", [EgressStatus.EGRESS_ENDING]: "STOPPING", [EgressStatus.EGRESS_COMPLETE]: "ENDED", [EgressStatus.EGRESS_FAILED]: "FAILED", [EgressStatus.EGRESS_ABORTED]: "FAILED", [EgressStatus.EGRESS_LIMIT_REACHED]: "ENDED" };
  const stream = info.streamResults[0];
  const state = states[info.status] ?? "UNKNOWN";
  // StreamInfo statuses in LiveKit protocol: ACTIVE=0, FINISHED=1, FAILED=2.
  const transport = stream?.status === 2 ? "failed" : stream?.status === 1 ? "ended" : state === "ACTIVE" && stream?.status === 0 && stream.startedAt > BigInt(0) ? "sending" : ["ENDED", "FAILED"].includes(state) ? "ended" : "starting";
  return { egressId: info.egressId, state, transport, version: info.updatedAt || info.endedAt || info.startedAt, startedAt: nsDate(info.startedAt), endedAt: nsDate(info.endedAt), streamStartedAt: stream ? nsDate(stream.startedAt) : null, streamEndedAt: stream ? nsDate(stream.endedAt) : null };
}
export type ProviderObservation = ReturnType<typeof providerObservation>;
