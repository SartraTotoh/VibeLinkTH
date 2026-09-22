import { randomBytes } from "crypto";

const RESERVED_SLUGS = new Set([
  "api", "go", "login", "logout", "signup", "dashboard", "admin", "settings",
  "help", "faq", "privacy", "terms", "about", "pricing", "me", "new", "auth",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function randomSlug(length = 6) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const PLATFORM_RULES: [RegExp, string][] = [
  [/(^|\.)shopee\./i, "Shopee"],
  [/tiktok/i, "TikTok"],
  [/lazada/i, "Lazada"],
  [/instagram/i, "Instagram"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/facebook\.com|fb\.me|fb\.com/i, "Facebook"],
  [/line\.me|lin\.ee/i, "LINE"],
];

export function detectPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    for (const [re, name] of PLATFORM_RULES) if (re.test(host)) return name;
    return null;
  } catch {
    return null;
  }
}

export function normalizeDestination(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
