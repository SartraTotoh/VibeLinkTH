// Post-opennext-build patch: make the inlined Prisma client load its query
// compiler WASM as a pre-compiled workerd module instead of reading the file
// from disk (`require("fs").readFileSync(...)`), which is both unavailable and
// disallowed in Cloudflare Workers.
//
// Steps:
//   1. Copy `query_compiler_bg.wasm` next to the inlined client in the staging
//      bundle (Next's tracer normally omits it).
//   2. Replace the inlined `getQueryCompilerWasmModule` (fs.readFileSync
//      variant) with a static `import` of that `.wasm` file. Wrangler compiles
//      it via `rules: [{"globs": ["**/*.wasm"], "type": "CompiledWasm"}]` in
//      wrangler.jsonc, so the import's default export is a WebAssembly.Module.
//
// Run AFTER `opennextjs-cloudflare build`.

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(process.cwd(), ".open-next", "server-functions", "default");
const handlerPath = join(root, "handler.mjs");
const stagingDir = join(root, "node_modules", ".prisma", "client");
const wasmFile = "query_compiler_bg.wasm";
const wasmSrc = join(process.cwd(), "node_modules", ".prisma", "client", wasmFile);
const wasmDst = join(stagingDir, wasmFile);

const handler = readFileSync(handlerPath, "utf8");
if (!handler.includes("getQueryCompilerWasmModule")) {
  console.error("[prisma-patch] handler.mjs does not look like an OpenNext server bundle");
  process.exit(1);
}

copyFileSync(wasmSrc, wasmDst);

let js = handler;

const importLine = 'import __prismaWasmModule from "./node_modules/.prisma/client/query_compiler_bg.wasm";';
const desired = "getQueryCompilerWasmModule:async()=>__prismaWasmModule";
if (!js.includes(desired)) {
  const reBlock = /getQueryCompilerWasmModule:async\(\)=>\{[^}]*?query_compiler_bg\.wasm[^}]*\}/;
  if (!reBlock.test(js)) {
    console.error("[prisma-patch] could not locate the inlined getQueryCompilerWasmModule (fs.readFileSync) block");
    process.exit(1);
  }
  js = js.replace(reBlock, desired);
}

// strip any leftover injected helper const (old base64 approach) so the file stays clean
js = js.replace(/const __prismaWasmModule=new WebAssembly[^;]*;/, "");

if (!js.includes(importLine)) {
  js = importLine + "\n" + js;
}

writeFileSync(handlerPath, js, "utf8");
console.log(`[prisma-patch] handler.mjs now imports pre-compiled wasm (copied to ${join(stagingDir, wasmFile)})`);