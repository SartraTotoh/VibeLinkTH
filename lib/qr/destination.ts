import { QR_MAX_URL_LENGTH } from "./types";

/**
 * Deliberately local: importing `lib/links.ts` here would pull its Node
 * `crypto` import into the client bundle. Behaviour matches
 * `normalizeDestination()` for the http/https subset we allow.
 */
function normalizeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const QR_UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type QrUtmKey = (typeof QR_UTM_KEYS)[number];
export type QrUtmConfig = Partial<Record<QrUtmKey, string>>;

export const QR_MAX_UTM_VALUE = 80;

export type DestinationErrorCode =
  | "EMPTY"
  | "TOO_LONG"
  | "INVALID_URL"
  | "BAD_SCHEME"
  | "CREDENTIALS"
  | "NO_HOST"
  | "UTM_KEY"
  | "UTM_VALUE";

export type DestinationWarning = "HTTP_NOT_SECURE" | "HOST_NO_DOT";

export type DestinationValidation =
  | {
      ok: true;
      url: string;
      host: string;
      isHttps: boolean;
      hadUtm: boolean;
      warnings: DestinationWarning[];
    }
  | {
      ok: false;
      code: DestinationErrorCode;
      message: string;
    };

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

export function isQrUtmKey(value: string): value is QrUtmKey {
  return (QR_UTM_KEYS as readonly string[]).includes(value);
}

export function isLocalhostHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
}

function fail(code: DestinationErrorCode, message: string): DestinationValidation {
  return { ok: false, code, message };
}

/**
 * Server + client share this validator. It never fetches the URL (no SSRF),
 * only allows http/https and refuses credentials in the authority.
 */
export function validateDestination(
  raw: unknown,
  utm?: QrUtmConfig | null,
): DestinationValidation {
  if (typeof raw !== "string" || raw.trim() === "") {
    return fail("EMPTY", "ใส่ URL ปลายทางก่อน");
  }

  const trimmed = raw.trim();
  if (trimmed.length > QR_MAX_URL_LENGTH) {
    return fail("TOO_LONG", `URL ยาวเกิน ${QR_MAX_URL_LENGTH} ตัวอักษร`);
  }
  if (CONTROL_CHARS.test(trimmed)) {
    return fail("INVALID_URL", "URL มีอักขระควบคุมที่ไม่อนุญาต");
  }

  const normalized = normalizeHttpUrl(trimmed);
  if (!normalized) {
    if (SCHEME_RE.test(trimmed)) {
      return fail("BAD_SCHEME", "อนุญาตเฉพาะลิงก์ http หรือ https เท่านั้น");
    }
    return fail("INVALID_URL", "รูปแบบ URL ไม่ถูกต้อง");
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return fail("INVALID_URL", "รูปแบบ URL ไม่ถูกต้อง");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("BAD_SCHEME", "อนุญาตเฉพาะลิงก์ http หรือ https เท่านั้น");
  }
  if (url.username || url.password) {
    return fail("CREDENTIALS", "URL ที่มีชื่อผู้ใช้หรือรหัสผ่านฝังอยู่ไม่สามารถใช้ได้");
  }
  if (!url.hostname) {
    return fail("NO_HOST", "URL ไม่มีชื่อโดเมน");
  }

  const warnings: DestinationWarning[] = [];
  let hadUtm = false;

  if (utm && typeof utm === "object") {
    for (const [key, value] of Object.entries(utm)) {
      if (!isQrUtmKey(key)) {
        return fail("UTM_KEY", `UTM ไม่รู้จัก: ${key}`);
      }
      if (value === undefined || value === null) continue;
      if (typeof value !== "string") {
        return fail("UTM_VALUE", `ค่า ${key} ต้องเป็นข้อความ`);
      }
      const v = value.trim();
      if (v === "") continue;
      if (v.length > QR_MAX_UTM_VALUE) {
        return fail("UTM_VALUE", `ค่า ${key} ยาวเกิน ${QR_MAX_UTM_VALUE} ตัวอักษร`);
      }
      if (CONTROL_CHARS.test(v)) {
        return fail("UTM_VALUE", `ค่า ${key} มีอักขระควบคุม`);
      }
      url.searchParams.set(key, v);
      hadUtm = true;
    }
  }

  if (hadUtm) url.searchParams.set("ref", "vibelink");

  const finalUrl = url.toString();
  if (finalUrl.length > QR_MAX_URL_LENGTH) {
    return fail("TOO_LONG", `URL รวม UTM ยาวเกิน ${QR_MAX_URL_LENGTH} ตัวอักษร`);
  }

  if (url.protocol === "http:") warnings.push("HTTP_NOT_SECURE");
  if (!isLocalhostHost(url.hostname) && !url.hostname.includes(".")) {
    warnings.push("HOST_NO_DOT");
  }

  return {
    ok: true,
    url: finalUrl,
    host: url.hostname,
    isHttps: url.protocol === "https:",
    hadUtm,
    warnings,
  };
}

export function emptyUtm(): QrUtmConfig {
  return {};
}

export function utmIsEmpty(utm: QrUtmConfig | null | undefined): boolean {
  if (!utm) return true;
  return Object.values(utm).every((v) => !v || v.trim() === "");
}
