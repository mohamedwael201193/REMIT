/**
 * Sync public + secret Render env from .env.preprod.local.
 * Prints key names and HTTP status only — never values.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ids = [
  JSON.parse(readFileSync(resolve(root, "deployments/render.json"), "utf8")).id as string,
  JSON.parse(readFileSync(resolve(root, "deployments/render-node.json"), "utf8")).id as string,
];

const key = process.env.RENDER_API_KEY;
if (!key) throw new Error("RENDER_API_KEY missing");

const preprodPath = resolve(root, "deployments/preprod.json");
const preprod = existsSync(preprodPath)
  ? (JSON.parse(readFileSync(preprodPath, "utf8")) as {
      pool?: { address?: string };
      quote?: { address?: string };
    })
  : null;

const vars: { key: string; value: string }[] = [
  { key: "MIDNIGHT_NETWORK", value: "preprod" },
  { key: "MIDNIGHT_INDEXER_URL", value: process.env.MIDNIGHT_INDEXER_URL ?? "https://indexer.preprod.midnight.network/api/v4/graphql" },
  { key: "REMIT_API_CORS_ORIGIN", value: "*" },
];
if (preprod?.pool?.address) vars.push({ key: "REMIT_POOL_CONTRACT_ADDRESS", value: preprod.pool.address });
if (preprod?.quote?.address) vars.push({ key: "REMIT_TESTQUOTE_CONTRACT_ADDRESS", value: preprod.quote.address });
const secrets = [
  "REMIT_AGENT_RFQ_BOX_SECRET_HEX",
  "REMIT_API_ADMIN_TOKEN",
  "REMIT_AGENT_PRIVATE_STATE_PASSWORD",
  "REMIT_EXECUTOR_SECRET_HEX",
];
for (const k of secrets) {
  const v = process.env[k];
  if (v) vars.push({ key: k, value: v });
}

async function existingEnv(id: string): Promise<{ key: string; value?: string }[]> {
  const res = await fetch(`https://api.render.com/v1/services/${id}/env-vars`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`env GET ${id} HTTP ${res.status}`);
  const rows = (await res.json()) as { envVar?: { key?: string; value?: string }; key?: string; value?: string }[];
  return rows
    .map((r) => ({ key: r.envVar?.key ?? r.key ?? "", value: r.envVar?.value ?? r.value }))
    .filter((r) => r.key);
}

async function putEnv(id: string) {
  const existing = await existingEnv(id);
  console.log("env existing", id, existing.map((e) => e.key).sort().join(","));
  const merged = new Map<string, string>();
  for (const e of existing) {
    if (e.value) merged.set(e.key, e.value);
  }
  for (const v of vars) merged.set(v.key, v.value);
  const body = [...merged.entries()].map(([k, value]) => ({ key: k, value }));
  const res = await fetch(`https://api.render.com/v1/services/${id}/env-vars`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const names = [...merged.keys()].sort();
  console.log("env PUT", id, res.status, names.join(","));
  if (!res.ok) throw new Error(`env PUT ${id} HTTP ${res.status}`);
  const deploy = await fetch(`https://api.render.com/v1/services/${id}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
  console.log("redeploy", id, deploy.status);
}

for (const id of ids) await putEnv(id);
