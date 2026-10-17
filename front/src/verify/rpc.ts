/**
 * VERIFY-1 — direct browser → public Midnight Preprod RPC reads.
 *
 * Endpoint: https://rpc.preprod.midnight.network
 *   - Public, unauthenticated Substrate JSON-RPC. CORS is open
 *     (access-control-allow-origin: *), so a browser page may call it.
 *   - NO secrets, NO tokens, NO wallet. This file must never gain an
 *     Authorization header or a project-id query param.
 *
 * Honest limitation, stated up front: this RPC exposes NO transaction-by-hash
 * method (verified against the live `rpc_methods` list). The page can prove
 * chain liveness and the current tip from here; per-tx inclusion is confirmed
 * through the first-party verify API (see verify-api.ts), which holds the
 * indexer token server-side.
 */

import type { ChainLiveness } from "./types";

export const MIDNIGHT_PREPROD_RPC = "https://rpc.preprod.midnight.network";
export const MIDNIGHT_PREPROD_EXPLORER_TX = "https://preprod.midnightexplorer.com/transactions/";

const RPC_TIMEOUT_MS = 12_000;

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(MIDNIGHT_PREPROD_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`RPC answered HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result as T;
}

function hexToNumber(value: unknown): number | null {
  if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) {
    const n = parseInt(value, 16);
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

/**
 * Reads chain liveness + tip straight from the public node. Everything this
 * returns was read from the chain during this call — label it "verified".
 */
export async function getChainLiveness(): Promise<ChainLiveness> {
  try {
    const [health, chainName, header] = await Promise.all([
      rpcCall<{ peers: number; isSyncing: boolean }>("system_health"),
      rpcCall<string>("system_chain"),
      rpcCall<{ number?: string }>("chain_getHeader"),
    ]);
    const tipHeight = hexToNumber(header?.number);
    if (tipHeight == null) {
      return {
        ok: false,
        chainName: typeof chainName === "string" ? chainName : null,
        peers: null,
        isSyncing: null,
        tipHeight: null,
        error: "The node answered but the block header was unreadable.",
      };
    }
    return {
      ok: true,
      chainName: typeof chainName === "string" ? chainName : null,
      peers: typeof health?.peers === "number" ? health.peers : null,
      isSyncing: typeof health?.isSyncing === "boolean" ? health.isSyncing : null,
      tipHeight,
      error: null,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return {
      ok: false,
      chainName: null,
      peers: null,
      isSyncing: null,
      tipHeight: null,
      error: `Could not reach the Midnight Preprod node (${detail}). Check your connection and try again — this page makes no claims it cannot read.`,
    };
  }
}

/** Explorer deep link for a normalized hash. A LINK, never a claim. */
export function explorerTxUrl(hash64: string): string {
  return `${MIDNIGHT_PREPROD_EXPLORER_TX}0x${hash64}`;
}

/** Normalize pasted input: strip 0x, whitespace; lowercase. Null when not 64 hex chars. */
export function normalizeTxHash(input: string): string | null {
  const cleaned = input.trim().toLowerCase().replace(/^0x/, "").replace(/\s+/g, "");
  return /^[0-9a-f]{64}$/.test(cleaned) ? cleaned : null;
}
