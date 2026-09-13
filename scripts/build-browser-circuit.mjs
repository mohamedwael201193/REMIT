/**
 * Bundle Compact circuit-calls for the supplied frontend (1AM in-tab / Lace proof-server).
 * Output is public JS. Do not include mnemonics or executor secrets.
 */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(root, "dist/browser/remit-circuit.js");
mkdirSync(dirname(outfile), { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, "packages/sdk/src/browser-circuits.ts")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: false,
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  alias: {
    "node:path": resolve(root, "scripts/lib/browser-path.ts"),
    "node:fs": resolve(root, "scripts/lib/browser-empty.ts"),
    "node:url": resolve(root, "scripts/lib/browser-empty.ts"),
  },
  external: ["fs", "path", "crypto", "url", "os", "module"],
});

console.log("wrote", outfile);
