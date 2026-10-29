"use client";
import { useEffect, useRef, useState } from "react";
import { SourceController, audioConstraints, inputError, type SourceKind, type SourceSlot } from "@/lib/live/sources";

export function useStudioInputs(onLost: (slot: SourceSlot | "audio") => void, notify: (message: string) => void) {
  const videos = { host: useRef<HTMLVideoElement>(null), product: useRef<HTMLVideoElement>(null) };
  const controller = useRef<SourceController | null>(null);
  const audio = useRef<MediaStream | null>(null);
  const audioGeneration = useRef(0);
  const videoGeneration = useRef({ host: 0, product: 0 });
  const meter = useRef<{ context: AudioContext; timer: number } | null>(null);
  const alive = useRef(false);
  const callbacks = useRef({ onLost, notify }); callbacks.current = { onLost, notify };
  const [ready, setReady] = useState({ host: false, product: false, audio: false });
  const [busy, setBusy] = useState({ host: false, product: false, audio: false });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState({ host: "", product: "", audio: "" });
  const [kinds, setKinds] = useState<Record<SourceSlot, SourceKind>>({ host: "camera", product: "camera" });
  const [audioProfile, setAudioProfile] = useState<"microphone" | "mixer">("microphone");
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState<number | null>(null);
  const [screenSupported, setScreenSupported] = useState(false);
  const [mediaSupported, setMediaSupported] = useState(false);

  function closeMeter() {
    if (meter.current) { window.clearInterval(meter.current.timer); void meter.current.context.close().catch(() => {}); meter.current = null; }
  }
  async function refreshDevices() {
    try { const list = await navigator.mediaDevices?.enumerateDevices(); if (alive.current && list) setDevices(list.filter(d => d.kind === "videoinput" || d.kind === "audioinput")); }
    catch { if (alive.current) callbacks.current.notify("อ่านรายชื่ออุปกรณ์ไม่ได้ กรุณาตรวจสิทธิ์กล้องและไมค์"); }
  }
  useEffect(() => {
    alive.current = true;
    controller.current = new SourceController(slot => {
      if (!alive.current) return;
      setReady(v => ({ ...v, [slot]: false })); callbacks.current.onLost(slot);
    });
    const inputs = controller.current; const audioRequest = audioGeneration;
    const deviceChange = () => { void refreshDevices(); };
    navigator.mediaDevices?.addEventListener?.("devicechange", deviceChange);
    setScreenSupported(Boolean(navigator.mediaDevices?.getDisplayMedia));
    setMediaSupported(Boolean(navigator.mediaDevices?.getUserMedia));
    void refreshDevices();
    return () => {
      alive.current = false; audioRequest.current++;
      inputs.dispose(); audio.current?.getTracks().forEach(t => t.stop()); closeMeter();
      navigator.mediaDevices?.removeEventListener?.("devicechange", deviceChange);
    };
  }, []);

  async function openVideo(slot: SourceSlot) {
    const inputs = controller.current;
    if (!inputs || busy[slot]) return;
    const request = ++videoGeneration.current[slot];
    setBusy(v => ({ ...v, [slot]: true }));
    try {
      const stream = await inputs.open(slot, kinds[slot], selected[slot], navigator.mediaDevices);
      if (!stream || !alive.current) return;
      const video = videos[slot].current;
      if (video) { video.srcObject = stream; await video.play(); }
      if (alive.current && inputs.get(slot) === stream) { setReady(v => ({ ...v, [slot]: true })); await refreshDevices(); }
    } catch (error) {
      if (alive.current && request === videoGeneration.current[slot]) callbacks.current.notify(inputError(error));
    } finally { if (alive.current && request === videoGeneration.current[slot]) setBusy(v => ({ ...v, [slot]: false })); }
  }

  async function openAudio() {
    if (busy.audio) return;
    const generation = ++audioGeneration.current;
    setBusy(v => ({ ...v, audio: true }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints(selected.audio, audioProfile));
      if (!alive.current || generation !== audioGeneration.current) { stream.getTracks().forEach(t => t.stop()); return; }
      audio.current?.getTracks().forEach(t => t.stop()); closeMeter();
      audio.current = stream;
      stream.getAudioTracks().forEach(t => {
        t.enabled = !muted;
        t.onended = () => {
          if (generation !== audioGeneration.current || !alive.current) return;
          audioGeneration.current++;
          stream.getTracks().forEach(t => t.stop()); audio.current = null; closeMeter();
          setReady(v => ({ ...v, audio: false })); setLevel(null); callbacks.current.onLost("audio");
        };
      });
      setReady(v => ({ ...v, audio: stream.getAudioTracks().length > 0 }));
      if (window.AudioContext) {
        try {
          const context = new AudioContext(); const analyser = context.createAnalyser(); analyser.fftSize = 256;
          context.createMediaStreamSource(stream).connect(analyser); await context.resume();
          if (!alive.current || generation !== audioGeneration.current) { void context.close(); return; }
          const samples = new Uint8Array(analyser.fftSize);
          const timer = window.setInterval(() => {
            analyser.getByteTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / samples.length);
            setLevel(Math.min(100, Math.round(rms * 250)));
          }, 100);
          meter.current = { context, timer };
        } catch { setLevel(null); }
      }
      await refreshDevices();
    } catch (error) { if (alive.current && generation === audioGeneration.current) callbacks.current.notify(inputError(error)); }
    finally { if (alive.current && generation === audioGeneration.current) setBusy(v => ({ ...v, audio: false })); }
  }
  function closeAll() {
    videoGeneration.current.host++; videoGeneration.current.product++;
    controller.current?.closeAll(); audioGeneration.current++;
    audio.current?.getTracks().forEach(t => t.stop()); audio.current = null; closeMeter();
    if (videos.host.current) videos.host.current.srcObject = null;
    if (videos.product.current) videos.product.current.srcObject = null;
    setReady({ host: false, product: false, audio: false }); setBusy({ host: false, product: false, audio: false }); setLevel(null);
  }
  function toggleMute() { setMuted(value => { audio.current?.getAudioTracks().forEach(t => { t.enabled = value; }); return !value; }); }
  return { videos, controller, audio, ready, busy, devices, selected, setSelected, kinds, setKinds, audioProfile, setAudioProfile, muted, level, mediaSupported, screenSupported, refreshDevices, openVideo, openAudio, closeAll, toggleMute };
}
