#!/usr/bin/env node
// CI gate: fail the build if any source file reintroduces Thai mojibake.
// 3 failure classes (matching the fixer's safety rules exactly):
//   1. raw-invalid             : line bytes are not strict UTF-8
//   2. hard-sig                : C1 (\u0080-\u009F) or Euro (\u20AC) inside text
//   3. genuine-roundtrip       : cp874(orig) decodes strictly to other text that
//                                contains Thai, or orig has Thai-flanked "ยท"
// Healthy Thai (e.g. "ลบ", "แผน") is NOT flagged (it round-trips to non-Thai junk).
// Exit code 0 = clean, 1 = violations found.
// Usage: node scripts/check-charset.mjs
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["app", "components", "lib", "landing"];
const EXTS = ["*.tsx", "*.ts", "*.css", "*.html", "*.json", "*.md"];

// --- windows-874 (cp874) encode table (per code point -> byte) ---
const CP874 = new Map();
for (let i = 0; i <= 0x7f; i++) CP874.set(i, i); // ASCII identity
CP874.set(0x20ac, 0x80); // Euro per windows-874 ambiguity; harmless for our use
for (let i = 0x0e01; i <= 0x0e5b; i++) CP874.set(i, 0xa1 + (i - 0x0e01)); // Thai
function cp874Encode(line) {
  const out = [];
  for (const ch of line) {
    const cp = ch.codePointAt(0);
    const v = CP874.get(cp);
    out.push(v === undefined ? 0x3f : v);
  }
  return Uint8Array.from(out);
}
const utf8Strict = new TextDecoder("utf-8", { fatal: true });
function strictDecode(bytes) {
  try {
    return utf8Strict.decode(bytes);
  } catch {
    return null;
  }
}

const RE_HARD = /[\u0080-\u009F\u20AC]/;
const RE_THAI = /[\u0E00-\u0E7F]/;

function genuineRoundtrip(line) {
  const bytes = cp874Encode(line);
  const recovered = strictDecode(bytes);
  if (recovered === null || recovered === line) return null;
  if (RE_THAI.test(recovered)) return recovered;
  // separator case: every "ยท" (U+0E22 U+0E17) must be flanked by non-Thai
  let ok = true;
  let found = false;
  for (let i = 0; i < line.length - 1; i++) {
    if (line.charCodeAt(i) === 0x0e22 && line.charCodeAt(i + 1) === 0x0e17) {
      found = true;
      const prev = i > 0 ? line.charCodeAt(i - 1) : -1;
      const next = i + 2 < line.length ? line.charCodeAt(i + 2) : -1;
      const prevThai = prev >= 0x0e00 && prev <= 0x0e7f;
      const nextThai = next >= 0x0e00 && next <= 0x0e7f;
      if (prevThai || nextThai) { ok = false; break }
    }
  }
  return found && ok ? recovered : null;
}

async function listFiles() {
  const cmd = `git ls-files -z -- ${ROOTS.map((r) => `${r}/`).join(" ")}`;
  const out = await execSync(cmd, { encoding: "buffer" });
  const names = [];
  let cur = [];
  for (const b of out) {
    if (b === 0) { names.push(Buffer.from(cur).toString()); cur = []; }
    else cur.push(b);
  }
  if (cur.length) names.push(Buffer.from(cur).toString());
  return names.filter((n) => EXTS.some((e) => n.endsWith(e.slice(1))));
}

const violations = [];
for (const file of await listFiles()) {
  const raw = readFileSync(file);
  // split on 0x0A keeping the byte, then strip one trailing 0x0D per line
  const chunks = [];
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === 0x0a) {
      chunks.push(raw.subarray(start, i));
      start = i + 1;
    }
  }
  if (start < raw.length) chunks.push(raw.subarray(start));
  chunks.forEach((lineBytes, idx) => {
    let line = strictDecode(lineBytes);
    if (line === null) {
      violations.push({ file, line: idx + 1, cls: "raw-invalid", hex: Array.from(lineBytes.slice(0, 12)).map((b) => b.toString(16).padStart(2, "0")).join(" ") });
      return;
    }
    line = line.replace(/\r$/, "");
    if (!RE_THAI.test(line)) return;
    if (RE_HARD.test(line)) {
      violations.push({ file, line: idx + 1, cls: "hard-sig" });
      return;
    }
    const rec = genuineRoundtrip(line);
    if (rec !== null) {
      violations.push({ file, line: idx + 1, cls: "genuine-roundtrip", recovered: rec });
    }
  });
}

if (violations.length > 0) {
  console.error(`check-charset: ${violations.length} violation(s)`);
  for (const v of violations) {
    if (v.cls === "raw-invalid") console.error(`  [raw-invalid] ${v.file}:${v.line} bytes ${v.hex}`);
    else if (v.cls === "hard-sig") console.error(`  [hard-sig] ${v.file}:${v.line}`);
    else console.error(`  [genuine-roundtrip] ${v.file}:${v.line} -> "${v.recovered}"`);
  }
  process.exit(1);
}
console.log("check-charset: clean (no mojibake detected)");
process.exit(0);