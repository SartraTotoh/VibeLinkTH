import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveStudio } from "../components/live/live-studio";

vi.mock("next/link", () => ({ default: (props: Record<string, unknown>) => React.createElement("a", props) }));
class Track {
  enabled = true; readyState = "live"; onended: (() => void) | null = null;
  constructor(public kind: string) {}
  stop = vi.fn(() => { this.readyState = "ended"; });
  clone() { const t = new Track(this.kind); t.enabled = this.enabled; return t; }
}
class Stream {
  constructor(public tracks: Track[] = []) {}
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter(t => t.kind === "video"); }
  getAudioTracks() { return this.tracks.filter(t => t.kind === "audio"); }
  addTrack(t: Track) { this.tracks.push(t); }
}
class Recorder {
  static last: Recorder;
  static isTypeSupported = () => true;
  state = "inactive"; mimeType = "video/webm";
  ondataavailable?: (e: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor(public stream: Stream) { Recorder.last = this; }
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["test-media"]) }); this.onstop?.(); }
}
let ui: ReactTestRenderer | undefined;
let host: Stream;
let captured: Stream;
let getUserMedia: ReturnType<typeof vi.fn>;
let listeners: Record<string, () => void>;
let local: Map<string, string>;
let hidden = false;
const textOf = () => JSON.stringify(ui!.toJSON());
const childText = (children: unknown): string => Array.isArray(children) ? children.map(childText).join("") : typeof children === "string" ? children : "";
const button = (text: string) => ui!.root.findAllByType("button").find(b => childText(b.props.children).includes(text))!;
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  local = new Map(); listeners = {}; hidden = false;
  host = new Stream([new Track("video"), new Track("audio")]); captured = new Stream([new Track("video")]);
  getUserMedia = vi.fn(async () => host);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia, enumerateDevices: async () => [] } });
  vi.stubGlobal("localStorage", { getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => local.set(k, v) });
  vi.stubGlobal("document", { get hidden() { return hidden; }, addEventListener: (e: string, fn: () => void) => { listeners[e] = fn; }, removeEventListener: vi.fn() });
  vi.stubGlobal("window", { setInterval, clearInterval, addEventListener: vi.fn(), removeEventListener: vi.fn(), MediaRecorder: Recorder });
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:recorded");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(async () => { if (ui) await act(async () => ui!.unmount()); ui = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
async function mount() {
  await act(async () => {
    ui = create(React.createElement(LiveStudio, { ownerId: "test-owner" }), { createNodeMock: element => {
      if (element.type === "canvas") return { getContext: () => ({ fillRect: vi.fn(), fillText: vi.fn(), drawImage: vi.fn() }), captureStream: () => captured };
      if (element.type === "video") return { srcObject: null, play: async () => {}, readyState: 0 };
      return null;
    } });
  });
}
async function openHost() { await act(async () => button("เปิดกล้อง").props.onClick()); }

describe("Live device and recording lifecycle", () => {
  it("does not ask for camera access or enable streaming on load", async () => {
    await mount(); expect(getUserMedia).not.toHaveBeenCalled();
    expect(button("ส่งไลฟ์").props.disabled).toBe(true); expect(button("เริ่มบันทึกซ้อม").props.disabled).toBe(true);
    expect([...local.keys()]).toEqual(["vibelink-live-draft-v1:test-owner"]);
  });
  it("discards a late permission response after cameras have been closed", async () => {
    let resolve!: (s: Stream) => void;
    getUserMedia.mockImplementation(() => new Promise(r => { resolve = r; }));
    await mount(); await openHost();
    await act(async () => button("ปิดกล้องและไมค์ทั้งหมด").props.onClick());
    await act(async () => resolve(host));
    expect(host.getTracks().every(t => t.stop.mock.calls.length === 1)).toBe(true);
    expect(button("เริ่มบันทึกซ้อม").props.disabled).toBe(true);
  });
  it("records only the host audio, follows mute changes and releases captured tracks on stop", async () => {
    await mount(); await openHost(); await act(async () => button("เริ่มบันทึกซ้อม").props.onClick());
    expect(Recorder.last.stream.getAudioTracks()).toHaveLength(1);
    expect(ui!.root.findAllByType("select").every(n => n.props.disabled)).toBe(true);
    await act(async () => button("ปิดไมค์").props.onClick());
    expect(host.getAudioTracks()[0].enabled).toBe(false); expect(captured.getAudioTracks()[0].enabled).toBe(false);
    await act(async () => button("หยุดบันทึก").props.onClick());
    expect(captured.getTracks().every(t => t.readyState === "ended")).toBe(true);
    expect(host.getTracks().every(t => t.readyState === "live")).toBe(true);
    expect(textOf()).toContain("ดาวน์โหลดวิดีโอ");
    await act(async () => ui!.unmount()); ui = undefined;
    expect(host.getTracks().every(t => t.readyState === "ended")).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:recorded");
  });
  it("stops recording if the source disconnects or the tab becomes hidden", async () => {
    await mount(); await openHost(); await act(async () => button("เริ่มบันทึกซ้อม").props.onClick());
    await act(async () => { hidden = true; listeners.visibilitychange(); });
    expect(Recorder.last.state).toBe("inactive"); expect(textOf()).toContain("หยุดบันทึกเมื่อออกจากแท็บ");
    await act(async () => host.getVideoTracks()[0].onended?.());
    expect(button("เริ่มบันทึกซ้อม").props.disabled).toBe(true);
  });
});
