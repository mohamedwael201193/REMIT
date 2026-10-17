/**
 * VERIFY-1 — indexer-backed tx lookup through the FIRST-PARTY public API.
 *
 * GET {apiUrl}/verify/tx/:hash  (apps/api/src/verify.ts)
 *
 * Why not call Blockfrost from the browser? Blockfrost needs a project token,
 * and frontend code must never hold a secret — so the token lives server-side
 * in the API and this page only ever calls our own public endpoint, which
 * needs no auth and no wallet.
 *
 * Returns null (with a reason) when the API is unconfigured or unreachable.
 * The page renders that state honestly — "unverified" — instead of inventing
 * a block height.
 */

import type { VerifyApiTxResponse } from "./types";

const API_TIMEOUT_MS = 15_000;

export function publicApiUrl(): string {
  return (process.env.NEXT_PUBLIC_REMIT_API_URL ?? "").replace(/\/+$/, "");
}

export async function lookupTx(
  hash64: string,
): Promise<{ data: VerifyApiTxResponse | null; unavailableReason: string | null }> {
  const base = publicApiUrl();
  if (!base) {
    return {
      data: null,
      unavailableReason:
        "The first-party verify API is not configured in this deployment (NEXT_PUBLIC_REMIT_API_URL is unset), so per-transaction inclusion cannot be confirmed from this page. The public node RPC exposes no transaction-by-hash method, and this page holds no indexer token by design — no secrets in frontend code, ever. Use the explorer link below (linked) to inspect the transaction.",
    };
  }
  try {
    const res = await fetch(`${base}/verify/tx/${hash64}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (res.status === 404) {
      return {
        data: null,
        unavailableReason:
          "This deployment's API does not serve /verify/tx yet, so per-transaction inclusion cannot be confirmed from this page. The public node RPC exposes no transaction-by-hash method, and this page holds no indexer token by design. Use the explorer link below (linked) to inspect the transaction.",
      };
    }
    if (!res.ok) {
      return {
        data: null,
        unavailableReason: `The verify API answered HTTP ${res.status}, so per-transaction inclusion cannot be confirmed right now. Nothing below is claimed about this transaction's block — use the explorer link (linked).`,
      };
    }
    const data = (await res.json()) as VerifyApiTxResponse;
    if (!data || typeof data.found !== "boolean") {
      return {
        data: null,
        unavailableReason:
          "The verify API answered in an unexpected shape, so per-transaction inclusion cannot be confirmed right now. Use the explorer link below (linked).",
      };
    }
    return { data, unavailableReason: null };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return {
      data: null,
      unavailableReason: `The verify API could not be reached (${detail}), so per-transaction inclusion cannot be confirmed from this page right now. The public node RPC exposes no transaction-by-hash method, and this page holds no indexer token by design. Use the explorer link below (linked).`,
    };
  }
}
