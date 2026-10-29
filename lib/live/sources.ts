export type SourceSlot = "host" | "product";
export type SourceKind = "camera" | "screen";
export const SOURCE_LIMIT = 2;

/** Owns exactly two video slots. Microphone/capture audio is selected separately. */
export class SourceController {
  private streams: Partial<Record<SourceSlot, MediaStream>> = {};
  private generation = { host: 0, product: 0 };
  private disposed = false;
  constructor(private onEnded: (slot: SourceSlot) => void) {}

  get(slot: SourceSlot) { return this.streams[slot]; }

  async open(slot: SourceSlot, kind: SourceKind, deviceId: string, media: MediaDevices): Promise<MediaStream | null> {
    if (this.disposed) return null;
    const generation = ++this.generation[slot];
    const other = this.streams[slot === "host" ? "product" : "host"]?.getVideoTracks()[0];
    if (kind === "camera" && deviceId && other?.getSettings().deviceId === deviceId) throw new Error("duplicate-source");
    const stream = kind === "screen"
      ? await media.getDisplayMedia({ video: true, audio: false })
      : await media.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (this.disposed || generation !== this.generation[slot]) { stream.getTracks().forEach(t => t.stop()); return null; }
    const track = stream.getVideoTracks()[0];
    if (!track) { stream.getTracks().forEach(t => t.stop()); throw new Error("missing-video"); }
    // A default selection can resolve to the device already occupying the other slot.
    const currentOther = this.streams[slot === "host" ? "product" : "host"]?.getVideoTracks()[0];
    if (kind === "camera" && currentOther && track.getSettings().deviceId && track.getSettings().deviceId === currentOther.getSettings().deviceId) {
      stream.getTracks().forEach(t => t.stop()); throw new Error("duplicate-source");
    }
    this.streams[slot]?.getTracks().forEach(t => t.stop());
    this.streams[slot] = stream;
    track.onended = () => {
      if (this.streams[slot] !== stream || this.disposed) return;
      this.close(slot); this.onEnded(slot);
    };
    return stream;
  }

  close(slot: SourceSlot) {
    this.generation[slot]++;
    this.streams[slot]?.getTracks().forEach(t => t.stop());
    delete this.streams[slot];
  }
  closeAll() { this.close("host"); this.close("product"); }
  dispose() { this.disposed = true; this.closeAll(); }
}

export function audioConstraints(deviceId: string, profile: "microphone" | "mixer"): MediaStreamConstraints {
  return { video: false, audio: {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    echoCancellation: profile === "microphone", noiseSuppression: profile === "microphone", autoGainControl: profile === "microphone",
  } };
}

export function inputError(error: unknown) {
  if (error instanceof Error && error.message === "duplicate-source") return "อุปกรณ์นี้ใช้อยู่ในอีก Source แล้ว เลือกกล้องอีกตัวหรือใช้เพียง Source เดียว";
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") return "ยังไม่ได้รับสิทธิ์รับภาพหรือเสียง กรุณาอนุญาตในเบราว์เซอร์แล้วลองใหม่";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "ไม่พบอุปกรณ์ที่เลือก กรุณารีเฟรชรายชื่อแล้วเลือกใหม่";
  if (name === "NotReadableError") return "อุปกรณ์อาจถูกแอปอื่นใช้อยู่ กรุณาตรวจสายและแอปที่เปิดใช้งาน";
  return "เปิด Source ไม่ได้ กรุณาตรวจอุปกรณ์และลองใหม่";
}
