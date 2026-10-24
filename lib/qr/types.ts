export type QrPattern = "square" | "rounded" | "dots";
export type QrEye = "square" | "rounded";
export type QrPresetId = "blink" | "pank" | "print";
export type QrFrame = "none" | "caption" | "ticket";
export type QrEcc = "M" | "Q" | "H";
export type QrExportSize = 512 | 1024 | 2048;

export type QrStyleConfig = {
  preset: QrPresetId;
  fg: string;
  bg: string;
  pattern: QrPattern;
  eye: QrEye;
  /** Quiet zone in modules. Never below 4. */
  margin: number;
  ecc: QrEcc;
  /** Logo width / QR width. 0 means no logo. */
  logoRatio: number;
  frame: QrFrame;
  cta: string;
  exportSize: QrExportSize;
};

export type RgbaImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type QrMatrix = {
  size: number;
  data: Uint8Array;
  version: number;
  ecc: QrEcc;
};

export type QrLogoAsset = {
  dataUrl: string;
  image: RgbaImage;
  name: string;
};

export const QR_MAX_URL_LENGTH = 2048;
export const QR_MAX_CTA_LENGTH = 48;
export const QR_MIN_MARGIN = 4;
export const QR_MAX_MARGIN = 12;
export const QR_MAX_LOGO_RATIO = 0.18;
export const QR_RECOMMENDED_LOGO_RATIO = 0.15;
export const QR_EXPORT_SIZES: QrExportSize[] = [512, 1024, 2048];
export const QR_PATTERNS: QrPattern[] = ["square", "rounded", "dots"];
export const QR_EYES: QrEye[] = ["square", "rounded"];
export const QR_FRAMES: QrFrame[] = ["none", "caption", "ticket"];
export const QR_ECC_LEVELS: QrEcc[] = ["M", "Q", "H"];
