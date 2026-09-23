// check:security — pre-deploy repo sweep (must pass before cf:deploy).
// Layers checked:
//   A. No secret-looking content in tracked files (public repo guard).
//   B. No .env* leaked into public/ or .open-next/assets.
//   C. wrangler.jsonc still carries the .env guard routes.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let fail = 0;

const say = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) fail += 1;
};

// A) tracked secret scan
const tracked = execSync("git ls-files", { encoding: "utf8", cwd: ROOT })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((f) => !/\.(png|jpe?g|gif|webp|ico|woff2?|pdf)$/i.test(f));

const SECRET_RE = /sk_live_[0-9A-Za-z]{8,}|whsec_[0-9A-Za-z]{16,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|cft_[0-9A-Za-z]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;
for (const f of tracked) {
  try {
    const content = readFileSync(join(ROOT, f), "utf8");
    if (SECRET_RE.test(content)) {
      say(false, `found secret-like content in tracked file: ${f}`);
    }
  } catch {
    // skip binaries/undecodable
  }
}

// B) no .env leaks in public or built assets
for (const dir of ["public", ".open-next/assets"]) {
  const base = join(ROOT, dir);
  if (!existsSync(base)) continue;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.env/i.test(name)) say(false, `${dir}/${name.replace(ROOT, "")} leaked into assets`);
    }
  };
  walk(base);
}

// C) guard routes present in wrangler.jsonc
try {
  const conf = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8");
  const guards = ["vibelinkth.com/.env", "vibelinkth.com/.env.production", "www.vibelinkth.com/.env", "www.vibelinkth.com/.env.production"];
  for (const g of guards) {
    if (!conf.includes(`"${g}"`)) say(false, `missing guard route in wrangler.jsonc: ${g}`);
  }
} catch {
  say(false, "wrangler.jsonc not found");
}

if (fail > 0) {
  console.log(`\ncheck:security FAILED (${fail} issue${fail > 1 ? "s" : ""})`);
  process.exit(1);
}
console.log("\ncheck:security: clean (no secrets, no asset leaks, guard routes intact)");