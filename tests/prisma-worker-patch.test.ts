import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/patch-opennext-prisma.mjs", import.meta.url));
const tempRoots: string[] = [];
afterEach(() => { for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function bundle(handler: string) {
  const root = mkdtempSync(join(tmpdir(), "billing-worker-patch-")); tempRoots.push(root);
  const staging = join(root, ".open-next/server-functions/default");
  const source = join(root, "node_modules/.prisma/client");
  mkdirSync(staging, { recursive: true }); mkdirSync(source, { recursive: true });
  writeFileSync(join(staging, "handler.mjs"), handler);
  writeFileSync(join(source, "query_compiler_bg.wasm"), Buffer.from([0, 97, 115, 109]));
  return { root, staging, patch: () => execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" }),
    read: () => readFileSync(join(staging, "handler.mjs"), "utf8") };
}

describe("Prisma Worker WASM packaging required by billing SQL", () => {
  it("replaces the Node fs loader with a precompiled static module", () => {
    const b = bundle('config.compilerWasm={getQueryCompilerWasmModule:async()=>{const fs=require("fs");return new WebAssembly.Module(fs.readFileSync("query_compiler_bg.wasm"))}}');
    b.patch();
    expect(b.read()).toContain('getQueryCompilerWasmModule:async()=>__prismaWasmModule');
    expect(b.read()).not.toContain('require("fs")');
    expect(readFileSync(join(b.staging, "node_modules/.prisma/client/query_compiler_bg.wasm")))
      .toEqual(Buffer.from([0, 97, 115, 109]));
  });
  it("preserves the worker loader's promised module namespace while removing absolute build paths", () => {
    const b = bundle('var exports={};var loader,init=__esm({"node_modules/.prisma/client/wasm-worker-loader.mjs"(){loader=import("/machine/build/node_modules/.prisma/client/query_compiler_bg.wasm")}});config.compilerWasm={getQueryCompilerWasmModule:async()=>(await(await Promise.resolve().then(()=>exports)).default).default}');
    b.patch();
    expect(b.read()).toContain('loader=Promise.resolve({default:__prismaWasmModule})');
    expect(b.read()).not.toContain('/machine/build');
    expect(b.read()).toContain('import __prismaWasmModule from "./node_modules/.prisma/client/query_compiler_bg.wasm"');
  });
  it("is idempotent for the current worker loader", () => {
    const b = bundle('var loader=import("/build/query_compiler_bg.wasm");/* wasm-worker-loader */config.compilerWasm={getQueryCompilerWasmModule:async()=>loader}');
    b.patch(); const once = b.read(); b.patch(); expect(b.read()).toBe(once);
  });
  it("refuses unknown loader shapes", () => {
    const b = bundle('config.compilerWasm={getQueryCompilerWasmModule:async()=>unknownLoader()}');
    expect(b.patch).toThrow();
    expect(b.read()).not.toContain('import __prismaWasmModule');
  });
});
