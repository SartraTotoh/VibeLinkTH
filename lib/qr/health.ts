import { validateDestination, isLocalhostHost } from "./destination";
import { contrastRatio, isDarkOnLight } from "./style";
import { QR_MAX_CTA_LENGTH, QR_MAX_LOGO_RATIO, QR_RECOMMENDED_LOGO_RATIO, type QrStyleConfig } from "./types";

export type HealthStatus = "pass" | "warn" | "fail" | "info";

export type HealthItemId =
  | "decode"
  | "contrast"
  | "quiet-zone"
  | "logo"
  | "digital-size"
  | "print-size"
  | "https"
  | "url-format"
  | "frame-cta"
  | "print-safe";

export type HealthItem = {
  id: HealthItemId;
  status: HealthStatus;
  title: string;
  detail: string;
  icon: string;
};

export type DecodeResult =
  | { ok: true; text: string }
  | { ok: false; error: string }
  | null;

export type HealthInput = {
  payload: string;
  style: QrStyleConfig;
  matrixSize: number;
  exportSize: number;
  qrPixelSize: number;
  printWidthMm: number;
  isProduction: boolean;
  decode: DecodeResult;
  lang: "th" | "en";
};

export type HealthResult = {
  items: HealthItem[];
  pass: number;
  warn: number;
  fail: number;
  canExport: boolean;
};

const ICONS: Record<HealthStatus, string> = {
  pass: "check_circle",
  warn: "warning",
  fail: "cancel",
  info: "info",
};

function make(
  id: HealthItemId,
  status: HealthStatus,
  title: string,
  detail: string,
): HealthItem {
  return { id, status, title, detail, icon: ICONS[status] };
}

export function evaluateQrHealth(input: HealthInput): HealthResult {
  const { style, matrixSize, exportSize, qrPixelSize, printWidthMm, isProduction, decode, lang } = input;
  const th = lang === "th";
  const totalModules = matrixSize + style.margin * 2;
  const pxPerModule = totalModules > 0 ? qrPixelSize / totalModules : 0;
  const mmPerModule = totalModules > 0 ? printWidthMm / totalModules : 0;
  const contrast = contrastRatio(style.fg, style.bg);
  const items: HealthItem[] = [];

  // 1) Decode from the actual rendered image (including logo/frame).
  if (!decode) {
    items.push(
      make(
        "decode",
        "warn",
        th ? "Decode" : "Decode",
        th ? "ยังไม่ได้ตรวจภาพจริง — กำลังตรวจหรือรอผล" : "Not verified yet — waiting for the rendered image",
      ),
    );
  } else if (decode.ok && decode.text === input.payload) {
    items.push(
      make(
        "decode",
        "pass",
        th ? "Decode สำเร็จ" : "Decode passed",
        th ? "อ่าน payload จากภาพที่ render ได้ตรงกับต้นฉบับ (jsQR 1.4.0)" : "The rendered image decodes to the exact payload (jsQR 1.4.0)",
      ),
    );
  } else if (decode.ok) {
    items.push(
      make(
        "decode",
        "fail",
        th ? "Decode ได้ข้อมูลไม่ตรง" : "Decode mismatch",
        th ? "ภาพอ่านได้แต่ payload ไม่ตรงกับต้นฉบับ — ห้าม export" : "The image decodes but the payload differs — do not export",
      ),
    );
  } else {
    items.push(
      make(
        "decode",
        "fail",
        th ? "Decode ไม่ผ่าน" : "Decode failed",
        th
          ? `อ่าน QR จากภาพไม่ได้ (${decode.error}) — ลด logo, เพิ่ม contrast หรือเปลี่ยน pattern`
          : `Could not read the QR (${decode.error}) — reduce logo, raise contrast or change pattern`,
      ),
    );
  }

  // 2) Contrast.
  if (contrast >= 4.5) {
    items.push(
      make(
        "contrast",
        "pass",
        th ? "Contrast ผ่าน" : "Contrast passed",
        th ? `${contrast.toFixed(2)}:1 (เกณฑ์ 4.5:1)` : `${contrast.toFixed(2)}:1 (target 4.5:1)`,
      ),
    );
  } else if (contrast >= 3) {
    items.push(
      make(
        "contrast",
        "warn",
        th ? "Contrast ควรเพิ่ม" : "Contrast could be higher",
        th ? `${contrast.toFixed(2)}:1 — ควร 4.5:1 ขึ้นไป` : `${contrast.toFixed(2)}:1 — aim for 4.5:1 or more`,
      ),
    );
  } else {
    items.push(
      make(
        "contrast",
        "fail",
        th ? "Contrast ต่ำเกินไป" : "Contrast too low",
        th ? `${contrast.toFixed(2)}:1 — ต่ำกว่า 3:1 สแกนยากมาก` : `${contrast.toFixed(2)}:1 — below 3:1 is very hard to scan`,
      ),
    );
  }

  // 3) Quiet zone.
  if (style.margin >= 4) {
    items.push(
      make(
        "quiet-zone",
        "pass",
        th ? "Quiet zone ผ่าน" : "Quiet zone passed",
        th ? `${style.margin} modules รอบ QR (ขั้นต่ำ 4)` : `${style.margin} modules around the QR (minimum 4)`,
      ),
    );
  } else {
    items.push(
      make(
        "quiet-zone",
        "fail",
        th ? "Quiet zone ไม่พอ" : "Quiet zone too small",
        th ? `${style.margin} modules — ต้องมีอย่างน้อย 4` : `${style.margin} modules — needs at least 4`,
      ),
    );
  }

  // 4) Logo.
  if (style.logoRatio <= 0) {
    items.push(
      make(
        "logo",
        "pass",
        th ? "ไม่มีโลโก้กลาง QR" : "No centre logo",
        th ? "โมดูลทั้งหมดถูกเก็บครบ" : "All modules are preserved",
      ),
    );
  } else if (style.logoRatio <= QR_RECOMMENDED_LOGO_RATIO) {
    items.push(
      make(
        "logo",
        "pass",
        th ? "ขนาดโลโก้ผ่าน" : "Logo size passed",
        th
          ? `${Math.round(style.logoRatio * 100)}% ของด้าน QR · ECC H (บังคับเมื่อมีโลโก้)`
          : `${Math.round(style.logoRatio * 100)}% of QR side · ECC H (forced with a logo)`,
      ),
    );
  } else if (style.logoRatio <= QR_MAX_LOGO_RATIO) {
    items.push(
      make(
        "logo",
        "warn",
        th ? "โลโก้ใหญ่กว่าค่าที่แนะนำ" : "Logo above the recommended size",
        th
          ? `${Math.round(style.logoRatio * 100)}% (แนะนำ ≤${Math.round(QR_RECOMMENDED_LOGO_RATIO * 100)}%) · ECC H`
          : `${Math.round(style.logoRatio * 100)}% (recommended ≤${Math.round(QR_RECOMMENDED_LOGO_RATIO * 100)}%) · ECC H`,
      ),
    );
  } else {
    items.push(
      make(
        "logo",
        "fail",
        th ? "โลโก้ใหญ่เกินขีดจำกัด" : "Logo too large",
        th
          ? `${Math.round(style.logoRatio * 100)}% — เกิน ${Math.round(QR_MAX_LOGO_RATIO * 100)}%`
          : `${Math.round(style.logoRatio * 100)}% — over ${Math.round(QR_MAX_LOGO_RATIO * 100)}%`,
      ),
    );
  }

  // 5) Digital module size.
  if (pxPerModule >= 4) {
    items.push(
      make(
        "digital-size",
        "pass",
        th ? "ขนาดดิจิทัลผ่าน" : "Digital size passed",
        th ? `${pxPerModule.toFixed(1)} px ต่อ module ที่ export ${exportSize}px` : `${pxPerModule.toFixed(1)} px per module at ${exportSize}px`,
      ),
    );
  } else if (pxPerModule >= 3) {
    items.push(
      make(
        "digital-size",
        "warn",
        th ? "ขนาดดิจิทัลตึงตัว" : "Digital size is tight",
        th ? `${pxPerModule.toFixed(1)} px ต่อ module — แนะนำ ≥4` : `${pxPerModule.toFixed(1)} px per module — aim for ≥4`,
      ),
    );
  } else {
    items.push(
      make(
        "digital-size",
        "fail",
        th ? "ขนาดดิจิทัลเล็กเกินไป" : "Digital size too small",
        th ? `${pxPerModule.toFixed(1)} px ต่อ module — ต้อง ≥3` : `${pxPerModule.toFixed(1)} px per module — needs ≥3`,
      ),
    );
  }

  // 6) Print size (physical width the user expects to print).
  if (mmPerModule >= 0.5) {
    items.push(
      make(
        "print-size",
        "pass",
        th ? "ขนาดพิมพ์ผ่าน" : "Print size passed",
        th ? `${mmPerModule.toFixed(2)} mm ต่อ module ที่กว้าง ${printWidthMm} mm` : `${mmPerModule.toFixed(2)} mm per module at ${printWidthMm} mm wide`,
      ),
    );
  } else if (mmPerModule >= 0.35) {
    items.push(
      make(
        "print-size",
        "warn",
        th ? "QR เล็กเกินไปสำหรับการพิมพ์" : "QR may be too small to print",
        th ? `${mmPerModule.toFixed(2)} mm ต่อ module — แนะนำ ≥0.5 mm` : `${mmPerModule.toFixed(2)} mm per module — aim for ≥0.5 mm`,
      ),
    );
  } else {
    items.push(
      make(
        "print-size",
        "fail",
        th ? "QR เล็กเกินไปมาก" : "QR far too small",
        th ? `${mmPerModule.toFixed(2)} mm ต่อ module — ต้อง ≥0.35 mm` : `${mmPerModule.toFixed(2)} mm per module — needs ≥0.35 mm`,
      ),
    );
  }

  // 7) HTTPS in production.
  let parsed: URL | null = null;
  try {
    parsed = new URL(input.payload);
  } catch {
    parsed = null;
  }
  if (parsed && isLocalhostHost(parsed.hostname)) {
    items.push(
      make(
        "https",
        "info",
        th ? "HTTPS (localhost)" : "HTTPS (localhost)",
        th ? "ไม่บังคับ HTTPS ในการทดสอบบนเครื่อง" : "HTTPS is not required for local testing",
      ),
    );
  } else if (parsed?.protocol === "https:") {
    items.push(
      make(
        "https",
        "pass",
        th ? "ใช้ HTTPS" : "HTTPS",
        th ? "ปลายทางเข้ารหัสแล้ว" : "The destination uses HTTPS",
      ),
    );
  } else if (parsed?.protocol === "http:" && isProduction) {
    items.push(
      make(
        "https",
        "warn",
        th ? "ปลายทางเป็น HTTP" : "Destination is HTTP",
        th
          ? "ใน Production ควรใช้ HTTPS — HTTP อาจถูกบล็อกหรือเตือนบนเบราว์เซอร์"
          : "Use HTTPS in production — HTTP may be blocked or flagged by browsers",
      ),
    );
  } else if (parsed?.protocol === "http:") {
    items.push(
      make(
        "https",
        "info",
        th ? "HTTP (โหมดพัฒนา)" : "HTTP (development)",
        th ? "อนุญาตในการทดสอบ แต่ Production ควรเป็น HTTPS" : "Allowed while testing; production should use HTTPS",
      ),
    );
  } else {
    items.push(
      make(
        "https",
        "fail",
        th ? "URL ไม่ถูกต้อง" : "Invalid URL",
        th ? "ไม่สามารถอ่าน scheme ของปลายทางได้" : "Could not read the destination scheme",
      ),
    );
  }

  // 8) URL format.
  const destination = validateDestination(input.payload);
  if (destination.ok) {
    items.push(
      make(
        "url-format",
        "pass",
        th ? "รูปแบบ URL ผ่าน" : "URL format passed",
        th ? `โฮสต์ ${destination.host} · scheme ${destination.isHttps ? "https" : "http"}` : `Host ${destination.host} · scheme ${destination.isHttps ? "https" : "http"}`,
      ),
    );
  } else {
    items.push(
      make(
        "url-format",
        "fail",
        th ? "รูปแบบ URL ไม่ผ่าน" : "URL format failed",
        destination.message,
      ),
    );
  }

  // 9) Frame / CTA obstruction.
  if (style.cta.length > QR_MAX_CTA_LENGTH) {
    items.push(
      make(
        "frame-cta",
        "fail",
        th ? "CTA ยาวเกินไป" : "CTA is too long",
        th ? `เกิน ${QR_MAX_CTA_LENGTH} ตัวอักษร` : `Over ${QR_MAX_CTA_LENGTH} characters`,
      ),
    );
  } else if (style.frame === "none" && style.cta.trim() === "") {
    items.push(
      make(
        "frame-cta",
        "info",
        th ? "ไม่มี Frame/CTA" : "No frame or CTA",
        th ? "QR เปล่า ไม่มีอะไรบัง quiet zone" : "Plain QR, nothing covers the quiet zone",
      ),
    );
  } else {
    items.push(
      make(
        "frame-cta",
        "pass",
        th ? "Frame/CTA ไม่บัง QR" : "Frame/CTA does not cover the QR",
        th ? "CTA อยู่ใต้ QR และ frame อยู่นอก quiet zone" : "The CTA sits below the QR and the frame stays outside the quiet zone",
      ),
    );
  }

  // 10) Print safe / inverted colours.
  if (isDarkOnLight(style.fg, style.bg)) {
    items.push(
      make(
        "print-safe",
        "pass",
        th ? "Print Safe" : "Print safe",
        th ? "โมดูลเข้มบนพื้นสว่าง — เหมาะกับเครื่องพิมพ์และกล้องทั่วไป" : "Dark modules on a light background — friendly to printers and cameras",
      ),
    );
  } else {
    items.push(
      make(
        "print-safe",
        "warn",
        th ? "สีกลับด้าน" : "Inverted colours",
        th ? "โมดูลสว่างบนพื้นเข้ม — บางเครื่องพิมพ์/กล้องอ่านยาก" : "Light modules on a dark background — some printers and cameras struggle",
      ),
    );
  }

  const pass = items.filter((i) => i.status === "pass").length;
  const warn = items.filter((i) => i.status === "warn").length;
  const fail = items.filter((i) => i.status === "fail").length;
  const canExport = fail === 0 && decode?.ok === true;

  return { items, pass, warn, fail, canExport };
}
