import { isAdmin } from "@/lib/admin";

export function mediaConfigured() {
  try {
    const url = new URL(process.env.LIVEKIT_URL ?? "");
    return url.protocol === "wss:" && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/" && Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
  } catch { return false; }
}
export function liveAllowedHosts() {
  return (process.env.LIVE_RTMP_HOSTS ?? "").split(",").map(v => v.trim().toLowerCase()).filter(v => /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(v));
}
export function liveReadiness(email?: string | null) {
  const enabled = process.env.LIVE_TRANSPORT_ENABLED === "true" && process.env.LIVE_SCHEMA_READY === "true" && process.env.LIVE_WATCHDOG_READY === "true" && mediaConfigured() && liveAllowedHosts().length > 0 && Boolean(process.env.CRON_SECRET) && isAdmin(email);
  return { enabled, reason: enabled ? "พร้อมสำหรับทดสอบส่งออกหนึ่งช่อง" : "การส่งออกอยู่ระหว่างเตรียมบริการและสิทธิ์ทดสอบ ใช้สตูดิโอในเครื่องได้", allowedHosts: enabled ? liveAllowedHosts() : [], maxSources: 2 as const };
}

/** RTMP credentials remain request-local. Only the hostname is retained in the database. */
export function destinationUrl(endpoint: string, key: string, allowedHosts: string[]) {
  const url = new URL(endpoint);
  if (!["rtmp:", "rtmps:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !allowedHosts.includes(url.hostname.toLowerCase()) || !["", "443", "1935"].includes(url.port)) throw new Error("invalid-destination");
  if (/^\d+(?:\.\d+){3}$/.test(url.hostname) || url.hostname.endsWith(".local") || url.hostname.endsWith(".localhost")) throw new Error("invalid-destination");
  if (!/^[A-Za-z0-9_\-/.~]{1,256}$/.test(key) || key.split("/").some(p => p === "." || p === "..")) throw new Error("invalid-key");
  url.pathname = `${url.pathname.replace(/\/$/, "")}/${key}`;
  return url.toString();
}
