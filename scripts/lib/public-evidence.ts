import { existsSync, readFileSync } from "node:fs";
import { sanitizePublicDetail, stripPublicLeaks } from "../../packages/core/src/leaks.ts";

export type PublicStep = {
  name: string;
  ok: boolean;
  txHash?: string;
  block?: number;
  detail?: string;
};

export type PublicEvidenceBody = {
  present: boolean;
  network: string;
  pool?: { address: string; txHash?: string; block?: number };
  quote?: { address: string; txHash?: string; block?: number };
  steps: PublicStep[];
  mpc: false;
};

function view(body: PublicEvidenceBody): PublicEvidenceBody {
  return stripPublicLeaks(body) as PublicEvidenceBody;
}

export function readLocalLifecycleEvidence(root: string): PublicEvidenceBody | null {
  const p = `${root.replace(/\\/g, "/")}/deployments/lifecycle.json`;
  const alt = root.endsWith("/") ? `${root}deployments/lifecycle.json` : `${root}/deployments/lifecycle.json`;
  const file = existsSync(p) ? p : existsSync(alt) ? alt : null;
  if (!file) return null;
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    network?: string;
    pool?: { address?: string; txHash?: string; block?: number };
    quote?: { address?: string; txHash?: string; block?: number };
    steps?: PublicStep[];
  };
  return view({
    present: true,
    network: raw.network ?? "preprod",
    pool: raw.pool?.address
      ? { address: raw.pool.address, txHash: raw.pool.txHash, block: raw.pool.block }
      : undefined,
    quote: raw.quote?.address
      ? { address: raw.quote.address, txHash: raw.quote.txHash, block: raw.quote.block }
      : undefined,
    steps: (raw.steps ?? []).map((s) => ({
      name: s.name,
      ok: Boolean(s.ok),
      txHash: s.txHash,
      block: s.block,
      detail: sanitizePublicDetail(s.detail),
    })),
    mpc: false,
  });
}

export function readCommittedEvidence(root: string): PublicEvidenceBody | null {
  const candidates = [
    `${root.replace(/\\/g, "/")}/apps/api/preprod-evidence.json`,
    root.endsWith("/") ? `${root}apps/api/preprod-evidence.json` : `${root}/apps/api/preprod-evidence.json`,
  ];
  const file = candidates.find((p) => existsSync(p));
  if (!file) return null;
  const raw = JSON.parse(readFileSync(file, "utf8")) as PublicEvidenceBody & {
    pool?: { address?: string; txHash?: string; block?: number };
    quote?: { address?: string; txHash?: string; block?: number };
  };
  if (!raw?.present || !Array.isArray(raw.steps)) return null;
  return view({
    present: true,
    network: raw.network ?? "preprod",
    pool: raw.pool?.address
      ? { address: raw.pool.address, txHash: raw.pool.txHash, block: raw.pool.block }
      : undefined,
    quote: raw.quote?.address
      ? { address: raw.quote.address, txHash: raw.quote.txHash, block: raw.quote.block }
      : undefined,
    steps: raw.steps.map((s) => ({
      name: s.name,
      ok: Boolean(s.ok),
      txHash: s.txHash,
      block: s.block,
      detail: sanitizePublicDetail(s.detail),
    })),
    mpc: false,
  });
}

export async function publishPublicEvidence(apiUrl: string, admin: string, body: PublicEvidenceBody): Promise<number> {
  const res = await fetch(new URL("/evidence", apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${admin}`,
    },
    body: JSON.stringify(stripPublicLeaks(body)),
  });
  return res.status;
}
