/**
 * Write public-only Next env for the supplied front/.
 * Never writes secrets, mnemonics, admin tokens, or RFQ private keys.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readLiveDeploy } from "./lib/live-deploy.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type FrontPublicEnv = {
  apiUrl: string;
  pool: string;
  quote: string;
  indexer: string;
  network: string;
  explorerTx: string;
  keysUrl: string;
  zkirUrl: string;
};

export function frontPublicEnvFromDeploy(deploy: {
  network?: string;
  quote?: { address?: string };
  pool?: { address?: string };
}): FrontPublicEnv | null {
  const pool = deploy.pool?.address ?? "";
  const quote = deploy.quote?.address ?? "";
  if (!pool || !quote) return null;
  const apiUrl = process.env.REMIT_API_PUBLIC_URL ?? process.env.RENDER_SERVICE_URL ?? "https://remit-api-node.onrender.com";
  return {
    apiUrl: apiUrl.replace(/\/health$/, "").replace(/\/$/, ""),
    pool,
    quote,
    indexer: process.env.MIDNIGHT_INDEXER_URL ?? "https://indexer.preprod.midnight.network/api/v4/graphql",
    network: deploy.network ?? "preprod",
    explorerTx: "https://preprod.midnightexplorer.com/transactions/",
    keysUrl: `${apiUrl.replace(/\/health$/, "").replace(/\/$/, "")}/keys`,
    zkirUrl: `${apiUrl.replace(/\/health$/, "").replace(/\/$/, "")}/zkir`,
  };
}

export function serializeFrontPublicEnv(env: FrontPublicEnv): string {
  return [
    "# Generated public Preprod config. No secrets.",
    `NEXT_PUBLIC_MIDNIGHT_NETWORK=${env.network}`,
    `NEXT_PUBLIC_MIDNIGHT_INDEXER_URL=${env.indexer}`,
    `NEXT_PUBLIC_MIDNIGHT_EXPLORER_TX=${env.explorerTx}`,
    `NEXT_PUBLIC_REMIT_API_URL=${env.apiUrl}`,
    `NEXT_PUBLIC_REMIT_POOL_CONTRACT_ADDRESS=${env.pool}`,
    `NEXT_PUBLIC_REMIT_QUOTE_CONTRACT_ADDRESS=${env.quote}`,
    `NEXT_PUBLIC_REMIT_KEYS_URL=${env.keysUrl}`,
    `NEXT_PUBLIC_REMIT_ZKIR_URL=${env.zkirUrl}`,
    "",
  ].join("\n");
}

export function writeFrontPublicEnv(deployPath?: string): string | null {
  const deploy = deployPath
    ? existsSync(deployPath)
      ? (JSON.parse(readFileSync(deployPath, "utf8")) as {
          network?: string;
          quote?: { address?: string };
          pool?: { address?: string };
        })
      : null
    : readLiveDeploy(root);
  if (!deploy) return null;
  const env = frontPublicEnvFromDeploy(deploy);
  if (!env) return null;
  const frontDir = resolve(root, "front");
  mkdirSync(frontDir, { recursive: true });
  const out = resolve(frontDir, ".env.local");
  writeFileSync(out, serializeFrontPublicEnv(env));
  return out;
}

if (process.argv[1] && process.argv[1].includes("write-front-public-env")) {
  const written = writeFrontPublicEnv();
  console.log(written ? `wrote ${written}` : "no indexer-backed MBBE/v1 deploy file yet");
}
