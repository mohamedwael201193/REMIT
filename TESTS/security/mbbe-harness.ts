import type { Mandate, Offer, OfferSlot } from "@remit/contracts/pool";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { CompactError } from "@midnight-ntwrk/compact-runtime";
import { randomBytes32, toArray } from "../../packages/core/src/bytes.ts";
import { FAR_EXPIRY, padBook, residualOf as residualOpening, withOfferDefaults } from "../../packages/core/src/mbbe.ts";
import { pendingCancelOffer, pendingFill, pendingPlaceOffer } from "../../packages/core/src/pending.ts";
import {
  bootPool,
  callCircuit,
  createMandate,
  deposit,
  mandatePath,
  offerPath,
  publicLedger,
  type Sim,
} from "../../packages/core/src/sim.ts";
import type { JsonPath, OwnedNote } from "../../packages/core/src/state.ts";

export { FAR_EXPIRY, withOfferDefaults };

export type Placed = { offer: Offer; offerRand: Uint8Array };

export type AttackSlot = OfferSlot & { pathOverride?: JsonPath };

export type AttackFillArgs = {
  esk: Uint8Array;
  mandate: Mandate;
  mandateRand: Uint8Array;
  remaining: bigint;
  stateNonce: Uint8Array;
  nowBound: bigint;
  book: AttackSlot[];
  chosenIndex: bigint;
  fillBase?: bigint;
  fillQuote?: bigint;
  auditSeed?: Uint8Array;
  getNonce?: Uint8Array;
  nextStateNonce?: Uint8Array;
  bookPaths?: JsonPath[];
  /** Pair a foreign mandate opening with this state's witnesses (cross-mandate replay). */
  foreignMandate?: { mandate: Mandate; mandateRand: Uint8Array };
};

export function keys() {
  const principalSk = randomBytes32();
  const makerSk = randomBytes32();
  const esk = randomBytes32();
  return {
    principalSk,
    makerSk,
    esk,
    principal: pureCircuits.ownerKey(principalSk),
    maker: pureCircuits.ownerKey(makerSk),
    executor: pureCircuits.executorKey(esk),
  };
}

export type DeskKeys = ReturnType<typeof keys>;

export function sellOffer(maker: Uint8Array, over: Partial<Offer> = {}): Offer {
  return withOfferDefaults({
    side: 1n,
    baseAmount: 40n,
    quoteAmount: 1280n,
    maker,
    payNonce: randomBytes32(),
    ...over,
  });
}

export function buyMandate(k: DeskKeys, over: Partial<Mandate> = {}): Mandate {
  return {
    principal: k.principal,
    executor: k.executor,
    side: 0n,
    maxFillBase: 50n,
    limitNum: 30n,
    limitDen: 1000n,
    cpRoot: 0n,
    expiry: FAR_EXPIRY,
    mandateId: randomBytes32(),
    ...over,
  };
}

export function placeAttackOffer(
  sim: Sim,
  ownerSk: Uint8Array,
  note: OwnedNote,
  offer: Offer,
  offerRand = randomBytes32(),
  changeNonce = randomBytes32(),
): { sim: Sim; offer: Offer; offerRand: Uint8Array; change: OwnedNote } {
  const escrowAsset = offer.side === 0n ? 0n : 1n;
  const escrowAmount = offer.side === 0n ? offer.baseAmount : offer.quoteAmount;
  const change: OwnedNote = {
    asset: note.asset,
    amount: note.amount - escrowAmount,
    owner: note.owner,
    nonce: changeNonce,
  };
  const next = callCircuit(
    sim,
    (ctx) => sim.contract.impureCircuits.placeOffer(ctx),
    pendingPlaceOffer(publicLedger(sim), ownerSk, note, offer, offerRand, changeNonce),
  );
  return { sim: next, offer, offerRand, change };
}

export function cancelAttackOffer(sim: Sim, ownerSk: Uint8Array, offer: Offer, offerRand: Uint8Array): Sim {
  return callCircuit(
    sim,
    (ctx) => sim.contract.impureCircuits.cancelOffer(ctx),
    pendingCancelOffer(publicLedger(sim), ownerSk, offer, offerRand, randomBytes32()),
  );
}

export function placeQuoted(sim: Sim, makerSk: Uint8Array, offer: Offer): { sim: Sim } & Placed {
  const d = deposit(sim, makerSk, 1n, offer.quoteAmount);
  const placed = placeAttackOffer(d.sim, makerSk, d.note, offer);
  return { sim: placed.sim, offer: placed.offer, offerRand: placed.offerRand };
}

export function fillAttack(sim: Sim, args: AttackFillArgs): Sim {
  if (args.book.length === 0) throw new Error("fillAttack requires a non-empty book");
  const idx = Number(args.chosenIndex);
  const selected = args.book[idx] ?? args.book[0]!;
  const fb = args.fillBase ?? selected.offer.baseAmount;
  const fq = args.fillQuote ?? selected.offer.quoteAmount;
  const padded = paddedBook(args.book);
  const slots: OfferSlot[] = padded.map(({ offer, rand, live }) => ({ offer, rand, live }));
  const bookPaths =
    args.bookPaths ??
    padded.map((s) => s.pathOverride ?? offerPath(sim, s.offer, s.rand));
  const treeAnchor = args.book.find((s) => !s.pathOverride) ?? selected;
  const pending = pendingFill(publicLedger(sim), {
    esk: args.esk,
    mandate: args.mandate,
    mandateRand: args.mandateRand,
    remaining: args.remaining,
    stateNonce: args.stateNonce,
    offer: treeAnchor.offer,
    offerRand: treeAnchor.rand,
    auditSeed: args.auditSeed ?? randomBytes32(),
    getNonce: args.getNonce ?? randomBytes32(),
    nextStateNonce: args.nextStateNonce ?? randomBytes32(),
    fillBase: fb,
    fillQuote: fq,
    chosenIndex: args.chosenIndex,
    book: slots,
    bookPaths,
  });
  if (args.foreignMandate) {
    const fm = args.foreignMandate.mandate;
    pending.mandateData = {
      principal: toArray(fm.principal),
      executor: toArray(fm.executor),
      side: fm.side.toString(),
      maxFillBase: fm.maxFillBase.toString(),
      limitNum: fm.limitNum.toString(),
      limitDen: fm.limitDen.toString(),
      cpRoot: fm.cpRoot.toString(),
      expiry: fm.expiry.toString(),
      mandateId: toArray(fm.mandateId),
    };
    pending.mandateRand = toArray(args.foreignMandate.mandateRand);
    pending.mandatePath = mandatePath(sim, fm, args.foreignMandate.mandateRand);
  }
  return callCircuit(sim, (ctx) => sim.contract.impureCircuits.fill(ctx, args.nowBound), pending);
}

export function paddedBook(slots: AttackSlot[]): AttackSlot[] {
  return padBook(slots) as AttackSlot[];
}

export function residualOf(o: Offer, rand: Uint8Array, fillBase: bigint, fillQuote: bigint): { offer: Offer; rand: Uint8Array } {
  return residualOpening(o, rand, fillBase, fillQuote);
}

export function expectCompactFailAny(fn: () => unknown, needles: string[]): string {
  try {
    fn();
  } catch (e) {
    const msg = e instanceof CompactError || e instanceof Error ? e.message : String(e);
    if (needles.some((n) => msg.includes(n))) return msg;
    throw new Error(`expected Compact assert containing one of ${JSON.stringify(needles)}, got: ${msg}`);
  }
  throw new Error(`expected Compact failure one of ${JSON.stringify(needles)}, but the circuit succeeded`);
}

export function bootDesk(k = keys()): {
  k: DeskKeys;
  sim: Sim;
  remaining: bigint;
  mandate: Mandate;
  mandateRand: Uint8Array;
  stateNonce: Uint8Array;
} {
  let sim = bootPool();
  const budget = 100n;
  const dP = deposit(sim, k.principalSk, 0n, budget);
  sim = dP.sim;
  const mandate = buyMandate(k);
  const created = createMandate(sim, k.principalSk, dP.note, mandate);
  return {
    k,
    sim: created.sim,
    remaining: budget,
    mandate,
    mandateRand: created.mandateRand,
    stateNonce: created.stateNonce,
  };
}

export { toArray };
