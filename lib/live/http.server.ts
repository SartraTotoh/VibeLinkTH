import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimitDb } from "@/lib/rate-limit-db";
import { liveReadiness, mediaConfigured } from "./config.server";

export function liveJson(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
export async function liveUser(req: Request, mutation = false, cleanup = false) {
  const session = await auth();
  if (!session?.user?.id) return { response: liveJson({ error: "ต้องเข้าสู่ระบบก่อน" }, 401) };
  if (mutation && (req.headers.get("origin") !== new URL(req.url).origin || !req.headers.get("content-type")?.startsWith("application/json"))) return { response: liveJson({ error: "คำขอไม่ถูกต้อง" }, 403) };
  const canCleanup = cleanup && mediaConfigured() && process.env.LIVE_SCHEMA_READY === "true";
  if (!canCleanup && !liveReadiness(session.user.email).enabled) return { response: liveJson({ error: "บริการส่งออกยังไม่เปิดให้บัญชีนี้" }, 503) };
  const limit = await rateLimitDb(req, mutation ? "live-write" : "live-read", mutation ? 30 : 120, 60_000, session.user.id, "closed");
  if (!limit.ok) return { response: liveJson({ error: "กรุณารอสักครู่แล้วลองใหม่" }, 429) };
  return { userId: session.user.id };
}
export async function smallJson(req: Request) {
  const body = await boundedBody(req, 4096);
  return JSON.parse(body);
}
export async function boundedBody(req: Request, maxBytes: number) {
  if (Number(req.headers.get("content-length")) > maxBytes) throw new Error("body-too-large");
  const reader = req.body?.getReader(); if (!reader) return "";
  const decoder = new TextDecoder(); let text = ""; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new Error("body-too-large"); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
