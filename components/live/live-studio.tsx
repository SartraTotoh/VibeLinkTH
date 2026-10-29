"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clock, coverCrop, dimensions, readDraft, RECORDING_LIMIT_BYTES, RECORDING_LIMIT_MS, type Aspect, type Product, type Scene } from "@/lib/live/studio";
import s from "./live-studio.module.css";

type Source = "host" | "product";
type Result = { url: string; extension: string; bytes: number; title: string; startedAt: string; endedAt: string; durationMs: number };
const scenes: { id: Scene; icon: string; label: string }[] = [
  { id: "host", icon: "person", label: "ผู้ขาย" }, { id: "product", icon: "inventory_2", label: "สินค้า" },
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
  const [ready, setReady] = useState<Record<Source, boolean>>({ host: false, product: false });
  const [busy, setBusy] = useState<Record<Source, boolean>>({ host: false, product: false });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [camera, setCamera] = useState<Record<Source, string>>({ host: "", product: "" });
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLVideoElement>(null);
  const product = useRef<HTMLVideoElement>(null);
  const streams = useRef<Partial<Record<Source, MediaStream>>>({});
  const images = useRef<Record<string, { image: HTMLImageElement; url: string }>>({});
  const recorder = useRef<MediaRecorder | null>(null);
  const capture = useRef<MediaStream | null>(null);
  const outputUrl = useRef<string | null>(null);
  const mounted = useRef(false);
  const requests = useRef({ host: 0, product: 0 });
  const visual = useRef({ scene, products, activeProduct, title });
  visual.current = { scene, products, activeProduct, title };
  const key = `vibelink-live-draft-v1:${ownerId}`;
  const locked = recording || stopping;

  useEffect(() => {
    mounted.current = true;
    const requestIds = requests.current;
    const loadedImages = images.current;
    try {
      const draft = readDraft(localStorage.getItem(key));
      if (draft) { setTitle(draft.title); setAspect(draft.aspect); setProducts(draft.products); }
    } catch { setMessage("เบราว์เซอร์ไม่อนุญาตให้เก็บฉบับร่าง ยังใช้สตูดิโอได้"); }
    setDraftLoaded(true);
    const hide = () => {
      if (document.hidden && recorder.current?.state === "recording") {
        setMessage("หยุดบันทึกเมื่อออกจากแท็บ เพื่อไม่ให้ได้ไฟล์ที่ภาพค้าง กรุณาเปิดแท็บนี้ไว้ระหว่างบันทึก");
        setStopping(true); recorder.current.stop();
      }
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (recorder.current && recorder.current.state !== "inactive") { event.preventDefault(); event.returnValue = ""; }
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", leave);
    return () => {
      mounted.current = false;
      requestIds.host++; requestIds.product++;
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      capture.current?.getTracks().forEach(t => t.stop());
      Object.values(streams.current).forEach(stream => stream?.getTracks().forEach(t => t.stop()));
      Object.values(loadedImages).forEach(i => URL.revokeObjectURL(i.url));
      if (outputUrl.current) URL.revokeObjectURL(outputUrl.current);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("beforeunload", leave);
    };
  }, [key]);

  useEffect(() => {
    if (!draftLoaded) return;
    try { localStorage.setItem(key, JSON.stringify({ title, aspect, products })); setSaved(true); }
    catch { setSaved(false); }
  }, [title, aspect, products, draftLoaded, key]);

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
      if (v.scene === "waiting") {
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
      if (item && v.scene !== "waiting") {
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
  }, [aspect]);

  async function openCamera(source: Source) {
    if (busy[source] || locked || !mounted.current) return;
    const request = ++requests.current[source];
    setBusy(v => ({ ...v, [source]: true })); setMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("ต้องเปิดผ่าน HTTPS และใช้เบราว์เซอร์ที่รองรับกล้อง");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camera[source] ? { deviceId: { exact: camera[source] }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: source === "product" ? "environment" : "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: source === "host" ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      if (!mounted.current || request !== requests.current[source]) { stream.getTracks().forEach(t => t.stop()); return; }
      streams.current[source]?.getTracks().forEach(t => t.stop());
      streams.current[source] = stream;
      if (source === "host") stream.getAudioTracks().forEach(t => { t.enabled = !muted; });
      const video = source === "host" ? host.current : product.current;
      if (video) { video.srcObject = stream; await video.play(); }
      stream.getTracks().forEach(track => {
        track.onended = () => {
          if (!mounted.current || requests.current[source] !== request) return;
          if (source === "host" && recorder.current?.state === "recording") { setStopping(true); recorder.current.stop(); }
          stream.getTracks().forEach(t => t.stop());
          delete streams.current[source];
          setReady(v => ({ ...v, [source]: false }));
          setMessage(source === "host" ? "กล้องหรือไมค์ผู้ขายหยุดทำงาน กรุณาเปิดใหม่ บันทึกที่กำลังทำจะหยุด" : "กล้องสินค้าหลุด กรุณาเปิดกล้องใหม่หรือเลือกฉากผู้ขาย");
        };
      });
      setReady(v => ({ ...v, [source]: true }));
      if (source === "host") setScene("host");
      try { setDevices((await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput")); } catch { /* Device list is optional. */ }
    } catch (error) {
      if (mounted.current && request === requests.current[source]) {
        streams.current[source]?.getTracks().forEach(t => t.stop()); delete streams.current[source];
        setReady(v => ({ ...v, [source]: false }));
        setMessage(error instanceof DOMException && error.name === "NotAllowedError" ? "ยังไม่ได้รับสิทธิ์กล้องและไมค์ กรุณาอนุญาตในเบราว์เซอร์แล้วลองใหม่" : "เปิดกล้องไม่ได้ กรุณาตรวจว่ามีอุปกรณ์และไม่มีแอปอื่นใช้อยู่ แล้วลองใหม่");
      }
    } finally { if (mounted.current && request === requests.current[source]) setBusy(v => ({ ...v, [source]: false })); }
  }

  function closeCameras() {
    requests.current.host++; requests.current.product++;
    Object.values(streams.current).forEach(stream => stream?.getTracks().forEach(t => t.stop()));
    streams.current = {};
    if (host.current) host.current.srcObject = null;
    if (product.current) product.current.srcObject = null;
    setReady({ host: false, product: false }); setBusy({ host: false, product: false }); setScene("waiting");
  }

  function startRecording() {
    if (recorder.current?.state === "recording" || stopping || !ready.host || !canvas.current) return;
    setMessage("");
    if (!window.MediaRecorder || !canvas.current.captureStream) { setMessage("เบราว์เซอร์นี้ยังบันทึกภาพจากสตูดิโอไม่ได้ ลอง Chrome หรือ Edge รุ่นที่รองรับ"); return; }
    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(t => MediaRecorder.isTypeSupported(t));
    if (!mimeType) { setMessage("ไม่พบรูปแบบวิดีโอที่เบราว์เซอร์บันทึกได้"); return; }
    let timer: number | undefined;
    try {
      const stream = canvas.current.captureStream(30);
      capture.current = stream;
      const mic = streams.current.host?.getAudioTracks().find(t => t.readyState === "live");
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

  function toggleMic() {
    const next = !muted; setMuted(next);
    streams.current.host?.getAudioTracks().forEach(t => { t.enabled = !next; });
    capture.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
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
      <div className={s.row}><span className={s.badge}>LOCAL REHEARSAL · ALPHA</span><Link className={s.link} href="/dashboard">กลับ Dashboard</Link></div>
    </header>
    <section className={s.intro}><div className={s.eyebrow}>YOUR VIBE. ON SCREEN.</div><h1>จัดซีนให้พร้อม แล้วลองรายการของคุณ</h1><p className={s.muted}>เตรียมกล้อง สลับฉาก และโชว์สินค้าจากเว็บเดียว</p></section>
    <div className={s.notice}>รุ่นทดลองซ้อมในเครื่อง — ยังไม่ส่งภาพไปแพลตฟอร์ม ไม่เปิดห้องบนคลาวด์ และยังไม่คิดค่าบริการ มือถืออีกเครื่องและผู้ช่วยจะเชื่อมได้หลังเปิดระบบห้องรายการ</div>
    <div className={s.grid}>
      <aside className={s.stack}>
        <section className={s.panel}><h2>เตรียมรายการ</h2>
          <label>ชื่อรายการ<input value={title} maxLength={100} disabled={locked} onChange={e => setTitle(e.target.value)} /></label>
          <label>รูปแบบภาพ<select value={aspect} disabled={locked} onChange={e => setAspect(e.target.value as Aspect)}><option value="landscape">16:9 แนวนอน</option><option value="portrait">9:16 แนวตั้ง</option></select></label>
          <p className={s.muted}>{saved ? "บันทึกชื่อและสินค้าไว้ในเบราว์เซอร์นี้แล้ว" : "ฉบับร่างยังไม่ถูกบันทึก"} รูปและวิดีโอไม่ถูกเก็บในฉบับร่าง</p>
        </section>
        <section className={s.panel}><h2>แหล่งภาพ</h2>
          {(["host", "product"] as Source[]).map(source => <div key={source}>
            <label>{source === "host" ? "กล้องและไมค์ผู้ขาย" : "กล้องสินค้าในเครื่องนี้ · ไม่มีเสียง"}<select aria-label={source === "host" ? "เลือกกล้องผู้ขาย" : "เลือกกล้องสินค้า"} value={camera[source]} disabled={locked || busy[source]} onChange={e => setCamera(v => ({ ...v, [source]: e.target.value }))}><option value="">กล้องเริ่มต้น</option>{devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `กล้อง ${i + 1}`}</option>)}</select></label>
            <button className={s.wide} disabled={locked || busy[source]} onClick={() => void openCamera(source)}><span className="ms" aria-hidden="true">videocam</span>{busy[source] ? "กำลังขอสิทธิ์…" : ready[source] ? "เปิดใหม่ / ใช้กล้องที่เลือก" : "เปิดกล้อง"}</button>
            <p className={s.muted}>{ready[source] ? "เชื่อมอุปกรณ์แล้ว" : "ยังไม่เชื่อม"}</p>
          </div>)}
          <button className={s.wide} disabled={locked || (!ready.host && !ready.product && !busy.host && !busy.product)} onClick={closeCameras}>ปิดกล้องและไมค์ทั้งหมด</button>
        </section>
      </aside>
      <section className={`${s.panel} ${s.center}`}>
        <div className={s.heading}><h2>ภาพรายการ</h2><span className={s.badge}>{recording ? "● RECORDING IN DEVICE" : "PREVIEW ONLY"}</span></div>
        <div className={s.preview}><canvas ref={canvas} className={s.canvas} aria-label="ภาพรายการที่ใช้บันทึก" /></div>
        <video ref={host} className={s.hidden} muted playsInline autoPlay aria-hidden="true" />
        <video ref={product} className={s.hidden} muted playsInline autoPlay aria-hidden="true" />
        <div className={s.toolbar}><div><div className={s.timer}>{clock(elapsed)}</div><span className={s.muted}>เวลาบันทึกในเครื่อง · ไม่ใช่หน่วยคิดเงิน</span></div>
          <div className={s.row}><button aria-pressed={muted} disabled={!ready.host} onClick={toggleMic}><span className="ms" aria-hidden="true">{muted ? "mic_off" : "mic"}</span>{muted ? "เปิดไมค์" : "ปิดไมค์"}</button>
            {locked ? <button className={s.danger} disabled={stopping} onClick={() => { if (recorder.current?.state === "recording") { setStopping(true); recorder.current.stop(); } }}>{stopping ? "เตรียมไฟล์…" : "หยุดบันทึก"}</button> : <button className={s.primary} disabled={!ready.host || busy.host || busy.product} onClick={startRecording}>เริ่มบันทึกซ้อม</button>}
          </div>
        </div>
        <p className={s.muted}>บันทึกสูงสุด 15 นาทีหรือ 256 MB ต่อครั้ง เปิดแท็บนี้ไว้ตลอดและดาวน์โหลดก่อนปิดหน้า เสียงมาจากไมค์ผู้ขาย รวมถึงตอนแสดงหน้ารอ</p>
        <h2>เลือกฉาก</h2><div className={s.buttons}>{scenes.map(item => <button key={item.id} className={`${s.scene} ${scene === item.id ? s.selected : ""}`} aria-pressed={scene === item.id} onClick={() => setScene(item.id)}><span className="ms" aria-hidden="true">{item.icon}</span>{item.label}</button>)}</div>
        <div role="status" aria-live="polite" className={s.message}>{message}</div>
        {result && <section className={s.result}><h2>ไฟล์ซ้อมล่าสุด</h2><p className={s.muted}>{result.title} · {clock(result.durationMs)} · {(result.bytes / 1024 / 1024).toFixed(1)} MB</p><video src={result.url} controls playsInline aria-label="เปิดดูไฟล์ซ้อมล่าสุด" /><div className={s.buttons}><a className={s.link} href={result.url} download={`vibelink-live.${result.extension}`}>ดาวน์โหลดวิดีโอ</a><button onClick={downloadReport}>ดาวน์โหลดสรุปการซ้อม</button></div><p className={s.muted}>ตรวจภาพและเสียงด้วยการเล่นไฟล์ก่อนนำไปใช้ ไฟล์รอบก่อนจะถูกแทนที่เมื่อบันทึกรอบใหม่เสร็จ</p></section>}
      </section>
      <aside className={`${s.stack} ${s.right}`}>
        <section className={s.panel}><h2>คิวสินค้า <span className={s.muted}>{products.length}/20</span></h2>
          <form onSubmit={e => { e.preventDefault(); if (!name.trim() || products.length >= 20) return; setProducts(v => [...v, { id: crypto.randomUUID(), name: name.trim(), price: price.trim() }]); setName(""); setPrice(""); }}>
            <label>ชื่อสินค้า<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="เช่น กระเป๋ารุ่น Daily" /></label>
            <label>ราคา / ข้อความสั้น<input maxLength={24} value={price} onChange={e => setPrice(e.target.value)} placeholder="เช่น ฿390" /></label>
            <button className={`${s.primary} ${s.wide}`} disabled={!name.trim() || products.length >= 20}>เพิ่มสินค้า</button>
          </form>
          <p className={s.muted}>ป้ายบนวิดีโอ ยังไม่ใช่ตะกร้าสินค้าของแพลตฟอร์ม</p>
          {!products.length && <p className={s.empty}>เพิ่มสินค้าชิ้นแรก แล้วเลือกแสดงป้ายในรายการ</p>}
          {products.map(p => <article key={p.id} className={s.product}><strong>{p.name}</strong><span className={s.muted}>{p.price}</span><label>รูปสินค้า<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void attachImage(p.id, e.target.files?.[0])} /></label><div className={s.buttons}><button className={activeProduct === p.id ? s.selected : ""} aria-pressed={activeProduct === p.id} onClick={() => setActiveProduct(v => v === p.id ? null : p.id)}>{activeProduct === p.id ? "ซ่อนป้าย" : "แสดงป้าย"}</button><button onClick={() => { setProducts(v => v.filter(item => item.id !== p.id)); if (activeProduct === p.id) setActiveProduct(null); if (images.current[p.id]) { URL.revokeObjectURL(images.current[p.id].url); delete images.current[p.id]; } }}>ลบ</button></div></article>)}
        </section>
        <section className={s.panel}><h2>ตรวจความพร้อม</h2>{[
          { label: ready.host ? "กล้องผู้ขายพร้อม" : "รอกล้องผู้ขาย", ok: ready.host },
          { label: ready.host ? muted ? "ไมค์ผู้ขายปิดอยู่" : "ไมค์ผู้ขายเปิดอยู่ · ตรวจเสียงจากไฟล์ซ้อม" : "รอไมค์ผู้ขาย", ok: ready.host && !muted },
          { label: ready.product ? "กล้องสินค้าพร้อม" : "กล้องสินค้าเป็นตัวเลือกเสริม", ok: ready.product },
          { label: recording ? "กำลังบันทึกในเครื่อง" : "ไม่ได้บันทึก", ok: recording },
          { label: "ช่องปลายทางยังไม่เชื่อม", ok: false },
        ].map(item => <div className={s.status} key={item.label}><span className={`${s.dot} ${item.ok ? s.good : ""}`} /><span>{item.label}</span></div>)}
          <button className={s.wide} disabled>ส่งไลฟ์ · รอเชื่อมบริการสื่อ</button>
          <p className={s.muted}>ขั้นถัดไป: ห้องหลายอุปกรณ์ ผู้ช่วย ส่งออกหนึ่งช่อง บันทึกบนคลาวด์ และเวลาอ้างอิงเซิร์ฟเวอร์</p>
        </section>
      </aside>
    </div>
  </main>;
}
