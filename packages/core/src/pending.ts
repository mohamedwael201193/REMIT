import type { Mandate, Offer } from "@remit/contracts/pool";
import { toArray } from "./bytes.js";
import type { OwnedNote, PendingWitness } from "./state.js";
import {
  mandateLeaf,
  mandateStateLeaf,
  noteLeaf,
  offerLeaf,
  requireLeafPath,
  type PoolLedger,
} from "./paths.js";

function mandateJson(m: Mandate) {
  return {
    principal: toArray(m.principal),
    executor: toArray(m.executor),
    side: m.side.toString(),
    maxFillBase: m.maxFillBase.toString(),
    limitNum: m.limitNum.toString(),
    limitDen: m.limitDen.toString(),
    cpRoot: m.cpRoot.toString(),
    expiry: m.expiry.toString(),
    mandateId: toArray(m.mandateId),
  };
}

function offerJson(o: Offer) {
  return {
    side: o.side.toString(),
    baseAmount: o.baseAmount.toString(),
    quoteAmount: o.quoteAmount.toString(),
    maker: toArray(o.maker),
    payNonce: toArray(o.payNonce),
  };
}

export function pendingDeposit(ownerSk: Uint8Array, freshNonce: Uint8Array): PendingWitness {
  return { ownerSecret: toArray(ownerSk), freshNonce: toArray(freshNonce) };
}

export function pendingPlaceOffer(
  ld: PoolLedger,
  ownerSk: Uint8Array,
  note: OwnedNote,
  offer: Offer,
  offerRand: Uint8Array,
  changeNonce: Uint8Array,
): PendingWitness {
  return {
    ownerSecret: toArray(ownerSk),
    spendNote: { asset: note.asset.toString(), amount: note.amount.toString(), owner: toArray(note.owner) },
    spendNoteNonce: toArray(note.nonce),
    spendNotePath: requireLeafPath(ld.notes, noteLeaf(note, note.nonce), "note"),
    offerData: offerJson(offer),
    offerRand: toArray(offerRand),
    freshNonce: toArray(changeNonce),
  };
}

export function pendingCreateMandate(
  ld: PoolLedger,
  ownerSk: Uint8Array,
  note: OwnedNote,
  mandate: Mandate,
  mandateRand: Uint8Array,
  stateNonce: Uint8Array,
): PendingWitness {
  return {
    ownerSecret: toArray(ownerSk),
    spendNote: { asset: note.asset.toString(), amount: note.amount.toString(), owner: toArray(note.owner) },
    spendNoteNonce: toArray(note.nonce),
    spendNotePath: requireLeafPath(ld.notes, noteLeaf(note, note.nonce), "note"),
    mandateData: mandateJson(mandate),
    mandateRand: toArray(mandateRand),
    freshNonce: toArray(stateNonce),
  };
}

export function pendingRevokeMandate(
  ld: PoolLedger,
  ownerSk: Uint8Array,
  mandate: Mandate,
  mandateRand: Uint8Array,
  remaining: bigint,
  stateNonce: Uint8Array,
  refundNonce: Uint8Array,
): PendingWitness {
  return {
    ownerSecret: toArray(ownerSk),
    mandateData: mandateJson(mandate),
    mandateRand: toArray(mandateRand),
    mandatePath: requireLeafPath(ld.mandates, mandateLeaf(mandate, mandateRand), "mandate"),
    mandateStateData: { mandateId: toArray(mandate.mandateId), remaining: remaining.toString() },
    mandateStateNonce: toArray(stateNonce),
    mandateStatePath: requireLeafPath(
      ld.mandateStates,
      mandateStateLeaf(mandate.mandateId, remaining, stateNonce),
      "mandate-state",
    ),
    freshNonce: toArray(refundNonce),
  };
}

export type FillPendingArgs = {
  esk: Uint8Array;
  mandate: Mandate;
  mandateRand: Uint8Array;
  remaining: bigint;
  stateNonce: Uint8Array;
  offer: Offer;
  offerRand: Uint8Array;
  auditSeed: Uint8Array;
  getNonce: Uint8Array;
  nextStateNonce: Uint8Array;
};

/** Witnesses for fill: circuit still enforces the mandate. */
export function pendingFill(ld: PoolLedger, args: FillPendingArgs): PendingWitness {
  return {
    executorSecret: toArray(args.esk),
    mandateData: mandateJson(args.mandate),
    mandateRand: toArray(args.mandateRand),
    mandatePath: requireLeafPath(ld.mandates, mandateLeaf(args.mandate, args.mandateRand), "mandate"),
    mandateStateData: { mandateId: toArray(args.mandate.mandateId), remaining: args.remaining.toString() },
    mandateStateNonce: toArray(args.stateNonce),
    mandateStatePath: requireLeafPath(
      ld.mandateStates,
      mandateStateLeaf(args.mandate.mandateId, args.remaining, args.stateNonce),
      "mandate-state",
    ),
    offerData: offerJson(args.offer),
    offerRand: toArray(args.offerRand),
    offerPath: requireLeafPath(ld.offers, offerLeaf(args.offer, args.offerRand), "offer"),
    auditSeed: toArray(args.auditSeed),
    freshNonce: toArray(args.getNonce),
    freshNonce2: toArray(args.nextStateNonce),
  };
}
