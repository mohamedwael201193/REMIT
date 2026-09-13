/**
 * Preprod deploy: quote contract then pool. Requires spendable DUST.
 * Does not wait idle in the main agent loop — run as its own tracked process.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { CIRCUIT_CALL_PATH } from "../packages/core/src/tx.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

console.log("preprod deploy gate");
console.log("circuit-call path", CIRCUIT_CALL_PATH.join(" → "));
console.log("network", process.env.MIDNIGHT_NETWORK);
console.log("pool address set", Boolean(process.env.REMIT_POOL_CONTRACT_ADDRESS));
console.log("quote address set", Boolean(process.env.REMIT_TESTQUOTE_CONTRACT_ADDRESS));

if (!process.env.REMIT_OPERATOR_MNEMONIC) {
  console.error("missing operator mnemonic in env");
  process.exit(1);
}

mkdirSync(resolve(root, "deployments"), { recursive: true });
writeFileSync(
  resolve(root, "deployments", "preprod-status.json"),
  JSON.stringify(
    {
      network: process.env.MIDNIGHT_NETWORK,
      indexer: process.env.MIDNIGHT_INDEXER_URL,
      waitingFor: "spendable DUST then deployContract(quote) then deployContract(pool)",
      quote: process.env.REMIT_TESTQUOTE_CONTRACT_ADDRESS || null,
      pool: process.env.REMIT_POOL_CONTRACT_ADDRESS || null,
    },
    null,
    2,
  ),
);
console.log("wrote deployments/preprod-status.json; run dust-register first if DUST coins == 0");
