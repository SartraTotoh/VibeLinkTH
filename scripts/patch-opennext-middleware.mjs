import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".open-next", "server-functions", "default");
const handlerPath = join(root, "handler.mjs");
const manifestPath = join(root, ".next", "server", "middleware-manifest.json");

const manifest = readFileSync(manifestPath, "utf8");
const handler = readFileSync(handlerPath, "utf8");

const needle = "getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}";
if (!handler.includes(needle)) {
  // OpenNext now bundles middleware separately and the node handler already
  // returns null here instead of requiring the manifest at runtime.
  if (handler.includes("getMiddlewareManifest(){return null}")) {
    console.log("[middleware-patch] skipped: handler already uses the bundled middleware path");
    process.exit(0);
  }
  console.error("[middleware-patch] could not find getMiddlewareManifest dynamic require");
  process.exit(1);
}

const inlined = "const __middlewareManifest = " + manifest + ";\n";
const patched = inlined + handler.replace(needle, "getMiddlewareManifest(){return this.minimalMode?null:__middlewareManifest}");

writeFileSync(handlerPath, patched, "utf8");
console.log("[middleware-patch] inlined middleware-manifest.json into handler.mjs");
