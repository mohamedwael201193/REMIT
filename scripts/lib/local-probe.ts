import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const endpoints = JSON.parse(readFileSync(resolve(root, "infra/local-dev/endpoints.json"), "utf8")) as {
  node: string;
  indexer: string;
  proofServer: string;
};

export const LOCAL_DEV_ENDPOINTS = endpoints;

export type LocalHealth = {
  node: boolean;
  indexer: boolean;
  proof: boolean;
  operatorLock: boolean;
};

export async function probeLocalDev(): Promise<LocalHealth> {
  const operatorLock = existsSync(resolve(root, "deployments/operator-wallet.lock"));
  const checks = await Promise.allSettled([
    fetch(new URL("/health", endpoints.node), { signal: AbortSignal.timeout(1500) }).then((r) => r.ok),
    fetch(endpoints.indexer, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ block { height } }" }),
      signal: AbortSignal.timeout(1500),
    }).then(async (r) => {
      if (!r.ok) return false;
      const j = (await r.json()) as { data?: { block?: { height?: number } } };
      return typeof j.data?.block?.height === "number";
    }),
    fetch(new URL("/health", endpoints.proofServer), { signal: AbortSignal.timeout(1500) }).then(async (r) => {
      if (!r.ok) return false;
      const j = (await r.json()) as { status?: string };
      return j.status === "ok";
    }),
  ]);
  return {
    node: checks[0].status === "fulfilled" && checks[0].value === true,
    indexer: checks[1].status === "fulfilled" && checks[1].value === true,
    proof: checks[2].status === "fulfilled" && checks[2].value === true,
    operatorLock,
  };
}
