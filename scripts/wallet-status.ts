/**
 * Public-only Preprod wallet view via indexer (no mnemonic used).
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchBlock, assertLedger8 } from "../packages/core/src/indexer.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const INDEXER = process.env.MIDNIGHT_INDEXER_URL!;
const ADDR = process.env.REMIT_OPERATOR_UNSHIELDED_ADDR!;

const q = async (query: string, variables?: Record<string, unknown>) => {
  const res = await fetch(INDEXER, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<{ data?: unknown; errors?: { message: string }[] }>;
};

const block = await fetchBlock(INDEXER);
assertLedger8(block);
console.log("preprod block", block.height, "protocolVersion", block.protocolVersion);

const intro = await q("{ __type(name: \"Query\") { fields { name } } }");
const fields = ((intro.data as { __type?: { fields?: { name: string }[] } })?.__type?.fields ?? []).map((f) => f.name);
console.log("query fields sample", fields.filter((n) => /dust|unshield|contract|block|tx/i.test(n)).join(","));

console.log("operator unshielded (public):", ADDR ? `${ADDR.slice(0, 20)}…${ADDR.slice(-6)}` : "(missing)");
