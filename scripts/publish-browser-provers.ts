/**
 * Pack deposit/createMandate/revokeMandate prover keys and upload a public GitHub release.
 * Prints the download URL only — never tokens or key bytes.
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keysDir = resolve(root, "CONTRACT/managed/remit_pool/keys");
const archive = resolve(root, "browser-provers.tar.gz");
const files = ["deposit.prover", "createMandate.prover", "revokeMandate.prover", "withdraw.prover"];
if (existsSync(resolve(keysDir, "placeOffer.prover")) && statSync(resolve(keysDir, "placeOffer.prover")).size > 1_000_000) {
  files.push("placeOffer.prover");
}
const tag = "zk-provers-compact-0.31.1";
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN missing");

for (const name of files) {
  const p = resolve(keysDir, name);
  if (!existsSync(p) || statSync(p).size < 1_000_000) throw new Error(`missing ${name}`);
}

const packed = spawnSync("tar", ["-czf", archive, "-C", keysDir, ...files], { encoding: "utf8" });
if (packed.status !== 0) throw new Error(`tar pack failed: ${packed.stderr || packed.status}`);
const body = readFileSync(archive);
console.log("packed bytes", body.byteLength);

const auth = { Authorization: `token ${token}`, Accept: "application/vnd.github+json", "User-Agent": "remit-preprod" };
const repo = "https://api.github.com/repos/mohamedwael201193/REMIT";

let releaseId: number | undefined;
const existing = await fetch(`${repo}/releases/tags/${tag}`, { headers: auth });
if (existing.status === 200) {
  const json = (await existing.json()) as { id: number; assets?: { id: number; name: string }[] };
  releaseId = json.id;
  for (const asset of json.assets ?? []) {
    if (asset.name === "browser-provers.tar.gz") {
      const del = await fetch(`${repo}/releases/assets/${asset.id}`, { method: "DELETE", headers: auth });
      console.log("deleted prior asset", del.status);
    }
  }
} else if (existing.status === 404) {
  const created = await fetch(`${repo}/releases`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: tag,
      name: "Compact 0.31.1 browser prover keys",
      body: "Public deposit/createMandate/revokeMandate/withdraw prover keys for 1AM in-tab proving. Not secrets.",
      draft: false,
      prerelease: false,
    }),
  });
  if (!created.ok) throw new Error(`create release HTTP ${created.status}`);
  releaseId = ((await created.json()) as { id: number }).id;
  console.log("created release", tag);
} else {
  throw new Error(`release lookup HTTP ${existing.status}`);
}

const upload = await fetch(
  `https://uploads.github.com/repos/mohamedwael201193/REMIT/releases/${releaseId}/assets?name=browser-provers.tar.gz`,
  {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/gzip",
      "Content-Length": String(body.byteLength),
    },
    body,
  },
);
if (!upload.ok) throw new Error(`upload HTTP ${upload.status}`);
console.log(
  "uploaded",
  `https://github.com/mohamedwael201193/REMIT/releases/download/${tag}/browser-provers.tar.gz`,
);
