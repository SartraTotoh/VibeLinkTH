export type Scene = "host" | "product" | "split" | "waiting";
export type Aspect = "landscape" | "portrait";
export type Product = { id: string; name: string; price: string };
export type ProgramMode = "studio" | "external";
export type Draft = { title: string; aspect: Aspect; products: Product[]; programMode?: ProgramMode };
export const RECORDING_LIMIT_MS = 15 * 60 * 1000;
export const RECORDING_LIMIT_BYTES = 256 * 1024 * 1024;

export function newLiveId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Older browsers still provide cryptographic getRandomValues without randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, v => v.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Drafts contain local preparation data only, never credentials or media.
export function readDraft(value: string | null): Draft | null {
  if (!value || value.length > 40_000) return null;
  try {
    const d = JSON.parse(value);
    if (!d || typeof d.title !== "string" || !["portrait", "landscape"].includes(d.aspect) || !Array.isArray(d.products)) return null;
    if (d.products.length > 20 || !d.products.every((p: Product) => p && typeof p.id === "string" && p.id.length <= 80 && typeof p.name === "string" && p.name.length <= 80 && typeof p.price === "string" && p.price.length <= 24)) return null;
    if (new Set(d.products.map((p: Product) => p.id)).size !== d.products.length) return null;
    return { title: d.title.slice(0, 100), aspect: d.aspect, products: d.products.map((p: Product) => ({ id: p.id, name: p.name, price: p.price })), ...(d.programMode === "studio" || d.programMode === "external" ? { programMode: d.programMode } : {}) };
  } catch { return null; }
}

export function dimensions(aspect: Aspect) {
  return aspect === "portrait" ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
}

export function coverCrop(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  return { x: (sourceWidth - width / scale) / 2, y: (sourceHeight - height / scale) / 2, width: width / scale, height: height / scale };
}

export function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
