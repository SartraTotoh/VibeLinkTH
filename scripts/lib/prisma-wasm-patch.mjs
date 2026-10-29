/** Accept only known generated loader shapes; unknown bundles fail closed. */
export function patchPrismaWasm(handler) {
  const desired = "getQueryCompilerWasmModule:async()=>__prismaWasmModule";
  const importLine = 'import __prismaWasmModule from "./node_modules/.prisma/client/query_compiler_bg.wasm";';
  let js = handler;
  if (!js.includes(desired)) {
    const legacy = /getQueryCompilerWasmModule:async\(\)=>\{[^}]*?query_compiler_bg\.wasm[^}]*\}/;
    const edge = "getQueryCompilerWasmModule:async()=>(await(await Promise.resolve().then(()=>(init_wasm_worker_loader(),wasm_worker_loader_exports))).default).default";
    if (legacy.test(js)) js = js.replace(legacy, desired);
    else if (js.includes(edge)) js = js.replace(edge, desired);
    else throw new Error("Unknown Prisma WASM loader shape; refusing to produce a deployment bundle");
  }
  // Remove unreachable absolute-path WASM imports too: bundlers still resolve them.
  js = js.replace(/wasm_worker_loader_default=import\("[^"\n]*\/query_compiler_bg\.wasm"\)/g, "wasm_worker_loader_default=Promise.resolve({default:__prismaWasmModule})");
  js = js.replace(/const __prismaWasmModule=new WebAssembly[^;]*;/, "");
  if (!js.includes(importLine)) js = importLine + "\n" + js;
  return js;
}
