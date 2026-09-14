import { checkFillPolicy, legalSlice, padBook, type PolicyFail } from "@remit/core";
import type { Mandate, Offer, OfferSlot } from "@remit/contracts/pool";
import { pickBest, rankOffers, selectKBook, slotsOf, type Candidate, type Ranked } from "./strategy.js";

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
  | {
      action: "fill";
      id: string;
      offer: Offer;
      ranked: Ranked[];
      chosenIndex: bigint;
      book: OfferSlot[];
      fillBase: bigint;
      fillQuote: bigint;
      offerRand?: Uint8Array;
    }
  | { action: "reject"; reason: PolicyFail | "no-compliant-offer" | "no-legal-slice"; ranked: Ranked[] };

/**
 * Agent is an execution component, not a chatbot.
 * It may choose among compliant offers. It cannot authorize a fill the circuit would reject
 * unless the caller deliberately bypasses the local pre-check (for the overreach demo).
 */
export function decideFill(input: ExecutorInput): ExecutorDecision {
  const rankArgs = {
    esk: input.esk,
    mandate: input.mandate,
    remaining: input.remaining,
    nowBound: input.nowBound,
    revoked: input.revoked,
    candidates: input.candidates,
    allowCounterparty: input.allowCounterparty,
  };
  const ranked = rankOffers(rankArgs);
  if (input.bypassLocalPrecheck) {
    const first = input.candidates[0];
    if (!first) return { action: "reject", reason: "no-compliant-offer", ranked };
    const raw = input.candidates.slice(0, 3);
    return {
      action: "fill",
      id: first.id,
      offer: first.offer,
      ranked,
      chosenIndex: 0n,
      book: padBook(slotsOf(raw)),
      fillBase: first.offer.baseAmount,
      fillQuote: first.offer.quoteAmount,
      offerRand: first.rand,
    };
  }
  const k = selectKBook(rankArgs);
  const id = pickBest(ranked, rankArgs);
  if (!k || !id) return { action: "reject", reason: "no-compliant-offer", ranked };
  const chosen = k.selected;
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
  try {
    const slice = legalSlice(chosen.offer, input.mandate, input.remaining);
    return {
      action: "fill",
      id: chosen.id,
      offer: chosen.offer,
      ranked,
      chosenIndex: k.chosenIndex,
      book: k.book,
      fillBase: slice.fillBase,
      fillQuote: slice.fillQuote,
      offerRand: chosen.rand,
    };
  } catch {
    return { action: "reject", reason: "no-legal-slice", ranked };
  }
}

export { rankOffers, pickBest, selectKBook };
export type { Candidate, Ranked };
