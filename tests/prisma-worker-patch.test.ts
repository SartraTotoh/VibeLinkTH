import {describe,expect,it} from "vitest";
import {patchPrismaWasm} from "../scripts/lib/prisma-wasm-patch.mjs";
describe("Worker Prisma WASM patch",()=>{
  it("supports the generated edge loader and removes absolute build paths",()=>{
    const fixture='config.compilerWasm={getQueryCompilerWasmModule:async()=>(await(await Promise.resolve().then(()=>(init_wasm_worker_loader(),wasm_worker_loader_exports))).default).default};wasm_worker_loader_default=import("/build/node_modules/.prisma/client/query_compiler_bg.wasm")';
    const result=patchPrismaWasm(fixture);
    expect(result).toContain('getQueryCompilerWasmModule:async()=>__prismaWasmModule');
    expect(result).not.toContain('import("/build/');
    expect(patchPrismaWasm(result)).toBe(result);
  });
  it("supports the older filesystem loader",()=>{
    expect(patchPrismaWasm('getQueryCompilerWasmModule:async()=>{return fs.readFileSync("query_compiler_bg.wasm")}')).not.toContain('fs.readFileSync');
  });
  it("rejects unknown generated code",()=>{
    expect(()=>patchPrismaWasm('getQueryCompilerWasmModule:async()=>unknown()')).toThrow('Unknown');
  });
});
