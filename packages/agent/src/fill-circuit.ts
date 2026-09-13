import { RemitError, checkFillPolicy, pendingFill, type FillPendingArgs, type PoolLedger } from "@remit/core";
import type { Mandate, Offer } from "@remit/contracts/pool";
import { decideFill, type ExecutorDecision } from "./executor.js";

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
};

/**
 * Encrypted-RFQ decision → Compact fill witnesses.
 * Local pre-check rejects overreach. Compact remains the settlement gate.
 */
export function constructFill(intent: FillIntent): {
  nowBound: bigint;
  pending: ReturnType<typeof pendingFill>;
  decision: ExecutorDecision;
} {
  const decision = decideFill({
    esk: intent.esk,
    mandate: intent.mandate,
    remaining: intent.remaining,
    nowBound: intent.nowBound,
    revoked: intent.revoked,
    candidates: [{ id: "intent", offer: intent.offer, remaining: intent.remaining, receivedAt: 0 }],
    allowCounterparty: () => true,
    bypassLocalPrecheck: intent.bypassLocalPrecheck,
  });
  if (decision.action !== "fill") {
    throw new RemitError("POLICY_REJECT", "local pre-check rejected fill", decision.reason);
  }
  const gate = checkFillPolicy({
    esk: intent.esk,
    mandate: intent.mandate,
    offer: intent.offer,
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
    offer: intent.offer,
    offerRand: intent.offerRand,
    auditSeed: intent.auditSeed,
    getNonce: intent.getNonce,
    nextStateNonce: intent.nextStateNonce,
  };
  return { nowBound: intent.nowBound, pending: pendingFill(intent.ledger, args), decision };
}
