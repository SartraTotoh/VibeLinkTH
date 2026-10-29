"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clock, coverCrop, dimensions, readDraft, RECORDING_LIMIT_BYTES, RECORDING_LIMIT_MS, newLiveId, type Aspect, type Product, type Scene, type ProgramMode } from "@/lib/live/studio";
import s from "./live-studio.module.css";
import { useStudioInputs } from "./use-studio-inputs";
import { CloudOutput } from "./cloud-output";

type Source = "host" | "product";
type Result = { url: string; extension: string; bytes: number; title: string; startedAt: string; endedAt: string; durationMs: number };
const scenes: { id: Scene; icon: string; label: string }[] = [
  { id: "host", icon: "person", label: "Source A" }, { id: "product", icon: "inventory_2", label: "Source B" },
  { id: "split", icon: "view_column", label: "ภาพคู่" }, { id: "waiting", icon: "hourglass_top", label: "หน้ารอ" },
];

export function LiveStudio({ ownerId }: { ownerId: string }) {
  const [title, setTitle] = useState("รายการใหม่ของฉัน");
  const [aspect, setAspect] = useState<Aspect>("landscape");
  const [scene, setScene] = useState<Scene>("waiting");
  const [products, setProducts] = useState<Product[]>([]);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [programMode, setProgramMode] = useState<ProgramMode>("studio");
  const [externalSlot, setExternalSlot] = useState<Source>("host");
  const [cloudActive, setCloudActive] = useState(false);
  const [stopSignal, setStopSignal] = useState(0);
  const cloudActiveRef = useRef(cloudActive); cloudActiveRef.current = cloudActive;
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const images = useRef<Record<string, { image: HTMLImageElement; url: string }>>({});
  const recorder = useRef<MediaRecorder | null>(null);
  const capture = useRef<MediaStream | null>(null);
  const outputUrl = useRef<string | null>(null);
  const mounted = useRef(false);
  const inputs = useStudioInputs(slot => {
    const other: Source = slot === "host" ? "product" : "host";
    const alternate = slot !== "audio" && inputs.controller.current?.get(other)?.getVideoTracks().some(t => t.readyState === "live");
    if (alternate) {
      setScene(other); setExternalSlot(other);
      setMessage(`Source ${slot === "host" ? "A" : "B"} หลุด สลับไป Source ${other === "host" ? "A" : "B"} แล้ว`);
    } else {
      setScene("waiting"); setStopSignal(value => value + 1);
      if (recorder.current?.state === "recording") { setStopping(true); recorder.current.stop(); }
      setMessage(slot === "audio" ? "แหล่งเสียงหลุด หยุดบันทึกและสั่งหยุดส่งแล้ว กรุณาเชื่อมเสียงใหม่" : "ไม่มี Source ภาพที่พร้อม หยุดบันทึกและสั่งหยุดส่งแล้ว");
    }
  }, setMessage);
  const { ready, busy, devices, muted } = inputs;
  const host = inputs.videos.host; const product = inputs.videos.product;
  const videoReady = programMode === "external" ? ready[externalSlot] : scene === "waiting" ? ready.host || ready.product : scene === "split" ? ready.host && ready.product : ready[scene];
  const programReady = ready.audio && videoReady;
  const visual = useRef({ scene, products, activeProduct, title, programMode, externalSlot });
  visual.current = { scene, products, activeProduct, title, programMode, externalSlot };
  const key = `vibelink-live-draft-v1:${ownerId}`;
  const locked = recording || stopping || cloudActive;

  useEffect(() => {
    mounted.current = true;
    const loadedImages = images.current;
    try {
      const draft = readDraft(localStorage.getItem(key));
      if (draft) { setTitle(draft.title); setAspect(draft.aspect); setProducts(draft.products); setProgramMode(draft.programMode ?? "studio"); }
    } catch { setMessage("เบราว์เซอร์ไม่อนุญาตให้เก็บฉบับร่าง ยังใช้สตูดิโอได้"); }
    setDraftLoaded(true);
    const hide = () => {
      if (document.hidden && cloudActiveRef.current) { setStopSignal(value => value + 1); setMessage("ออกจากแท็บแล้ว สั่งหยุดส่งเพื่อป้องกันภาพค้าง"); }
      if (document.hidden && recorder.current?.state === "recording") {
        setMessage("หยุดบันทึกเมื่อออกจากแท็บ เพื่อไม่ให้ได้ไฟล์ที่ภาพค้าง กรุณาเปิดแท็บนี้ไว้ระหว่างบันทึก");
        setStopping(true); recorder.current.stop();
      }
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (cloudActiveRef.current || (recorder.current && recorder.current.state !== "inactive")) { event.preventDefault(); event.returnValue = ""; }
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", leave);
    return () => {
      mounted.current = false;
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      capture.current?.getTracks().forEach(t => t.stop());
      Object.values(loadedImages).forEach(i => URL.revokeObjectURL(i.url));
      if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("beforeunload", leave);
    };
  }, [key]);

  useEffect(() => {
    if (!draftLoaded) return;
    try { localStorage.setItem(key, JSON.stringify({ title, aspect, products, programMode })); setSaved(true); }
    catch { setSaved(false); }
  }, [title, aspect, products, programMode, draftLoaded, key]);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const { width: w, height: h } = dimensions(aspect);
    element.width = w; element.height = h;
    const paintVideo = (video: HTMLVideoElement | null, x: number, y: number, width: number, height: number, label: string) => {
      ctx.fillStyle = "#151a25"; ctx.fillRect(x, y, width, height);
      if (video && video.readyState >= 2 && video.videoWidth && (video.srcObject as MediaStream | null)?.getVideoTracks().some(t => t.readyState === "live")) {
        const crop = coverCrop(video.videoWidth, video.videoHeight, width, height);
        ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, x, y, width, height);
      } else {
        ctx.fillStyle = "#abb3c5"; ctx.font = "24px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(label, x + width / 2, y + height / 2, width - 40);
      }
    };
    const draw = () => {
      const v = visual.current;
      ctx.fillStyle = "#080b12"; ctx.fillRect(0, 0, w, h);
      if (v.programMode === "external") {
        // Keep the complete prepared program visible, including upstream lower thirds.
        const video = v.externalSlot === "host" ? host.current : product.current;
        if (video && video.readyState >= 2 && video.videoWidth && (video.srcObject as MediaStream | null)?.getVideoTracks().some(t => t.readyState === "live")) {
          const scale = Math.min(w / video.videoWidth, h / video.videoHeight);
          const width = video.videoWidth * scale; const height = video.videoHeight * scale;
          ctx.drawImage(video, (w - width) / 2, (h - height) / 2, width, height);
        } else { ctx.fillStyle = "#bfc6d4"; ctx.font = "28px sans-serif"; ctx.textAlign = "center"; ctx.fillText("รอภาพพร้อมใช้จาก Source ที่เลือก", w / 2, h / 2, w - 60); }
      } else if (v.scene === "waiting") {
        ctx.fillStyle = "#b9ff2c"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("VibeLinkTH Live", w / 2, h / 2 - 60);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 42px sans-serif";
        ctx.fillText("กำลังเตรียมรายการ", w / 2, h / 2 + 10, w - 60);
        ctx.fillStyle = "#bfc6d4"; ctx.font = "24px sans-serif";
        ctx.fillText(v.title, w / 2, h / 2 + 65, w - 60);
      } else if (v.scene === "split") {
        if (aspect === "portrait") {
          paintVideo(host.current, 0, 0, w, h / 2 - 4, "รอกล้องผู้ขาย");
          paintVideo(product.current, 0, h / 2 + 4, w, h / 2 - 4, "รอกล้องสินค้า");
        } else {
          paintVideo(host.current, 0, 0, w / 2 - 4, h, "รอกล้องผู้ขาย");
          paintVideo(product.current, w / 2 + 4, 0, w / 2 - 4, h, "รอกล้องสินค้า");
        }
      } else paintVideo(v.scene === "host" ? host.current : product.current, 0, 0, w, h, v.scene === "host" ? "รอกล้องผู้ขาย" : "รอกล้องสินค้า");
      const item = v.products.find(p => p.id === v.activeProduct);
      if (item && v.scene !== "waiting" && v.programMode === "studio") {
        const y = h - 150;
        ctx.fillStyle = "#080b12ee"; ctx.fillRect(24, y, w - 48, 126);
        const image = images.current[item.id]?.image;
        const hasImage = image?.complete && image.naturalWidth > 0;
        if (hasImage) {
          const crop = coverCrop(image.naturalWidth, image.naturalHeight, 96, 96);
          ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 40, y + 15, 96, 96);
        }
        const x = hasImage ? 155 : 48;
        ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "bold 30px sans-serif";
        ctx.fillText(item.name, x, y + 48, w - x - 48);
        ctx.fillStyle = "#b9ff2c"; ctx.font = "bold 28px sans-serif";
        ctx.fillText(item.price, x, y + 95, w - x - 48);
      }
    };
    draw();
    const interval = window.setInterval(draw, 1000 / 30);
    return () => window.clearInterval(interval);
  }, [aspect, host, product]);

  useEffect(() => {
    capture.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, [muted]);

  function closeCameras() { inputs.closeAll(); setScene("waiting"); }

  function startRecording() {
    if (recorder.current?.state === "recording" || stopping || cloudActive || !programReady || !canvas.current) return;
    setMessage("");
    if (!window.MediaRecorder || !canvas.current.captureStream) { setMessage("เบราว์เซอร์นี้ยังบันทึกภาพจากสตูดิโอไม่ได้ ลอง Chrome หรือ Edge รุ่นที่รองรับ"); return; }
    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(t => MediaRecorder.isTypeSupported(t));
    if (!mimeType) { setMessage("ไม่พบรูปแบบวิดีโอที่เบราว์เซอร์บันทึกได้"); return; }
    let timer: number | undefined;
    try {
      const stream = canvas.current.captureStream(30);
      capture.current = stream;
      const mic = inputs.audio.current?.getAudioTracks().find(t => t.readyState === "live");
      if (!mic) throw new Error("ไม่มีไมค์ผู้ขาย");
      const audio = mic.clone(); stream.addTrack(audio);
      const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      recorder.current = rec;
      const chunks: Blob[] = [];
      let bytes = 0;
      const start = performance.now(); const startedAt = new Date().toISOString(); const recordingTitle = title;
      let endedAt = startedAt; let durationMs = 0;
      timer = window.setInterval(() => {
        const duration = performance.now() - start;
        if (mounted.current) setElapsed(duration);
        if (duration >= RECORDING_LIMIT_MS && rec.state === "recording") {
          setMessage("ครบเวลาทดลอง 15 นาทีแล้ว หยุดและเตรียมไฟล์ให้ดาวน์โหลด"); setStopping(true); rec.stop();
        }
      }, 200);
      rec.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
        if (bytes >= RECORDING_LIMIT_BYTES && rec.state === "recording") {
          setMessage("ไฟล์ถึงขีดจำกัด 256 MB แล้ว หยุดและเตรียมไฟล์ให้ดาวน์โหลด"); setStopping(true); rec.stop();
        }
      };
      rec.onerror = () => {
        if (mounted.current) setMessage("เกิดข้อผิดพลาดระหว่างบันทึก ตรวจไฟล์ที่กู้คืนได้ก่อนใช้งาน");
        if (rec.state !== "inactive") rec.stop();
      };
      rec.onstop = () => {
        durationMs = performance.now() - start; endedAt = new Date().toISOString();
        window.clearInterval(timer); stream.getTracks().forEach(t => t.stop());
        capture.current = null; recorder.current = null;
        if (!mounted.current) return;
        setRecording(false); setStopping(false); setElapsed(durationMs);
        if (!bytes) { setMessage("ไม่พบข้อมูลวิดีโอ กรุณาลองบันทึกใหม่"); return; }
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
        const url = URL.createObjectURL(blob); outputUrl.current = url;
        setResult({ url, bytes, title: recordingTitle, startedAt, endedAt, durationMs, extension: rec.mimeType.includes("mp4") ? "mp4" : "webm" });
      };
      rec.start(1000); setRecording(true); setElapsed(0);
    } catch {
      window.clearInterval(timer);
      capture.current?.getTracks().forEach(t => t.stop()); capture.current = null; recorder.current = null;
      setRecording(false); setStopping(false); setMessage("เริ่มบันทึกไม่ได้ กรุณาตรวจกล้องและไมค์แล้วลองใหม่");
    }
  }

  function downloadReport() {
    if (!result) return;
    const report = { version: 1, mode: "local-rehearsal", title: result.title, startedAtClient: result.startedAt, endedAtClient: result.endedAt, elapsedClientMs: Math.round(result.durationMs), recordingBytes: result.bytes, destinations: [], billed: false, note: "Local browser timing only. Not a server usage record or invoice." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "vibelink-live-rehearsal.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function attachImage(id: string, file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage("เลือกรูป PNG, JPEG หรือ WebP ขนาดไม่เกิน 5 MB"); return; }
    const url = URL.createObjectURL(file); const image = new Image(); image.src = url;
    try {
      await image.decode();
      if (image.naturalWidth * image.naturalHeight > 16_000_000) { URL.revokeObjectURL(url); setMessage("รูปมีความละเอียดสูงเกินไป กรุณาย่อให้ไม่เกิน 16 ล้านพิกเซล"); return; }
      if (!mounted.current || !visual.current.products.some(p => p.id === id)) { URL.revokeObjectURL(url); return; }
      if (images.current[id]) URL.revokeObjectURL(images.current[id].url);
      images.current[id] = { image, url }; setMessage("เพิ่มรูปแล้ว รูปอยู่เฉพาะแท็บนี้ กรุณาเลือกใหม่เมื่อเปิดครั้งถัดไป");
    } catch { URL.revokeObjectURL(url); setMessage("อ่านรูปนี้ไม่ได้ กรุณาเลือกไฟล์อื่น"); }
  }

  return <main className={s.studio}>
    <header className={s.header}>
      <Link href="/dashboard" className={s.brand}>Vibe<span>LinkTH</span> <small>Live</small></Link>
      <div className={s.row}><span className={s.badge}>2 SOURCES · ALPHA</span><Link className={s.link} href="/dashboard">กลับ Dashboard</Link></div>
    </header>
    <section className={s.intro}><div className={s.eyebrow}>YOUR VIBE. ON SCREEN.</div><h1>จัดซีนให้พร้อม แล้วลองรายการของคุณ</h1><p className={s.muted}>เตรียมกล้อง สลับฉาก และโชว์สินค้าจากเว็บเดียว</p></section>
    <div className={s.notice}>รับภาพสูงสุด 2 Source — เลือกกล้อง, USB Capture/Switcher หรือ Virtual Camera ที่ระบบมองเห็นเป็นกล้องได้ ภาพที่จัดจากอุปกรณ์ภายนอกใช้เต็มจอได้ทันที การส่งออกคลาวด์เปิดเฉพาะบัญชีทดสอบเมื่อบริการพร้อม</div>
    <div className={s.grid}>
      <aside className={s.stack}>
        <section className={s.panel}><h2>เตรียมรายการ</h2>
          <label>ชื่อรายการ<input value={title} maxLength={100} disabled={locked} onChange={e => setTitle(e.target.value)} /></label>
          <label>รูปแบบภาพ<select value={aspect} disabled={locked} onChange={e => setAspect(e.target.value as Aspect)}><option value="landscape">16:9 แนวนอน</option><option value="portrait">9:16 แนวตั้ง</option></select></label>
          <label>วิธีจัดภาพ<select value={programMode} disabled={locked} onChange={e => setProgramMode(e.target.value as ProgramMode)}><option value="studio">จัดฉากใน VibeLinkTH</option><option value="external">ใช้ภาพพร้อมจาก Switcher / OBS</option></select></label>
          <p className={s.muted}>{saved ? "บันทึกชื่อและสินค้าไว้ในเบราว์เซอร์นี้แล้ว" : "ฉบับร่างยังไม่ถูกบันทึก"} รูปและวิดีโอไม่ถูกเก็บในฉบับร่าง</p>
        </section>
        <section className={s.panel}><div className={s.heading}><h2>แหล่งภาพ 0–2 Source</h2><button aria-label="รีเฟรชอุปกรณ์" onClick={() => void inputs.refreshDevices()}><span className="ms" aria-hidden="true">refresh</span></button></div>
          {!inputs.mediaSupported && <p className={s.message}>เบราว์เซอร์ยังเปิดอุปกรณ์ไม่ได้ ต้องใช้ HTTPS และเบราว์เซอร์ที่รองรับกล้อง/ไมค์</p>}
          <p className={s.muted}>ใช้ 1 Source ก็เริ่มได้ ถ้ากล้องหลายตัวผ่าน Switcher เว็บจะเห็นเป็นภาพรวมหนึ่ง Source อุปกรณ์ต้องมี USB video output หรือ Capture Card; HDMI splitter อย่างเดียวไม่แปลงเป็นกล้องเว็บ</p>
          {(["host", "product"] as Source[]).map(source => <div className={s.source} key={source}>
            <h3>Source {source === "host" ? "A" : "B"}</h3>
            <label>ประเภท Source<select aria-label={`ประเภท Source ${source === "host" ? "A" : "B"}`} value={inputs.kinds[source]} disabled={locked || busy[source]} onChange={e => inputs.setKinds(v => ({ ...v, [source]: e.target.value as "camera" | "screen" }))}><option value="camera">กล้อง / USB Capture / Virtual Camera</option><option value="screen" disabled={!inputs.screenSupported}>แชร์หน้าจอหรือหน้าต่าง</option></select></label>
            {inputs.kinds[source] === "camera" && <label>เลือกอุปกรณ์ภาพ<select aria-label={source === "host" ? "เลือก Source A" : "เลือก Source B"} value={inputs.selected[source]} disabled={locked || busy[source]} onChange={e => inputs.setSelected(v => ({ ...v, [source]: e.target.value }))}><option value="">อุปกรณ์เริ่มต้น</option>{devices.filter(d => d.kind === "videoinput").map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `กล้อง / Capture ${i + 1}`}</option>)}</select></label>}
            <button className={s.wide} disabled={locked || busy[source] || !inputs.mediaSupported} onClick={() => void inputs.openVideo(source)}><span className="ms" aria-hidden="true">videocam</span>{busy[source] ? "กำลังขอสิทธิ์…" : ready[source] ? "เปลี่ยน / เปิด Source ใหม่" : "เปิด Source"}</button>
            <p className={s.muted}>{ready[source] ? "รับภาพแล้ว" : "ยังไม่เชื่อม"} · ไม่มีเสียงจากส่วนนี้</p>
          </div>)}
          <button className={s.wide} disabled={locked || (!ready.host && !ready.product && !ready.audio && !busy.host && !busy.product && !busy.audio)} onClick={closeCameras}>ปิดภาพและเสียงทั้งหมด</button>
        </section>
        <section className={s.panel}><h2>แหล่งเสียงหลัก</h2>
          <label>เลือกไมค์ / เสียงจาก Capture<select value={inputs.selected.audio} disabled={locked || busy.audio} onChange={e => inputs.setSelected(v => ({ ...v, audio: e.target.value }))}><option value="">เสียงเริ่มต้นของระบบ</option>{devices.filter(d => d.kind === "audioinput").map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `แหล่งเสียง ${i + 1}`}</option>)}</select></label>
          <label>ลักษณะเสียง<select value={inputs.audioProfile} disabled={locked || busy.audio} onChange={e => inputs.setAudioProfile(e.target.value as "microphone" | "mixer")}><option value="microphone">ไมค์พูด · ลดเสียงสะท้อน</option><option value="mixer">เสียงมิกซ์จากอุปกรณ์ · ไม่แต่งเสียงซ้ำ</option></select></label>
          <button className={s.wide} disabled={locked || busy.audio || !inputs.mediaSupported} onClick={() => void inputs.openAudio()}>{busy.audio ? "กำลังขอสิทธิ์…" : ready.audio ? "เปลี่ยน / เปิดเสียงใหม่" : "เปิดแหล่งเสียง"}</button>
          <label className={s.meterLabel}>ระดับเสียง<meter className={s.meter} min={0} max={100} low={5} high={85} optimum={55} value={muted ? 0 : inputs.level ?? 0} aria-label="ระดับเสียงขาเข้า" /></label>
          <p className={s.muted}>{!ready.audio ? "ยังไม่เชื่อมเสียง" : muted ? "เสียงปิดอยู่" : inputs.level === null ? "เชื่อมแล้ว · ตรวจเสียงจากไฟล์ซ้อม" : inputs.level < 3 ? "ยังไม่มีเสียงเข้า ลองพูดหรือตรวจ Mixer" : "มีสัญญาณเสียงเข้า"} ไม่เปิดเสียงย้อนออกลำโพง</p>
        </section>
      </aside>
      <section className={`${s.panel} ${s.center}`}>
        <div className={s.heading}><h2>ภาพรายการ</h2><span className={s.badge}>{cloudActive ? "PROGRAM TO CLOUD" : recording ? "● RECORDING IN DEVICE" : "PREVIEW ONLY"}</span></div>
        <div className={s.preview}><canvas ref={canvas} className={s.canvas} aria-label="ภาพรายการที่ใช้บันทึก" /></div>
        <video ref={host} className={s.hidden} muted playsInline autoPlay aria-hidden="true" />
        <video ref={product} className={s.hidden} muted playsInline autoPlay aria-hidden="true" />
        <div className={s.toolbar}><div><div className={s.timer}>{clock(elapsed)}</div><span className={s.muted}>เวลาบันทึกในเครื่อง · ไม่ใช่หน่วยคิดเงิน</span></div>
          <div className={s.row}><button aria-pressed={muted} disabled={!ready.audio} onClick={inputs.toggleMute}><span className="ms" aria-hidden="true">{muted ? "mic_off" : "mic"}</span>{muted ? "เปิดไมค์" : "ปิดไมค์"}</button>
            {recording || stopping ? <button className={s.danger} disabled={stopping} onClick={() => { if (recorder.current?.state === "recording") { setStopping(true); recorder.current.stop(); } }}>{stopping ? "เตรียมไฟล์…" : "หยุดบันทึก"}</button> : <button className={s.primary} disabled={!programReady || busy.host || busy.product || busy.audio || cloudActive} onClick={startRecording}>เริ่มบันทึกซ้อม</button>}
          </div>
        </div>
        <p className={s.muted}>บันทึกสูงสุด 15 นาทีหรือ 256 MB ต่อครั้ง เปิดแท็บนี้ไว้ตลอดและดาวน์โหลดก่อนปิดหน้า เสียงมาจากแหล่งเสียงหลักที่เลือก รวมถึงตอนแสดงหน้ารอ</p>
        {programMode === "external" && <label>ภาพพร้อมใช้จาก<select value={externalSlot} onChange={e => setExternalSlot(e.target.value as Source)}><option value="host">Source A</option><option value="product">Source B</option></select><span className={s.muted}>ใช้ภาพเต็มโดยรักษาสัดส่วน ป้ายและฉากในเว็บจะไม่ทับภาพที่จัดมาแล้ว</span></label>}
        <h2>เลือกฉาก</h2><div className={s.buttons}>{scenes.map(item => <button key={item.id} className={`${s.scene} ${scene === item.id ? s.selected : ""}`} aria-pressed={scene === item.id} disabled={programMode === "external" || (item.id === "host" && !ready.host) || (item.id === "product" && !ready.product) || (item.id === "split" && (!ready.host || !ready.product))} onClick={() => setScene(item.id)}><span className="ms" aria-hidden="true">{item.icon}</span>{item.label}</button>)}</div>
        <div role="status" aria-live="polite" className={s.message}>{message}</div>
        {result && <section className={s.result}><h2>ไฟล์ซ้อมล่าสุด</h2><p className={s.muted}>{result.title} · {clock(result.durationMs)} · {(result.bytes / 1024 / 1024).toFixed(1)} MB</p><video src={result.url} controls playsInline aria-label="เปิดดูไฟล์ซ้อมล่าสุด" /><div className={s.buttons}><a className={s.link} href={result.url} download={`vibelink-live.${result.extension}`}>ดาวน์โหลดวิดีโอ</a><button onClick={downloadReport}>ดาวน์โหลดสรุปการซ้อม</button></div><p className={s.muted}>ตรวจภาพและเสียงด้วยการเล่นไฟล์ก่อนนำไปใช้ ไฟล์รอบก่อนจะถูกแทนที่เมื่อบันทึกรอบใหม่เสร็จ</p></section>}
      </section>
      <aside className={`${s.stack} ${s.right}`}>
        <section className={s.panel}><h2>คิวสินค้า <span className={s.muted}>{products.length}/20</span></h2>
          <form onSubmit={e => { e.preventDefault(); if (!name.trim() || products.length >= 20) return; setProducts(v => [...v, { id: newLiveId(), name: name.trim(), price: price.trim() }]); setName(""); setPrice(""); }}>
            <label>ชื่อสินค้า<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="เช่น กระเป๋ารุ่น Daily" /></label>
            <label>ราคา / ข้อความสั้น<input maxLength={24} value={price} onChange={e => setPrice(e.target.value)} placeholder="เช่น ฿390" /></label>
            <button className={`${s.primary} ${s.wide}`} disabled={!name.trim() || products.length >= 20}>เพิ่มสินค้า</button>
          </form>
          <p className={s.muted}>ป้ายบนวิดีโอ ยังไม่ใช่ตะกร้าสินค้าของแพลตฟอร์ม</p>
          {!products.length && <p className={s.empty}>เพิ่มสินค้าชิ้นแรก แล้วเลือกแสดงป้ายในรายการ</p>}
          {products.map((p, index) => <article key={p.id} className={s.product}><strong>{p.name}</strong><span className={s.muted}>{p.price}</span><div className={s.buttons}><button aria-label={`เลื่อน ${p.name} ขึ้น`} disabled={index === 0} onClick={() => setProducts(v => { const next = [...v]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>↑ ขึ้น</button><button aria-label={`เลื่อน ${p.name} ลง`} disabled={index === products.length - 1} onClick={() => setProducts(v => { const next = [...v]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })}>↓ ลง</button></div><label>รูปสินค้า<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void attachImage(p.id, e.target.files?.[0])} /></label><div className={s.buttons}><button className={activeProduct === p.id ? s.selected : ""} aria-pressed={activeProduct === p.id} disabled={programMode === "external"} onClick={() => setActiveProduct(v => v === p.id ? null : p.id)}>{activeProduct === p.id ? "ซ่อนป้าย" : "แสดงป้าย"}</button><button onClick={() => { setProducts(v => v.filter(item => item.id !== p.id)); if (activeProduct === p.id) setActiveProduct(null); if (images.current[p.id]) { URL.revokeObjectURL(images.current[p.id].url); delete images.current[p.id]; } }}>ลบ</button></div></article>)}
        </section>
        <section className={s.panel}><h2>ตรวจความพร้อม</h2>{[
          { label: ready.host ? "Source A รับภาพแล้ว" : "Source A ยังไม่เชื่อม", ok: ready.host },
          { label: ready.audio ? muted ? "เสียงหลักปิดอยู่" : "เสียงหลักเชื่อมแล้ว" : "ยังไม่เชื่อมแหล่งเสียง", ok: ready.audio && !muted },
          { label: ready.product ? "Source B รับภาพแล้ว" : "Source B เป็นตัวเลือกเสริม", ok: ready.product },
          { label: recording ? "กำลังบันทึกในเครื่อง" : "ไม่ได้บันทึก", ok: recording },
        ].map(item => <div className={s.status} key={item.label}><span className={`${s.dot} ${item.ok ? s.good : ""}`} /><span>{item.label}</span></div>)}
          <p className={s.muted}>ภาพหนึ่ง Source และเสียงหลักก็เพียงพอ ใช้ไฟล์ซ้อมตรวจภาพและเสียงก่อนส่งออก</p>
        </section>
        <CloudOutput canvas={canvas} audio={inputs.audio} audioMuted={muted} title={title} aspect={aspect} ready={programReady} localRecording={recording || stopping} stopSignal={stopSignal} onActive={setCloudActive} />
      </aside>
    </div>
  </main>;
}
