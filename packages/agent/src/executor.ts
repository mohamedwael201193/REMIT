import { checkFillPolicy, type PolicyFail } from "@remit/core";
import type { Mandate, Offer } from "@remit/contracts/pool";
import { pickBest, rankOffers, type Candidate, type Ranked } from "./strategy.js";

export type ExecutorInput = {
  esk: Uint8Array;
  mandate: Mandate;
  remaining: bigint;
  nowBound: bigint;
  revoked: boolean;
  candidates: Candidate[];
  allowCounterparty: (maker: Uint8Array) => boolean;
  /** When true, skip the local pre-check so the Compact circuit is the only gate. */
  bypassLocalPrecheck?: boolean;
};

export type ExecutorDecision =
  | { action: "fill"; id: string; offer: Offer; ranked: Ranked[] }
  | { action: "reject"; reason: PolicyFail | "no-compliant-offer"; ranked: Ranked[] };

/**
 * Agent is an execution component, not a chatbot.
 * It may choose among compliant offers. It cannot authorize a fill the circuit would reject
 * unless the caller deliberately bypasses the local pre-check (for the overreach demo).
 */
export function decideFill(input: ExecutorInput): ExecutorDecision {
  const ranked = rankOffers({
    esk: input.esk,
    mandate: input.mandate,
    remaining: input.remaining,
    nowBound: input.nowBound,
    revoked: input.revoked,
    candidates: input.candidates,
    allowCounterparty: input.allowCounterparty,
  });
  if (input.bypassLocalPrecheck) {
    const first = input.candidates[0];
    if (!first) return { action: "reject", reason: "no-compliant-offer", ranked };
    return { action: "fill", id: first.id, offer: first.offer, ranked };
  }
  const id = pickBest(ranked);
  if (!id) return { action: "reject", reason: "no-compliant-offer", ranked };
  const chosen = input.candidates.find((c) => c.id === id)!;
  const gate = checkFillPolicy({
    esk: input.esk,
    mandate: input.mandate,
    offer: chosen.offer,
    remaining: input.remaining,
    nowBound: input.nowBound,
    revoked: input.revoked,
    counterpartyAllowed: input.allowCounterparty(chosen.offer.maker),
  });
  if (!gate.ok) return { action: "reject", reason: gate.reason, ranked };
  return { action: "fill", id, offer: chosen.offer, ranked };
}

export { rankOffers, pickBest };
export type { Candidate, Ranked };
