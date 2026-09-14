import { randomBytes32, type PoolLedger } from "@remit/core";
import type { Mandate } from "@remit/contracts/pool";
import { constructFillK } from "./fill-circuit.js";
import type { PlannedFill } from "./daemon.js";

export type ConstructedAgentFill = {
  nowBound: bigint;
  chosenMatches: boolean;
  pending: ReturnType<typeof constructFillK>["pending"];
};

/**
 * Bind the ranked candidate to Compact fill witnesses.
 * HTTP must never serialize pending (chosenIndex / fill sizes / losers).
 */
export function constructRankedFill(args: {
  ledger: PoolLedger;
  planned: PlannedFill;
  esk: Uint8Array;
  mandate: Mandate;
  remaining: bigint;
  nowBound: bigint;
  mandateRand: Uint8Array;
  stateNonce: Uint8Array;
  revoked?: boolean;
}): ConstructedAgentFill {
  const decision = args.planned.decision;
  if (decision.action !== "fill") {
    throw new Error("no eligible candidate to construct");
  }
  const built = constructFillK({
    ledger: args.ledger,
    esk: args.esk,
    mandate: args.mandate,
    remaining: args.remaining,
    nowBound: args.nowBound,
    revoked: args.revoked ?? false,
    offer: decision.offer,
    mandateRand: args.mandateRand,
    stateNonce: args.stateNonce,
    offerRand: decision.offerRand ?? randomBytes32(),
    auditSeed: randomBytes32(),
    getNonce: randomBytes32(),
    nextStateNonce: randomBytes32(),
    candidates: args.planned.candidates,
    book: decision.book,
    chosenIndex: decision.chosenIndex,
    fillBase: decision.fillBase,
    fillQuote: decision.fillQuote,
  });
  const chosenMatches =
    built.decision.action === "fill" &&
    built.decision.id === decision.id &&
    built.decision.chosenIndex === decision.chosenIndex;
  if (!chosenMatches) {
    throw new Error("constructFillK selected a different candidate than rank");
  }
  return { nowBound: args.nowBound, chosenMatches: true, pending: built.pending };
}
