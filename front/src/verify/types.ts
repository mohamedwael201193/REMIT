/**
 * VERIFY-1 — public no-wallet transaction verification page (N5).
 *
 * Evidence discipline: every data element the page renders carries exactly one
 * label:
 *   - "verified"   — read back from the chain (public RPC) or the indexer
 *                    (via the first-party API) during this check.
 *   - "linked"     — a pointer, not a claim (user input echoed back, or a
 *                    constructed deep link). The page asserts nothing about it.
 *   - "unverified" — the page could not confirm it. Shown explicitly rather
 *                    than faked; see the RPC-only fallback in verify-api.ts.
 *
 * No green-checkmark theater: labels are text chips, never ✓ icons.
 * No secrets: the only network targets are the PUBLIC Midnight Preprod RPC
 * (no auth) and the first-party public API (NEXT_PUBLIC_REMIT_API_URL).
 * No VITE_* or token env var is ever read here.
 */

export type EvidenceLabel = "verified" | "linked" | "unverified";

export const LABEL_COPY: Record<EvidenceLabel, string> = {
  verified: "verified",
  linked: "linked",
  unverified: "unverified",
};

/** Liveness + tip read straight from the public node RPC (browser → RPC). */
export interface ChainLiveness {
  ok: boolean;
  chainName: string | null;
  peers: number | null;
  isSyncing: boolean | null;
  tipHeight: number | null;
  /** Human-readable failure; null when ok. */
  error: string | null;
}

/**
 * A disclose record as returned by the first-party verify API. All fields are
 * PUBLIC on-ledger metadata by design of the disclose circuit (N1):
 * auditorKey and the disclosure nullifier are public; the field itself is
 * encrypted to auditorKey in-circuit, so the ledger carries ciphertext only.
 */
export interface DiscloseRecord {
  /** Public metadata: the auditor's key the field was encrypted to. */
  auditorKey: string;
  /** Ledger-write boundary: Hash(commitment || auditorKey). */
  nullifier: string;
  /** Public metadata: which field was disclosed. */
  fieldSelector: string;
}

/** Shape of GET {apiUrl}/verify/tx/:hash (apps/api/src/verify.ts). */
export interface VerifyApiTxResponse {
  hash: string;
  found: boolean;
  blockHeight: number | null;
  explorerUrl: string;
  /** "blockfrost" when the indexer answered; "none" on the RPC-liveness fallback. */
  source: "blockfrost" | "none";
  /** Plain-language note from the API (e.g. "hash not present in the indexer"). */
  note?: string;
  /**
   * Attached when the API can tie this transaction to an on-ledger disclose
   * record. All fields are PUBLIC on-ledger metadata by design of the disclose
   * circuit (N1): auditorKey and the disclosure nullifier are public; the
   * field itself is encrypted to auditorKey in-circuit, so the ledger carries
   * ciphertext only. Absent until the Wave-2 quote-contract deploy ships the
   * disclose circuit — the page says so instead of inventing a record.
   */
  disclose?: DiscloseRecord | null;
}

/** What the page renders for one check. */
export interface TxCheckResult {
  /** Normalized 64-hex hash (0x stripped, lowercased). */
  hash: string;
  /** Direct RPC read — always attempted, no secrets involved. */
  liveness: ChainLiveness;
  /**
   * Indexer-backed lookup via the first-party public API. Null when the API is
   * unconfigured or unreachable — the page then says so instead of inventing
   * a block height.
   */
  api: VerifyApiTxResponse | null;
  /** When the API path was unavailable: plain-language reason. */
  apiUnavailableReason: string | null;
  /** Explorer deep link — always a LINK, never a claim. */
  explorerUrl: string;
  checkedAt: string;
}
