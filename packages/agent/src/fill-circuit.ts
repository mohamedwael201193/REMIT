import { RemitError, checkFillPolicy, pendingFill, type FillPendingArgs, type PoolLedger } from "@remit/core";
import type { Mandate, Offer, OfferSlot } from "@remit/contracts/pool";
import { decideFill, type Candidate, type ExecutorDecision } from "./executor.js";

export type FillIntent = {
  ledger: PoolLedger;
  esk: Uint8Array;
  mandate: Mandate;
  remaining: bigint;
  nowBound: bigint;
  revoked: boolean;
  offer: Offer;
  mandateRand: Uint8Array;
  stateNonce: Uint8Array;
  offerRand: Uint8Array;
  auditSeed: Uint8Array;
  getNonce: Uint8Array;
  nextStateNonce: Uint8Array;
  bypassLocalPrecheck?: boolean;
  /** Private K-set. When omitted, the single `offer` is padded to K=3. */
  candidates?: Candidate[];
  book?: OfferSlot[];
  chosenIndex?: bigint;
  fillBase?: bigint;
  fillQuote?: bigint;
};

export type ConstructedFill = {
  nowBound: bigint;
  pending: ReturnType<typeof pendingFill>;
  decision: ExecutorDecision;
};

/**
 * Encrypted-RFQ decision → Compact fill witnesses for a K-padded book.
 * Local pre-check rejects overreach. Compact remains the settlement gate.
 */
export function constructFill(intent: FillIntent): ConstructedFill {
  const candidates: Candidate[] =
    intent.candidates ??
    intent.book?.map((s, i) => ({
      id: `book:${i}`,
      offer: s.offer,
      remaining: intent.remaining,
      receivedAt: 0,
      rand: s.rand,
      live: s.live,
    })) ??
    [
      {
        id: "intent",
        offer: intent.offer,
        remaining: intent.remaining,
        receivedAt: 0,
        rand: intent.offerRand,
        live: true,
      },
    ];
  const decision = decideFill({
    esk: intent.esk,
    mandate: intent.mandate,
    remaining: intent.remaining,
    nowBound: intent.nowBound,
    revoked: intent.revoked,
    candidates,
    allowCounterparty: () => true,
    bypassLocalPrecheck: intent.bypassLocalPrecheck,
  });
  if (decision.action !== "fill") {
    throw new RemitError("POLICY_REJECT", "local pre-check rejected fill", decision.reason);
  }
  const selected = decision.offer;
  const selectedRand = decision.offerRand ?? intent.offerRand;
  const gate = checkFillPolicy({
    esk: intent.esk,
    mandate: intent.mandate,
    offer: selected,
    remaining: intent.remaining,
    nowBound: intent.nowBound,
    revoked: intent.revoked,
    counterpartyAllowed: true,
  });
  if (!gate.ok && !intent.bypassLocalPrecheck) {
    throw new RemitError("POLICY_REJECT", "local pre-check rejected fill", gate.reason);
  }
  const args: FillPendingArgs = {
    esk: intent.esk,
    mandate: intent.mandate,
    mandateRand: intent.mandateRand,
    remaining: intent.remaining,
    stateNonce: intent.stateNonce,
    offer: selected,
    offerRand: selectedRand,
    auditSeed: intent.auditSeed,
    getNonce: intent.getNonce,
    nextStateNonce: intent.nextStateNonce,
    fillBase: intent.fillBase ?? decision.fillBase,
    fillQuote: intent.fillQuote ?? decision.fillQuote,
    chosenIndex: intent.chosenIndex ?? decision.chosenIndex,
    book: intent.book ?? decision.book,
  };
  return { nowBound: intent.nowBound, pending: pendingFill(intent.ledger, args), decision };
}

/** Alias required by the master plan. Same witnesses as constructFill. */
export function constructFillK(intent: FillIntent): ConstructedFill {
  return constructFill(intent);
}
