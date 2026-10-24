import type { RgbaImage } from "./types";

export type QrDecodeOutcome =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Decode the exact RGBA bytes that were rendered. jsQR is imported lazily so
 * the studio pays for the decoder only when a health check actually runs.
 */
export async function decodeQrImage(image: RgbaImage): Promise<QrDecodeOutcome> {
  try {
    if (!image || image.width <= 0 || image.height <= 0) {
      return { ok: false, error: "ภาพว่าง" };
    }
    if (image.data.length !== image.width * image.height * 4) {
      return { ok: false, error: "ขนาดภาพไม่ตรงกับข้อมูล" };
    }
    const { default: jsQR } = await import("jsqr");
    const result = jsQR(image.data, image.width, image.height, {
      inversionAttempts: "attemptBoth",
    });
    if (!result || !result.data) {
      return { ok: false, error: "ไม่พบ QR ที่อ่านได้ในภาพ" };
    }
    return { ok: true, text: result.data };
  } catch {
    return { ok: false, error: "ตัว decode ทำงานผิดพลาด" };
  }
}
