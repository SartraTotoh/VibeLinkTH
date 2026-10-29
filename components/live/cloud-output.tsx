"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Room } from "livekit-client";
import { newLiveId, type Aspect } from "@/lib/live/studio";
import type { CloudShow, LiveReadiness } from "@/lib/live/types";
import s from "./live-studio.module.css";

type Props = { canvas: RefObject<HTMLCanvasElement | null>; audio: RefObject<MediaStream | null>; audioMuted: boolean; title: string; aspect: Aspect; ready: boolean; localRecording: boolean; stopSignal: number; onActive: (active: boolean) => void };
async function api(path: string, body?: unknown, keepalive = false) {
  const response = await fetch(`/api/live/${path}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", keepalive, headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "เชื่อมบริการไม่ได้");
  return data;
}

export function CloudOutput({ canvas, audio, audioMuted, title, aspect, ready, localRecording, stopSignal, onActive }: Props) {
  const [readiness, setReadiness] = useState<LiveReadiness | null>(null);
  const [show, setShow] = useState<CloudShow | null>(null);
  const [history, setHistory] = useState<CloudShow[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const session = useRef<{ room: Room; stream: MediaStream; id: string; videoTrackId: string; audioTrackId: string } | null>(null);
  const alive = useRef(false);
  const currentShow = useRef(show); currentShow.current = show;
  const callbacks = useRef({ onActive }); callbacks.current = { onActive };
  const action = useRef(false);
  const connectionAttempt = useRef({ generation: 0 });
  const stopRef = useRef<() => Promise<void>>(async () => {});
  const requestId = useRef("");
  const acceptShow = useCallback((value: CloudShow) => {
    setShow(value);
    setHistory(previous => [value, ...previous.filter(v => v.id !== value.id)].slice(0, 20));
  }, []);

  const releaseLocal = useCallback(() => {
    const previous = session.current; session.current = null;
    previous?.stream.getTracks().forEach(t => t.stop());
    if (previous) void previous.room.disconnect().catch(() => {});
    if (alive.current) setConnected(false);
    if (alive.current) callbacks.current.onActive(false);
  }, []);
  const refresh = useCallback(async (id: string) => {
    const data = await api(`shows/${id}`);
    if (alive.current && currentShow.current?.id === id) {
      acceptShow(data.show);
      if (data.syncPending) setMessage("ยังตรวจสถานะล่าสุดจากบริการสื่อไม่ได้ กรุณาตรวจหน้ารับชมและลองอีกครั้ง");
    }
    return data.show as CloudShow;
  }, [acceptShow]);
  async function stop() {
    connectionAttempt.current.generation++; releaseLocal();
    const id = currentShow.current?.id;
    if (!id) return;
    try {
      const data = await api(`shows/${id}/stop`, {});
      if (alive.current) {
        if (data.show) acceptShow(data.show);
        setMessage(data.pending || !data.show ? "หยุดส่งจากเครื่องแล้ว กำลังรอยืนยันว่าทรัพยากรคลาวด์หยุดจริง" : "ปิดห้องและยืนยันการหยุดแล้ว");
      }
    } catch (error) { if (alive.current) setMessage(`${error instanceof Error ? error.message : "ตรวจการหยุดไม่ได้"} · ระบบจะตรวจซ้ำจากเซิร์ฟเวอร์`); }
  }
  stopRef.current = stop;

  useEffect(() => {
    alive.current = true;
    const attemptState = connectionAttempt.current;
    void api("config").then(async data => {
      if (!alive.current) return; setReadiness(data);
      if (data.enabled) {
        const result = await api("shows");
        if (alive.current) { setHistory(result.shows); setShow(result.shows.find((v: CloudShow) => !v.closedAt) ?? null); }
      }
    }).catch(error => { if (alive.current) setMessage(error.message); });
    return () => {
      alive.current = false; attemptState.generation++;
      const id = session.current?.id; releaseLocal();
      if (id) void api(`shows/${id}/stop`, {}, true).catch(() => {});
    };
  }, [releaseLocal]);

  useEffect(() => {
    session.current?.stream.getAudioTracks().forEach(t => { t.enabled = !audioMuted; });
  }, [audioMuted]);
  useEffect(() => { if (stopSignal > 0 && (session.current || action.current)) void stopRef.current(); }, [stopSignal]);
  useEffect(() => {
    if (!show?.id || show.closedAt || !readiness?.enabled) return;
    const id = show.id;
    let polling = false;
    const timer = window.setInterval(async () => {
      if (polling) return; polling = true;
      try {
        if (session.current?.id === id) await api(`shows/${id}/heartbeat`, {});
        const latest = await refresh(id);
        if (latest.closedAt) releaseLocal();
        else if (latest.closing && (!latest.output || ["ENDED", "FAILED"].includes(latest.output.state))) await stopRef.current();
      } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : "ตรวจสถานะไม่ได้"); }
      finally { polling = false; }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [show?.id, show?.closedAt, readiness?.enabled, refresh, releaseLocal]);

  async function createShow() {
    if (action.current || !readiness?.enabled) return;
    action.current = true; setBusy(true); setMessage("");
    try {
      const data = await api("shows", { id: newLiveId(), title: title.trim() || "รายการใหม่", aspect });
      if (alive.current) { acceptShow(data.show); requestId.current = ""; }
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : "สร้างรายการไม่ได้"); }
    finally { action.current = false; if (alive.current) setBusy(false); }
  }

  async function connect() {
    if (action.current || !show || show.closedAt || show.closing || show.output || !ready || localRecording || show.aspect !== aspect) return;
    action.current = true; setBusy(true); callbacks.current.onActive(true); setMessage("");
    const attempt = ++connectionAttempt.current.generation;
    let room: Room | undefined; let stream: MediaStream | undefined;
    try {
      const { Room, RoomEvent, Track } = await import("livekit-client");
      const data = await api(`shows/${show.id}/connect`, {});
      if (!alive.current || attempt !== connectionAttempt.current.generation) return;
      room = new Room({ adaptiveStream: false, dynacast: false });
      await room.connect(data.url, data.token, { autoSubscribe: false });
      if (!alive.current || attempt !== connectionAttempt.current.generation) return;
      if (!canvas.current?.captureStream) throw new Error("เบราว์เซอร์ส่งภาพรายการไม่ได้");
      stream = canvas.current.captureStream(30);
      const audioTrack = audio.current?.getAudioTracks().find(t => t.readyState === "live")?.clone();
      if (!audioTrack) throw new Error("กรุณาเปิดแหล่งเสียงก่อน");
      audioTrack.enabled = !audioMuted; stream.addTrack(audioTrack);
      const videoPub = await room.localParticipant.publishTrack(stream.getVideoTracks()[0], { name: "program-video", source: Track.Source.Camera, simulcast: false, videoCodec: "h264", videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 } });
      if (!alive.current || attempt !== connectionAttempt.current.generation) return;
      const audioPub = await room.localParticipant.publishTrack(audioTrack, { name: "program-audio", source: Track.Source.Microphone });
      if (!alive.current || attempt !== connectionAttempt.current.generation) return;
      const liveRoom = room;
      session.current = { room, stream, id: show.id, videoTrackId: videoPub.trackSid, audioTrackId: audioPub.trackSid };
      room.on(RoomEvent.Disconnected, () => {
        if (session.current?.room !== liveRoom) return;
        setMessage("การเชื่อมต่อห้องสิ้นสุด กำลังสั่งหยุดฝั่งเซิร์ฟเวอร์"); void stopRef.current();
      });
      room.on(RoomEvent.Reconnecting, () => { if (alive.current) setMessage("กำลังเชื่อมห้องใหม่ ตรวจสถานะปลายทางก่อนดำเนินรายการต่อ"); });
      setConnected(true); setMessage("ภาพและเสียงเข้าห้องแล้ว ยังไม่ได้ส่งออกไปปลายทาง");
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : "เชื่อมห้องไม่ได้"); }
    finally {
      if (!session.current || session.current.room !== room) { stream?.getTracks().forEach(t => t.stop()); if (room) void room.disconnect().catch(() => {}); if (alive.current) callbacks.current.onActive(false); }
      action.current = false; if (alive.current) setBusy(false);
    }
  }

  async function startOutput() {
    const live = session.current;
    if (action.current || !live || !show || show.output || !streamKey) return;
    action.current = true; setBusy(true); setMessage("");
    if (!requestId.current) requestId.current = newLiveId();
    const key = streamKey; setStreamKey("");
    try {
      const data = await api(`shows/${show.id}/output`, { requestId: requestId.current, endpoint, streamKey: key, videoTrackId: live.videoTrackId, audioTrackId: live.audioTrackId });
      if (alive.current) { if (data.show) acceptShow(data.show); if (data.error) setMessage(data.error); }
      await refresh(show.id);
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : "ยังยืนยันการส่งออกไม่ได้");
      try { await refresh(show.id); } catch { /* Preserve uncertainty; do not replay start. */ }
    } finally { action.current = false; if (alive.current) setBusy(false); }
  }

  function downloadSummary() {
    if (!show) return;
    const blob = new Blob([JSON.stringify({ ...show, billed: false, timingSource: "provider-verified-server-record", publicationVerified: false }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `vibelink-live-${show.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className={s.panel}>
    <h2>ห้องรายการและปลายทาง</h2>
    <p className={s.muted}>{readiness?.reason ?? "กำลังตรวจความพร้อมของบริการ…"}</p>
    <p className={s.muted}>หนึ่งรายการส่งออกได้หนึ่งช่อง เสียงและภาพมาจาก Program ของเครื่องนี้ รุ่นทดสอบยังไม่เรียกเก็บลูกค้า การเปิดห้องอาจมีต้นทุนจากผู้ให้บริการสื่อ</p>
    {readiness?.enabled && <>
      {history.length > 0 && <label>ประวัติรายการ<select disabled={connected || busy} value={show?.id ?? ""} onChange={e => setShow(history.find(v => v.id === e.target.value) ?? null)}><option value="">เลือกรายการ</option>{history.map(v => <option key={v.id} value={v.id}>{v.title} · {v.closedAt ? "ปิดแล้ว" : "เปิดอยู่"}</option>)}</select></label>}
      {show && <p className={s.muted}>{show.title} · {show.closedAt ? "ปิดแล้ว" : "รายการเปิดอยู่"} · {show.aspect === "portrait" ? "9:16" : "16:9"}</p>}
      {(!show || show.closedAt) && <button className={s.wide} disabled={busy || localRecording} onClick={() => void createShow()}>สร้างรายการบนเซิร์ฟเวอร์</button>}
      {show && !show.closedAt && <>
        <button className={s.wide} disabled={busy || connected || !ready || localRecording || show.closing || show.aspect !== aspect || Boolean(show.output)} onClick={() => void connect()}>{busy ? "กำลังดำเนินการ…" : connected ? "ภาพและเสียงเข้าห้องแล้ว" : "เปิดห้องและส่ง Program"}</button>
        {show.aspect !== aspect && <p className={s.message}>ปรับรูปแบบภาพให้ตรงกับรายการนี้ก่อนเปิดห้อง</p>}
        <label>RTMP Server URL<input value={endpoint} onChange={e => setEndpoint(e.target.value)} maxLength={512} disabled={Boolean(show.output)} placeholder="rtmps://server.example/live" autoComplete="off" /></label>
        <p className={s.muted}>โฮสต์ที่เปิดทดสอบ: {readiness.allowedHosts.join(", ")}</p>
        <label>Stream Key<input type="password" value={streamKey} onChange={e => setStreamKey(e.target.value)} maxLength={256} disabled={Boolean(show.output)} autoComplete="new-password" /></label>
        <button className={`${s.primary} ${s.wide}`} disabled={busy || !connected || !endpoint || !streamKey || Boolean(show.output)} onClick={() => void startOutput()}>เริ่มส่งออกหนึ่งช่อง</button>
        <button className={`${s.danger} ${s.wide}`} disabled={busy} onClick={() => void stop()}>หยุดส่งและปิดห้อง</button>
      </>}
      {show?.output && <div className={s.status}><span className={`${s.dot} ${show.output.transport === "sending" ? s.good : ""}`} /><div><strong>{show.output.transport === "sending" ? "กำลังส่งสัญญาณถึงปลายทาง" : `สถานะส่งออก ${show.output.state}`}</strong><p className={s.muted}>{show.output.destinationHost} · ยังไม่ยืนยันว่าผู้ชมเห็นไลฟ์ กรุณาตรวจหน้ารับชมของช่อง</p>{show.output.usageSeconds !== null && <p className={s.muted}>เวลาส่งที่ยืนยันแล้ว {show.output.usageSeconds.toFixed(1)} วินาที</p>}</div></div>}
      {show && <button className={s.wide} onClick={downloadSummary}>ดาวน์โหลดสรุปจากเซิร์ฟเวอร์</button>}
    </>}
    {!readiness?.enabled && <button className={s.wide} disabled>ส่งไลฟ์ · รอเปิดบริการทดสอบ</button>}
    <div role="status" aria-live="polite" className={s.message}>{message}</div>
  </section>;
}
