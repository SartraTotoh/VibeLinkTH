import { describe, expect, it, vi } from "vitest";
import { SourceController, audioConstraints, inputError } from "../lib/live/sources";
function stream(id: string) {
  const track = { getSettings: () => ({ deviceId: id }), stop: vi.fn(), onended: null as (() => void) | null };
  return { track, getTracks: () => [track], getVideoTracks: () => [track] };
}
describe("two source controller", () => {
  it("accepts a mixed USB/virtual camera as a single video-only source", async () => {
    const a = stream("switcher"); const getUserMedia = vi.fn(async () => a);
    const c = new SourceController(vi.fn());
    await c.open("host", "camera", "switcher", { getUserMedia } as unknown as MediaDevices);
    expect(getUserMedia.mock.calls[0]).toEqual([{ video: { deviceId: { exact: "switcher" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }]);
    expect(c.get("host")).toBe(a);
  });
  it("prevents selecting the same physical device into both slots", async () => {
    const a = stream("same"); const getUserMedia = vi.fn(async () => a);
    const c = new SourceController(vi.fn()); const media = { getUserMedia } as unknown as MediaDevices;
    await c.open("host", "camera", "same", media);
    await expect(c.open("product", "camera", "same", media)).rejects.toThrow("duplicate-source");
    expect(getUserMedia).toHaveBeenCalledTimes(1); expect(a.track.stop).not.toHaveBeenCalled();
  });
  it("rejects a duplicate device resolved from the default selection", async () => {
    const a = stream("same"); const b = stream("same");
    const media = { getUserMedia: vi.fn().mockResolvedValueOnce(a).mockResolvedValueOnce(b) } as unknown as MediaDevices;
    const c = new SourceController(vi.fn()); await c.open("host", "camera", "", media);
    await expect(c.open("product", "camera", "", media)).rejects.toThrow("duplicate-source");
    expect(b.track.stop).toHaveBeenCalledOnce(); expect(a.track.stop).not.toHaveBeenCalled();
  });
  it("discards superseded asynchronous permission responses", async () => {
    const a = stream("old"); const b = stream("new"); let resolve!: (value: unknown) => void;
    const media = { getUserMedia: vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce(b) } as unknown as MediaDevices;
    const c = new SourceController(vi.fn()); const old = c.open("host", "camera", "old", media);
    await c.open("host", "camera", "new", media); resolve(a); expect(await old).toBeNull();
    expect(a.track.stop).toHaveBeenCalledOnce(); expect(c.get("host")).toBe(b);
  });
  it("preserves the existing source when replacing it is denied", async () => {
    const a = stream("a"); const media = { getUserMedia: vi.fn().mockResolvedValueOnce(a).mockRejectedValueOnce(new DOMException("no", "NotAllowedError")) } as unknown as MediaDevices;
    const c = new SourceController(vi.fn()); await c.open("host", "camera", "a", media);
    await expect(c.open("host", "camera", "b", media)).rejects.toThrow(); expect(c.get("host")).toBe(a);
  });
  it("closes both slots and a later permission result on dispose", async () => {
    const a = stream("a"); const b = stream("b"); let resolve!: (value: unknown) => void;
    const media = { getUserMedia: vi.fn().mockResolvedValueOnce(a).mockImplementationOnce(() => new Promise(r => { resolve = r; })) } as unknown as MediaDevices;
    const c = new SourceController(vi.fn()); await c.open("host", "camera", "a", media);
    const pending = c.open("product", "camera", "b", media); c.dispose(); resolve(b);
    expect(await pending).toBeNull(); expect(a.track.stop).toHaveBeenCalledOnce(); expect(b.track.stop).toHaveBeenCalledOnce();
  });
  it("reports a stopped screen source once and releases its tracks", async () => {
    const a = stream("screen"); const ended = vi.fn(); const c = new SourceController(ended);
    const getDisplayMedia = vi.fn(async () => a);
    await c.open("host", "screen", "", { getDisplayMedia } as unknown as MediaDevices);
    expect(getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false });
    const callback = a.track.onended!; callback(); callback();
    expect(ended).toHaveBeenCalledOnce(); expect(c.get("host")).toBeUndefined();
  });
  it("does not apply microphone processing to a prepared mixer feed", () => {
    expect(audioConstraints("capture-audio", "mixer")).toEqual({ video: false, audio: { deviceId: { exact: "capture-audio" }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    expect(inputError(new DOMException("denied", "NotAllowedError"))).toContain("สิทธิ์");
  });
});
