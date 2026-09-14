/**
 * Browser stand-in for Node `fs` used only by Midnight *_wasm_fs.js.
 * Wasm files are fetched from the same directory as the circuit bundle.
 */
const NAMES = ["midnight_onchain_runtime_wasm_bg.wasm", "midnight_ledger_wasm_bg.wasm"] as const;
const cache = new Map<string, Uint8Array>();

await Promise.all(
  NAMES.map(async (name) => {
    const url = new URL(`./${name}`, import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wasm ${name} HTTP ${res.status}`);
    cache.set(name, new Uint8Array(await res.arrayBuffer()));
  }),
);

function basename(p: string): string {
  return p.replace(/\\/g, "/").split("/").pop() ?? p;
}

export function readFileSync(p: string): Uint8Array {
  const name = basename(String(p));
  const bytes = cache.get(name);
  if (!bytes) throw new Error(`wasm not staged next to remit-circuit.js: ${name}`);
  return bytes;
}

export const existsSync = () => false;
export default { readFileSync, existsSync };
