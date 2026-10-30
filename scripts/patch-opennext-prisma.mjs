// Post-opennext-build patch: make the inlined Prisma client load its query
// compiler WASM as a pre-compiled workerd module instead of reading the file
// from disk (`require("fs").readFileSync(...)`) or a machine-specific dynamic
// WASM import. Prisma's worker-loader variant also needs a relocatable import.
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

import { mkdirSync } from "node:fs";
mkdirSync(dirname(wasmDst), { recursive: true });
copyFileSync(wasmSrc, wasmDst);

let js = handler;

const importLine = 'import __prismaWasmModule from "./node_modules/.prisma/client/query_compiler_bg.wasm";';
const desired = "getQueryCompilerWasmModule:async()=>__prismaWasmModule";
const workerModule = "Promise.resolve({default:__prismaWasmModule})";
if (!js.includes(desired) && !js.includes(workerModule)) {
  const reBlock = /getQueryCompilerWasmModule:async\(\)=>\{[^}]*?query_compiler_bg\.wasm[^}]*\}/;
  // Prisma 6's edge condition imports wasm-worker-loader.mjs. Its default is a
  // promise of a WASM module namespace, so preserve that shape for the getter.
  const reWorkerImport = /(\b[\w$]+\s*=\s*)import\((["'])[^"']*query_compiler_bg\.wasm\2\)/g;
  if (reBlock.test(js)) {
    js = js.replace(reBlock, desired);
  } else if (js.includes("wasm-worker-loader") && reWorkerImport.test(js)) {
    reWorkerImport.lastIndex = 0;
    js = js.replace(reWorkerImport, (_, assignment) => assignment + workerModule);
  } else {
    console.error("[prisma-patch] unsupported query compiler loader; refusing to emit an unverified WASM patch");
    process.exit(1);
  }
}

// strip any leftover injected helper const (old base64 approach) so the file stays clean
js = js.replace(/const __prismaWasmModule=new WebAssembly[^;]*;/, "");

if (!js.includes(importLine)) {
  js = importLine + "\n" + js;
}

writeFileSync(handlerPath, js, "utf8");
console.log(`[prisma-patch] handler.mjs now imports pre-compiled wasm (copied to ${join(stagingDir, wasmFile)})`);
