export type RemitPublicHealth = {
  ok: boolean;
  network?: string;
  pool?: string;
  quote?: string;
  mpc?: boolean;
  dustGate?: string;
  rfqPublic?: string | null;
  k?: number;
  globalBest?: boolean;
  semantics?: string;
  agent?: { rank?: boolean; httpSubmit?: boolean };
};

export type RemitAgentStatus = {
  ok: boolean;
  rank: boolean;
  httpSubmit: boolean;
  k: number;
  globalBest: false;
  mpc: false;
  rule?: string;
  inbox?: { offers: number; mandates: number };
  last?: {
    at: number;
    candidateCount: number;
    eligibleCount: number;
    rejectedCount: number;
    selected: boolean;
  } | null;
};

/** Public health only. Never treat empty pool/quote as a deployed contract. */
export async function fetchRemitHealth(apiUrl: string): Promise<RemitPublicHealth> {
  const res = await fetch(new URL("/health", apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`));
  if (!res.ok) throw new Error(`health ${res.status}`);
  return (await res.json()) as RemitPublicHealth;
}

/** Public agent heartbeat. No openings, fill sizes, or chosenIndex. */
export async function fetchRemitAgentStatus(apiUrl: string): Promise<RemitAgentStatus> {
  const res = await fetch(new URL("/agent/status", apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`));
  if (!res.ok) throw new Error(`agent status ${res.status}`);
  return (await res.json()) as RemitAgentStatus;
}

export function contractsDeployed(h: RemitPublicHealth): boolean {
  return Boolean(h.pool && h.quote && h.ok);
}
