/**
 * Merge indexer-confirmed RFQ fill + residual consume into hosted GET /evidence.
 * Public details never include fillBase / residual quantity / openings.
 */
import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { publishPublicEvidence, type PublicStep } from "./lib/public-evidence.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const API = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");
const ADMIN = process.env.REMIT_API_ADMIN_TOKEN ?? "";
const FIRST_FILL = "5a1200f5869cb60c81f9ebcb649da45fb47c563bc245c362d36665597b16f00a";
const RESIDUAL_FILL = "5f1203cf9cdde32192f4a2cdce275ff34529b19bbe24644f6014b1c24f12b99f";
const POOL = "01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e";
const QUOTE = "7559e38693725dafef73486f2ee3aa30ee0b5b543e22d0aa5ad7303c37b55e3f";

const EXTRA: PublicStep[] = [
  { name: "pool-k3-fill", ok: true, txHash: FIRST_FILL, block: 2549944, detail: "SucceedEntirely · hosted RFQ consume" },
  {
    name: "pool-residual-consume",
    ok: true,
    txHash: RESIDUAL_FILL,
    block: 2550168,
    detail: "SucceedEntirely · leftover opening consumed",
  },
  { name: "old-opening-replay", ok: true, detail: "consumed opening rejected by Compact" },
  { name: "residual-replay", ok: true, detail: "already-consumed leftover rejected" },
  { name: "selective-audit", ok: true, detail: "one-field verifyDisclosure against auditRoots head" },
  {
    name: "pool-withdraw",
    ok: true,
    txHash: "999e2b5b3a32c7537ebba3ecb9afd7bce77f8ff205f97e361c2be5e35490fce5",
    block: 2550510,
    detail: "SucceedEntirely",
  },
];

async function main() {
  if (!ADMIN) throw new Error("REMIT_API_ADMIN_TOKEN missing");
  const current = (await (await fetch(`${API}/evidence`)).json()) as {
    present?: boolean;
    network?: string;
    pool?: { address?: string; txHash?: string; block?: number };
    quote?: { address?: string; txHash?: string; block?: number };
    steps?: PublicStep[];
  };
  const steps = [...(current.steps ?? [])];
  for (const extra of EXTRA) {
    const dup = steps.some(
      (s) => s.name === extra.name && (extra.txHash ? s.txHash === extra.txHash : !extra.txHash),
    );
    if (!dup) steps.push(extra);
  }
  const status = await publishPublicEvidence(API, ADMIN, {
    present: true,
    network: "preprod",
    pool: { address: POOL, txHash: RESIDUAL_FILL, block: 2550168 },
    quote: current.quote?.address
      ? { address: current.quote.address, txHash: current.quote.txHash, block: current.quote.block }
      : { address: QUOTE },
    steps,
    mpc: false,
  });
  const settled = await fetch(`${API}/agent/settled`, {
    method: "POST",
    headers: { authorization: `Bearer ${ADMIN}`, "content-type": "application/json" },
    body: JSON.stringify({
      selectedId: "1789405396428-0-residual",
      txHash: RESIDUAL_FILL,
      block: 2550168,
    }),
  });
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  mkdirSync(join(root, "deployments"), { recursive: true });
  writeFileSync(
    join(root, "deployments", "rfq-residual-consume.json"),
    JSON.stringify(
      {
        network: "preprod",
        protocolVersion: 1000000,
        target: "1789405396428-0",
        firstFill: { txHash: FIRST_FILL, block: 2549944 },
        residual: { txHash: RESIDUAL_FILL, block: 2550168 },
        auditRootHex: "1bbc1cc2aa2cd83de56cb8ea15ec5dfb8dd071cf2fb305980416ed726b81a694",
        disclosureField: "baseAmount",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ evidence: status, settled: settled.status }));
  if (status !== 200) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
