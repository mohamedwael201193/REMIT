import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type LiveContract = { address: string; txHash?: string; block?: number };

export type LiveDeploy = {
  source: "mbbe" | "v1" | "evidence";
  network: string;
  pool: LiveContract;
  quote: LiveContract;
  historicalV1Pool?: LiveContract;
};

type FileShape = {
  network?: string;
  pool?: { address?: string; txHash?: string; block?: number };
  quote?: { address?: string; txHash?: string; block?: number };
  historicalV1Pool?: { address?: string; txHash?: string; block?: number };
};

function readFile(path: string): FileShape | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as FileShape;
  } catch {
    return null;
  }
}

function asLive(c?: { address?: string; txHash?: string; block?: number }): LiveContract | undefined {
  if (!c?.address) return undefined;
  return { address: c.address, txHash: c.txHash, block: c.block };
}

/** Prefer the MBBE pool. v1 remains historical evidence only. */
export function readLiveDeploy(root: string): LiveDeploy | null {
  const mbbe = readFile(resolve(root, "deployments/preprod-mbbe.json"));
  const v1 = readFile(resolve(root, "deployments/preprod.json"));
  const evidence = readFile(resolve(root, "apps/api/preprod-evidence.json"));
  const pick = (raw: FileShape | null, source: LiveDeploy["source"]): LiveDeploy | null => {
    const pool = asLive(raw?.pool);
    const quote = asLive(raw?.quote);
    if (!pool || !quote) return null;
    return {
      source,
      network: raw?.network ?? "preprod",
      pool,
      quote,
      historicalV1Pool: asLive(raw?.historicalV1Pool) ?? (source === "mbbe" ? asLive(v1?.pool) : undefined),
    };
  };
  return pick(mbbe, "mbbe") ?? pick(evidence, "evidence") ?? pick(v1, "v1");
}
