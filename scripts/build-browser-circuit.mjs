/**
 * Bundle Compact circuit-calls for the supplied frontend (1AM in-tab / Lace proof-server).
 * Output is public JS plus the two Midnight wasm files it fetches at runtime.
 * Do not include mnemonics or executor secrets.
 */
import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = resolve(root, "dist/browser");
const outfile = resolve(outdir, "remit-circuit.js");
mkdirSync(outdir, { recursive: true });

const stub = (name) => resolve(root, "scripts/lib", name);
const onchainFs = resolve(
  root,
  "node_modules/@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_fs.js",
);
const ledgerFs = resolve(
  root,
  "node_modules/@midnight-ntwrk/ledger-v8/midnight_ledger_wasm_fs.js",
);

copyFileSync(
  resolve(root, "node_modules/@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_bg.wasm"),
  resolve(outdir, "midnight_onchain_runtime_wasm_bg.wasm"),
);
copyFileSync(
  resolve(root, "node_modules/@midnight-ntwrk/ledger-v8/midnight_ledger_wasm_bg.wasm"),
  resolve(outdir, "midnight_ledger_wasm_bg.wasm"),
);

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
  plugins: [
    {
      name: "midnight-node-wasm-fs",
      setup(buildApi) {
        buildApi.onResolve({ filter: /ledger-v8|onchain-runtime-v3|midnight_ledger_wasm|midnight_onchain_runtime_wasm/ }, (args) => {
          const p = args.path.replace(/\\/g, "/");
          if (p.includes("_bg.") || p.includes("snippet") || p.includes("_fs.js")) return undefined;
          if (p.endsWith("midnight_onchain_runtime_wasm.js") || p === "@midnight-ntwrk/onchain-runtime-v3") {
            return { path: onchainFs };
          }
          if (p.endsWith("midnight_ledger_wasm.js") || p === "@midnight-ntwrk/ledger-v8") {
            return { path: ledgerFs };
          }
          return undefined;
        });
        buildApi.onLoad({ filter: /midnight_onchain_runtime_wasm\.js$/ }, (args) => {
          if (args.path.includes("_fs")) return undefined;
          return { contents: readFileSync(onchainFs, "utf8"), loader: "js", resolveDir: dirname(onchainFs) };
        });
        buildApi.onLoad({ filter: /midnight_ledger_wasm\.js$/ }, (args) => {
          if (args.path.includes("_fs")) return undefined;
          return { contents: readFileSync(ledgerFs, "utf8"), loader: "js", resolveDir: dirname(ledgerFs) };
        });
      },
    },
  ],
  alias: {
    "node:path": stub("browser-path.ts"),
    path: stub("browser-path.ts"),
    "node:fs": stub("browser-wasm-fs.ts"),
    fs: stub("browser-wasm-fs.ts"),
    "node:url": stub("browser-url.ts"),
    url: stub("browser-url.ts"),
    "node:crypto": stub("browser-crypto.ts"),
    "node:assert": stub("browser-assert.ts"),
    assert: stub("browser-assert.ts"),
    "node:events": stub("browser-events.ts"),
    events: stub("browser-events.ts"),
  },
  external: ["os", "module", "worker_threads", "child_process", "net", "tls", "http", "https", "zlib", "stream"],
});

console.log("wrote", outfile);
