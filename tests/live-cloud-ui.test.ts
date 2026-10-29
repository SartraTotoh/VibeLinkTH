import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { CloudShow } from "../lib/live/types";
const mock = vi.hoisted(() => ({ connect: vi.fn(), publish: vi.fn(), disconnect: vi.fn(), handlers: {} as Record<string, () => void> }));
vi.mock("livekit-client", () => ({ Room: class {
  localParticipant = { publishTrack: mock.publish };
  connect = mock.connect; disconnect = mock.disconnect;
  on(name: string, callback: () => void) { mock.handlers[name] = callback; }
}, RoomEvent: { Disconnected: "disconnected", Reconnecting: "reconnecting" }, Track: { Source: { Camera: "camera", Microphone: "microphone" } } }));
import { CloudOutput } from "../components/live/cloud-output";
let ui: ReactTestRenderer | undefined;
let show: CloudShow;
let clonedAudio: { enabled: boolean; stop: ReturnType<typeof vi.fn> };
let video: { stop: ReturnType<typeof vi.fn> };
let tracks: unknown[];
let fetchMock: ReturnType<typeof vi.fn>;
let props: Parameters<typeof CloudOutput>[0];
const button = (label: string) => ui!.root.findAllByType("button").find(v => typeof v.props.children === "string" && v.props.children.includes(label))!;
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", { setInterval, clearInterval });
  clonedAudio = { enabled: true, stop: vi.fn() }; video = { stop: vi.fn() }; tracks = [video];
  const audioStream = { getAudioTracks: () => [{ readyState: "live", clone: () => clonedAudio }] };
  const capture = { getVideoTracks: () => [video], getAudioTracks: () => tracks.filter(v => v === clonedAudio), getTracks: () => tracks, addTrack: (t: unknown) => tracks.push(t) };
  props = { canvas: { current: { captureStream: () => capture } } as never, audio: { current: audioStream } as never, audioMuted: false, title: "รายการทดสอบ", aspect: "landscape", ready: true, localRecording: false, stopSignal: 0, onActive: vi.fn() };
  show = { id: "show", title: "รายการทดสอบ", aspect: "landscape", createdAt: "2026-10-30T00:00:00Z", closedAt: null, connectedAt: null, closing: false, output: null };
  mock.connect.mockResolvedValue(undefined); mock.disconnect.mockResolvedValue(undefined); mock.publish.mockImplementation(async (_track, options) => ({ trackSid: options.name === "program-video" ? "TR_video" : "TR_audio" }));
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("config")) return Response.json({ enabled: true, reason: "pilot", allowedHosts: ["ingest.example.com"], maxSources: 2 });
    if (url.endsWith("shows") && init?.method === "GET") return Response.json({ shows: [] });
    if (url.endsWith("connect")) return Response.json({ url: "wss://media.example.com", token: "test-token" });
    if (url.endsWith("output")) { show = { ...show, output: { state: "UNKNOWN", transport: "starting", destinationHost: "ingest.example.com", startedAt: null, endedAt: null, streamStartedAt: null, streamEndedAt: null, usageSeconds: null, stopRequested: false } }; return Response.json({ error: "ยังยืนยันไม่ได้" }, { status: 202 }); }
    if (url.endsWith("stop")) show = { ...show, closedAt: "2026-10-30T00:01:00Z" };
    return Response.json({ show });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(async () => { if (ui) await act(async () => ui!.unmount()); ui = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });
async function mountAndCreate() {
  await act(async () => { ui = create(React.createElement(CloudOutput, props)); });
  await act(async () => button("สร้างรายการบนเซิร์ฟเวอร์").props.onClick());
}
describe("program cloud lifecycle", () => {
  it("publishes exactly the composed video and selected audio without acquiring extra cameras", async () => {
    await mountAndCreate(); await act(async () => button("เปิดห้องและส่ง Program").props.onClick());
    expect(mock.publish.mock.calls.map(v => v[1].name)).toEqual(["program-video", "program-audio"]);
    expect(props.onActive).toHaveBeenLastCalledWith(true);
    await act(async () => { ui!.update(React.createElement(CloudOutput, { ...props, audioMuted: true })); });
    expect(clonedAudio.enabled).toBe(false);
    await act(async () => button("หยุดส่งและปิดห้อง").props.onClick());
    expect(clonedAudio.stop).toHaveBeenCalledOnce(); expect(video.stop).toHaveBeenCalledOnce(); expect(mock.disconnect).toHaveBeenCalled();
  });
  it("clears the stream key and prevents another start after an uncertain server outcome", async () => {
    await mountAndCreate(); await act(async () => button("เปิดห้องและส่ง Program").props.onClick());
    const inputs = ui!.root.findAllByType("input");
    await act(async () => { inputs[0].props.onChange({ target: { value: "rtmps://ingest.example.com/live" } }); inputs[1].props.onChange({ target: { value: "do-not-persist-this-key" } }); });
    await act(async () => button("เริ่มส่งออกหนึ่งช่อง").props.onClick());
    expect(ui!.root.findAllByType("input")[1].props.value).toBe("");
    expect(button("เริ่มส่งออกหนึ่งช่อง").props.disabled).toBe(true);
    expect(fetchMock.mock.calls.filter(v => String(v[0]).endsWith("/output"))).toHaveLength(1);
  });
  it("cancels an in-flight connection before publishing if the source is lost", async () => {
    let resolve!: () => void; mock.connect.mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    await mountAndCreate();
    await act(async () => { void button("เปิดห้องและส่ง Program").props.onClick(); });
    await act(async () => { ui!.update(React.createElement(CloudOutput, { ...props, stopSignal: 1 })); });
    await act(async () => resolve());
    expect(mock.publish).not.toHaveBeenCalled(); expect(mock.disconnect).toHaveBeenCalled();
  });
  it("releases local media and requests server cleanup on unmount", async () => {
    await mountAndCreate(); await act(async () => button("เปิดห้องและส่ง Program").props.onClick());
    await act(async () => ui!.unmount()); ui = undefined;
    expect(video.stop).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls.some(v => String(v[0]).endsWith("/stop") && v[1]?.keepalive)).toBe(true);
  });
});
