import { createHash, timingSafeEqual } from "crypto";

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = local.slice(0, 7) + "*".repeat(Math.max(4, local.length - 7));

  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot + 1) : "";
  const maskedHost = (host[0] ?? "*") + "*".repeat(Math.max(4, host.length - 1));
  const maskedTld = "*".repeat(Math.max(2, tld.length || 3));

  return `${maskedLocal}@${maskedHost}.${maskedTld}`;
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin, "utf8").digest("hex");
}

export function verifyPin(pin: string, expectedHex: string): boolean {
  if (!/^\d{6}$/.test(pin)) return false;
  if (!/^[0-9a-f]{64}$/i.test(expectedHex)) return false;
  const a = Buffer.from(hashPin(pin), "hex");
  const b = Buffer.from(expectedHex.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
