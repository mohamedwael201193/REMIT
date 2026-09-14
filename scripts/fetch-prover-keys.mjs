/**
 * Place Compact 0.31.1 prover keys so the API can serve /keys for 1AM in-tab proving.
 * Skips when local provers already exist. Does not print tokens.
 */
import { existsSync, mkdirSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keysDir = resolve(root, "CONTRACT/managed/remit_pool/keys");
const NEEDED = ["deposit.prover", "createMandate.prover", "revokeMandate.prover"];
const ALSO = ["placeOffer.prover"];
const DEFAULT_PROVER_URL =
  "https://github.com/mohamedwael201193/REMIT/releases/download/zk-provers-compact-0.31.1/browser-provers.tar.gz";

function present() {
  return NEEDED.every((name) => {
    const p = resolve(keysDir, name);
    return existsSync(p) && statSync(p).size > 1_000_000;
  });
}

mkdirSync(keysDir, { recursive: true });
if (present()) {
  console.log("prover keys already present");
  process.exit(0);
}

const url = process.env.REMIT_PROVER_KEYS_URL || DEFAULT_PROVER_URL;
const headers = {
  Accept: "application/octet-stream",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

const res = await fetch(url, { headers, redirect: "follow" });
if (!res.ok) {
  throw new Error(`prover keys HTTP ${res.status} from release tag zk-provers-compact-0.31.1`);
}
const buf = Buffer.from(await res.arrayBuffer());
const archive = resolve(root, "browser-provers.tar.gz");
writeFileSync(archive, buf);
const unpacked = spawnSync("tar", ["-xzf", archive, "-C", keysDir], { encoding: "utf8" });
unlinkSync(archive);
if (unpacked.status !== 0) {
  throw new Error(`tar extract failed: ${unpacked.stderr || unpacked.stdout || unpacked.status}`);
}
if (!present()) throw new Error("prover keys missing after extract");
console.log("prover keys ready", NEEDED.join(","));
for (const name of ALSO) {
  const p = resolve(keysDir, name);
  console.log(existsSync(p) && statSync(p).size > 1_000_000 ? `optional ${name} present` : `optional ${name} missing`);
}
