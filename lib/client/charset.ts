// Browser-side mojibake helpers (client entry, safe to import in components).
import { hasHardSig, containsThai, repairMojibake } from "@/lib/charset";
export { hasHardSig, containsThai, repairMojibake };

export type CharsetCheckResult = {
  /** True when the value carries conclusive double-encode evidence. */
  dirty: boolean;
  /** Repaired value (same reference when clean). */
  value: string;
};

/**
 * Rapid client-side check for a single input value. Used by the guard
 * component and any form field that wants a cheap preflight.
 */
export function checkCharset(value: string): CharsetCheckResult {
  const repaired = repairMojibake(value);
  return { dirty: repaired !== value, value: repaired };
}