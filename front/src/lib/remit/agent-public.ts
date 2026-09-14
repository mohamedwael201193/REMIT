/**
 * Public GET /agent/status view. Copies counts only.
 * Never surfaces fillBase, fillQuote, chosenIndex, or openings.
 */

import type { RemitAgentStatus } from "./public-client";

const LEAK = [
  "fillBase",
  "fillQuote",
  "chosenIndex",
  "openings",
  "offerRand",
  "payNonce",
  "rfqSk",
  "execSk",
  "ownerSk",
] as const;

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asBool(value: unknown): boolean {
  return value === true;
}

/** Drop leak keys if a future API payload grows them. */
export function publicAgentView(raw: RemitAgentStatus): RemitAgentStatus {
  const lastRaw = raw.last as (RemitAgentStatus["last"] & Record<string, unknown>) | null | undefined;
  let last: RemitAgentStatus["last"] = null;
  if (lastRaw && typeof lastRaw === "object" && typeof lastRaw.candidateCount === "number") {
    last = {
      at: asCount(lastRaw.at),
      candidateCount: asCount(lastRaw.candidateCount),
      eligibleCount: asCount(lastRaw.eligibleCount),
      rejectedCount: asCount(lastRaw.rejectedCount),
      selected: asBool(lastRaw.selected),
      rule: typeof lastRaw.rule === "string" ? lastRaw.rule : "mbbe-eligible-only",
      globalBest: false,
      mpc: false,
    };
  }
  return {
    ok: raw.ok,
    rank: asBool(raw.rank),
    httpSubmit: asBool(raw.httpSubmit),
    k: typeof raw.k === "number" && Number.isFinite(raw.k) ? raw.k : Number.NaN,
    globalBest: false,
    mpc: false,
    rule: raw.rule,
    inbox: raw.inbox
      ? { offers: asCount(raw.inbox.offers), mandates: asCount(raw.inbox.mandates) }
      : undefined,
    last,
  };
}

export function agentStatusLeaks(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return LEAK.some((k) => keys.includes(k));
}
