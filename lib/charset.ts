// UTF-8 / windows-874 double-encoding protection.
//
// The VibeLink runtime is 100% UTF-8. Mojibake appears when a UTF-8 byte
// sequence was decoded as windows-874 (cp874) and then re-encoded as UTF-8 —
// a classic paste-through-a-wrong-encoding bug. These helpers detect that
// corruption and repair it without ever touching healthy Thai text.
//
// Detection rules mirror scripts/check-charset.mjs:
//   - hard signature : C1 controls (U+0080–U+009F) or Euro (U+20AC) in text
//   - genuine roundtrip : encode(text, cp874) decodes strictly to different
//     text that still contains Thai (or a Thai-flanked "ยท" separator)
// Healthy Thai like "ลบ"/"แผน" round-trips to non-Thai junk and is ignored.

const CP874 = new Map<number, number>();
for (let i = 0; i <= 0x7f; i++) CP874.set(i, i);
for (let i = 0x0e01; i <= 0x0e5b; i++) CP874.set(i, 0xa1 + (i - 0x0e01));

const RE_HARD = /[\u0080-\u009F\u20AC]/;
const RE_THAI = /[\u0E00-\u0E7F]/;

function cp874Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    out.push(cp === undefined ? 0x3f : CP874.get(cp) ?? 0x3f);
  }
  return Uint8Array.from(out);
}

const utf8Strict = new TextDecoder("utf-8", { fatal: true });

function strictDecode(bytes: Uint8Array): string | null {
  try {
    return utf8Strict.decode(bytes);
  } catch {
    return null;
  }
}

/** True when the string carries the hard double-encode signature. */
export function hasHardSig(text: string): boolean {
  return RE_HARD.test(text);
}

/** True when text contains any Thai character. */
export function containsThai(text: string): boolean {
  return RE_THAI.test(text);
}

/**
 * Repair double-encoded Thai in `text`. Returns a repaired string when the
 * evidence is conclusive, otherwise the original text unchanged.
 */
export function repairMojibake(text: string): string {
  if (!containsThai(text)) return text;
  const strict = hasHardSig(text) || isGenuineRoundtrip(text);
  if (!strict) return text;
  const bytes = cp874Encode(text);
  const recovered = strictDecode(bytes);
  if (recovered === null || recovered === text) return text;
  if (RE_THAI.test(recovered)) return recovered;
  if (isSeparatorDotRoundtrip(text)) return recovered;
  return text;
}

function isGenuineRoundtrip(line: string): boolean {
  const bytes = cp874Encode(line);
  const recovered = strictDecode(bytes);
  if (recovered === null || recovered === line) return false;
  return RE_THAI.test(recovered) || isSeparatorDotRoundtrip(line);
}

function isSeparatorDotRoundtrip(line: string): boolean {
  let found = false;
  for (let i = 0; i < line.length - 1; i++) {
    if (line.charCodeAt(i) === 0x0e22 && line.charCodeAt(i + 1) === 0x0e17) {
      found = true;
      const prev = i > 0 ? line.charCodeAt(i - 1) : -1;
      const next = i + 2 < line.length ? line.charCodeAt(i + 2) : -1;
      const prevThai = prev >= 0x0e00 && prev <= 0x0e7f;
      const nextThai = next >= 0x0e00 && next <= 0x0e7f;
      if (prevThai || nextThai) return false;
    }
  }
  return found;
}

/**
 * Repair every string inside a JSON-ish value (objects, arrays, primitives).
 * Non-string values pass through untouched.
 */
export function sanitizeValue<T>(value: T): T {
  if (typeof value === "string") return repairMojibake(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v)) as unknown as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v);
    }
    return out as unknown as T;
  }
  return value;
}

/** Convenience alias for server-side request bodies. */
export function sanitizeObject<T>(value: T): T {
  return sanitizeValue(value);
}