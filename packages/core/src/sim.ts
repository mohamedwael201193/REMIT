import {
  CompactError,
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits, type Mandate, type Offer, type OfferSlot } from "@remit/contracts/pool";
import {
  Contract as QuoteContract,
  ledger as quoteLedger,
  type Ledger as QuoteLedger,
  type Witnesses as QuoteWitnesses,
} from "@remit/contracts/quote";
import { fromArray } from "./bytes.js";
import { toArray, randomBytes32 } from "./bytes.js";
import { RemitError } from "./errors.js";
import { dumpPublicLedger } from "./privacy.js";
import { emptyPrivateState, type JsonPath, type OwnedNote, type RemitPrivateState } from "./state.js";
import { jsonPath } from "./paths.js";
import { stage, witnesses } from "./witnesses.js";
import { padBook, withOfferDefaults, type LooseOffer } from "./mbbe.js";

const CPK = "11".repeat(32);
const ADDR = dummyContractAddress();

export type Sim = {
  contract: Contract<RemitPrivateState>;
  ctx: CircuitContext<RemitPrivateState>;
  ps: RemitPrivateState;
  quoteColor: Uint8Array;
};

export { jsonPath } from "./paths.js";
export type { OwnedNote };

export function bootPool(quoteColor = randomBytes32()): Sim {
  const contract = new Contract(witnesses);
  const ps = emptyPrivateState("sim");
  const ctor = createConstructorContext(ps, CPK);
  const built = contract.initialState(ctor, quoteColor);
  const ctx = createCircuitContext(ADDR, CPK, built.currentContractState, built.currentPrivateState);
  return { contract, ctx, ps: built.currentPrivateState, quoteColor };
}

export function publicLedger(sim: Sim) {
  return ledger(sim.ctx.currentQueryContext.state);
}

export function callCircuit(
  sim: Sim,
  run: (ctx: CircuitContext<RemitPrivateState>) => { context: CircuitContext<RemitPrivateState> },
  pending: RemitPrivateState["pending"],
): Sim {
  const ps = stage(sim.ps, pending);
  const ctx: CircuitContext<RemitPrivateState> = { ...sim.ctx, currentPrivateState: ps };
  const out = run(ctx);
  return { ...sim, ctx: out.context, ps: out.context.currentPrivateState };
}

export function deposit(sim: Sim, ownerSk: Uint8Array, asset: bigint, amount: bigint, nonce = randomBytes32()): {
  sim: Sim;
  note: OwnedNote;
} {
  const owner = pureCircuits.ownerKey(ownerSk);
  const next = callCircuit(sim, (ctx) => sim.contract.impureCircuits.deposit(ctx, asset, amount), {
    ownerSecret: toArray(ownerSk),
    freshNonce: toArray(nonce),
  });
  return { sim: next, note: { asset, amount, owner, nonce } };
}

export function notePath(sim: Sim, note: OwnedNote): JsonPath {
  const commit = pureCircuits.noteCommitment(
    { asset: note.asset, amount: note.amount, owner: note.owner },
    note.nonce,
  );
  const p = publicLedger(sim).notes.findPathForLeaf(commit);
  if (!p) throw new RemitError("INTERNAL", "note not in tree");
  return jsonPath(p);
}

function offerPending(offer: LooseOffer) {
  const o = withOfferDefaults(offer);
  return {
    side: o.side.toString(),
    baseAmount: o.baseAmount.toString(),
    quoteAmount: o.quoteAmount.toString(),
    maker: toArray(o.maker),
    payNonce: toArray(o.payNonce),
    expiry: o.expiry.toString(),
    minFillBase: o.minFillBase.toString(),
  };
}

export function placeOffer(
  sim: Sim,
  ownerSk: Uint8Array,
  note: OwnedNote,
  offer: LooseOffer,
  offerRand = randomBytes32(),
  changeNonce = randomBytes32(),
): { sim: Sim; offer: Offer; offerRand: Uint8Array; change: OwnedNote } {
  const o = withOfferDefaults(offer);
  const escrowAsset = o.side === 0n ? 0n : 1n;
  const escrowAmount = o.side === 0n ? o.baseAmount : o.quoteAmount;
  const change: OwnedNote = {
    asset: note.asset,
    amount: note.amount - escrowAmount,
    owner: note.owner,
    nonce: changeNonce,
  };
  const next = callCircuit(sim, (ctx) => sim.contract.impureCircuits.placeOffer(ctx), {
    ownerSecret: toArray(ownerSk),
    spendNote: { asset: note.asset.toString(), amount: note.amount.toString(), owner: toArray(note.owner) },
    spendNoteNonce: toArray(note.nonce),
    spendNotePath: notePath(sim, note),
    offerData: offerPending(o),
    offerRand: toArray(offerRand),
    freshNonce: toArray(changeNonce),
  });
  return { sim: next, offer: o, offerRand, change };
}

export function offerPath(sim: Sim, offer: LooseOffer, rand: Uint8Array): JsonPath {
  const c = pureCircuits.offerCommitment(withOfferDefaults(offer), rand);
  const p = publicLedger(sim).offers.findPathForLeaf(c);
  if (!p) throw new RemitError("INTERNAL", "offer not in tree");
  return jsonPath(p);
}

export function createMandate(
  sim: Sim,
  ownerSk: Uint8Array,
  note: OwnedNote,
  mandate: Mandate,
  mandateRand = randomBytes32(),
  stateNonce = randomBytes32(),
): { sim: Sim; mandate: Mandate; mandateRand: Uint8Array; stateNonce: Uint8Array } {
  const next = callCircuit(sim, (ctx) => sim.contract.impureCircuits.createMandate(ctx), {
    ownerSecret: toArray(ownerSk),
    spendNote: { asset: note.asset.toString(), amount: note.amount.toString(), owner: toArray(note.owner) },
    spendNoteNonce: toArray(note.nonce),
    spendNotePath: notePath(sim, note),
    mandateData: {
      principal: toArray(mandate.principal),
      executor: toArray(mandate.executor),
      side: mandate.side.toString(),
      maxFillBase: mandate.maxFillBase.toString(),
      limitNum: mandate.limitNum.toString(),
      limitDen: mandate.limitDen.toString(),
      cpRoot: mandate.cpRoot.toString(),
      expiry: mandate.expiry.toString(),
      mandateId: toArray(mandate.mandateId),
    },
    mandateRand: toArray(mandateRand),
    freshNonce: toArray(stateNonce),
  });
  return { sim: next, mandate, mandateRand, stateNonce };
}

export function mandatePath(sim: Sim, mandate: Mandate, rand: Uint8Array): JsonPath {
  const c = pureCircuits.mandateCommitment(mandate, rand);
  const p = publicLedger(sim).mandates.findPathForLeaf(c);
  if (!p) throw new RemitError("INTERNAL", "mandate not in tree");
  return jsonPath(p);
}

export function mandateStatePath(sim: Sim, mandateId: Uint8Array, remaining: bigint, nonce: Uint8Array): JsonPath {
  const c = pureCircuits.mandateStateCommitment({ mandateId, remaining }, nonce);
  const p = publicLedger(sim).mandateStates.findPathForLeaf(c);
  if (!p) throw new RemitError("INTERNAL", "mandate state not in tree");
  return jsonPath(p);
}

export type FillArgs = {
  esk: Uint8Array;
  mandate: Mandate;
  mandateRand: Uint8Array;
  remaining: bigint;
  stateNonce: Uint8Array;
  offer: LooseOffer;
  offerRand: Uint8Array;
  nowBound: bigint;
  auditSeed?: Uint8Array;
  getNonce?: Uint8Array;
  nextStateNonce?: Uint8Array;
  fillBase?: bigint;
  fillQuote?: bigint;
  chosenIndex?: bigint;
  book?: OfferSlot[];
  /** Test-only: a path that does not match this offer (Compact must reject). */
  offerPathOverride?: JsonPath;
};

export function revokeMandate(
  sim: Sim,
  ownerSk: Uint8Array,
  mandate: Mandate,
  mandateRand: Uint8Array,
  remaining: bigint,
  stateNonce: Uint8Array,
  refundNonce = randomBytes32(),
): Sim {
  return callCircuit(sim, (ctx) => sim.contract.impureCircuits.revokeMandate(ctx), {
    ownerSecret: toArray(ownerSk),
    mandateData: {
      principal: toArray(mandate.principal),
      executor: toArray(mandate.executor),
      side: mandate.side.toString(),
      maxFillBase: mandate.maxFillBase.toString(),
      limitNum: mandate.limitNum.toString(),
      limitDen: mandate.limitDen.toString(),
      cpRoot: mandate.cpRoot.toString(),
      expiry: mandate.expiry.toString(),
      mandateId: toArray(mandate.mandateId),
    },
    mandateRand: toArray(mandateRand),
    mandatePath: mandatePath(sim, mandate, mandateRand),
    mandateStateData: { mandateId: toArray(mandate.mandateId), remaining: remaining.toString() },
    mandateStateNonce: toArray(stateNonce),
    mandateStatePath: mandateStatePath(sim, mandate.mandateId, remaining, stateNonce),
    freshNonce: toArray(refundNonce),
  });
}

export function cancelOffer(
  sim: Sim,
  ownerSk: Uint8Array,
  offer: LooseOffer,
  offerRand: Uint8Array,
  refundNonce = randomBytes32(),
): Sim {
  const o = withOfferDefaults(offer);
  return callCircuit(sim, (ctx) => sim.contract.impureCircuits.cancelOffer(ctx), {
    ownerSecret: toArray(ownerSk),
    offerData: offerPending(o),
    offerRand: toArray(offerRand),
    offerPath: offerPath(sim, o, offerRand),
    freshNonce: toArray(refundNonce),
  });
}

export function withdraw(
  sim: Sim,
  ownerSk: Uint8Array,
  note: OwnedNote,
  amount: bigint,
  recipient = randomBytes32(),
  changeNonce = randomBytes32(),
): Sim {
  return callCircuit(sim, (ctx) => sim.contract.impureCircuits.withdraw(ctx, note.asset, amount), {
    ownerSecret: toArray(ownerSk),
    spendNote: { asset: note.asset.toString(), amount: note.amount.toString(), owner: toArray(note.owner) },
    spendNoteNonce: toArray(note.nonce),
    spendNotePath: notePath(sim, note),
    freshNonce: toArray(changeNonce),
    withdrawTo: { is_left: false, left: Array.from({ length: 32 }, () => 0), right: Array.from(recipient) },
  });
}

export function fill(sim: Sim, args: FillArgs): Sim {
  const seed = args.auditSeed ?? randomBytes32();
  const getNonce = args.getNonce ?? randomBytes32();
  const nextStateNonce = args.nextStateNonce ?? randomBytes32();
  const o = withOfferDefaults(args.offer);
  const selectedPath = args.offerPathOverride ?? offerPath(sim, o, args.offerRand);
  const live: OfferSlot[] = args.book ?? [{ offer: o, rand: args.offerRand, live: true }];
  const slots = padBook(live);
  const paths = slots.map((s) =>
    args.offerPathOverride && s.live && s.offer === o ? selectedPath : offerPath(sim, s.offer, s.rand),
  );
  if (args.offerPathOverride) paths[0] = args.offerPathOverride;
  const fillBase = args.fillBase ?? o.baseAmount;
  const fillQuote = args.fillQuote ?? o.quoteAmount;
  const chosenIndex = args.chosenIndex ?? 0n;
  return callCircuit(sim, (ctx) => sim.contract.impureCircuits.fill(ctx, args.nowBound), {
    executorSecret: toArray(args.esk),
    mandateData: {
      principal: toArray(args.mandate.principal),
      executor: toArray(args.mandate.executor),
      side: args.mandate.side.toString(),
      maxFillBase: args.mandate.maxFillBase.toString(),
      limitNum: args.mandate.limitNum.toString(),
      limitDen: args.mandate.limitDen.toString(),
      cpRoot: args.mandate.cpRoot.toString(),
      expiry: args.mandate.expiry.toString(),
      mandateId: toArray(args.mandate.mandateId),
    },
    mandateRand: toArray(args.mandateRand),
    mandatePath: mandatePath(sim, args.mandate, args.mandateRand),
    mandateStateData: { mandateId: toArray(args.mandate.mandateId), remaining: args.remaining.toString() },
    mandateStateNonce: toArray(args.stateNonce),
    mandateStatePath: mandateStatePath(sim, args.mandate.mandateId, args.remaining, args.stateNonce),
    offerData: offerPending(o),
    offerRand: toArray(args.offerRand),
    offerPath: selectedPath,
    book: slots.map((s) => ({
      offer: offerPending(s.offer),
      rand: toArray(s.rand),
      live: s.live,
    })),
    bookPaths: paths,
    chosenIndex: chosenIndex.toString(),
    fillBase: fillBase.toString(),
    fillQuote: fillQuote.toString(),
    auditSeed: toArray(seed),
    freshNonce: toArray(getNonce),
    freshNonce2: toArray(nextStateNonce),
  });
}

export function expectCompactFail(fn: () => unknown, needle: string): string {
  try {
    fn();
  } catch (e) {
    const msg = e instanceof CompactError || e instanceof Error ? e.message : String(e);
    if (!msg.includes(needle)) {
      throw new Error(`expected Compact assert containing "${needle}", got: ${msg}`);
    }
    return msg;
  }
  throw new Error(`expected Compact failure "${needle}", but the circuit succeeded`);
}

export function serializedPublicState(sim: Sim): { hex: string; text: string } {
  const q = sim.ctx.currentQueryContext;
  const ld = publicLedger(sim);
  const dump = dumpPublicLedger(ld);
  const text = [q.toString(true), q.state.toString(true), dump].join("\n");
  const buf = Buffer.from(text, "utf8");
  return { hex: buf.toString("hex"), text };
}

// ---------------------------------------------------------------------------
// Quote-contract simulator (Wave 2 N1 `discloseField` circuit).
//
// Separate from the pool Sim above: discloseField lives on remit_quote, with
// its own witnesses. Same discipline: no JS mirrors of circuit logic — the
// generated impureCircuits.discloseField is the circuit under test.
//
// Witness alignment note: these witnesses are staged HERE, against the FINAL
// circuit in CONTRACT/src/remit_quote.compact (disclosureSeed/disclosureSide/
// disclosureBaseAmount/disclosureQuoteAmount/disclosurePrincipal/
// disclosureCounterparty/disclosureMandateId + callerSecret). They are
// deliberately NOT read from quote-witnesses.ts, which is owned by the
// WITNESS-FIX follow-up worker (see midnight-wave2/status/sequencing-note.md).
// For the on-chain path see submitDiscloseField in tx.ts.
// ---------------------------------------------------------------------------

/** Private values staged for one discloseField() call (UNTRUSTED input — asserted in-circuit). */
export type DiscloseStaged = {
  callerSk: number[];
  seed: number[];
  side: bigint;
  baseAmount: bigint;
  quoteAmount: bigint;
  principal: number[];
  counterparty: number[];
  mandateId: number[];
};

export type DisclosePrivateState = {
  version: 1;
  staged?: DiscloseStaged;
};

function stagedBytes(ps: DisclosePrivateState, name: keyof DiscloseStaged): Uint8Array {
  const v = ps.staged?.[name];
  if (!(v instanceof Array)) throw new RemitError("WITNESS_MISSING", `discloseField witness not staged: ${String(name)}`);
  return fromArray(v as number[]);
}

function stagedNum(ps: DisclosePrivateState, name: keyof DiscloseStaged): bigint {
  const v = ps.staged?.[name];
  if (typeof v !== "bigint") throw new RemitError("WITNESS_MISSING", `discloseField witness not staged: ${String(name)}`);
  return v;
}

export const quoteDiscloseWitnesses: QuoteWitnesses<DisclosePrivateState> = {
  callerSecret: ({ privateState }) => [privateState, stagedBytes(privateState, "callerSk")],
  disclosureSeed: ({ privateState }) => [privateState, stagedBytes(privateState, "seed")],
  disclosureSide: ({ privateState }) => [privateState, stagedNum(privateState, "side")],
  disclosureBaseAmount: ({ privateState }) => [privateState, stagedNum(privateState, "baseAmount")],
  disclosureQuoteAmount: ({ privateState }) => [privateState, stagedNum(privateState, "quoteAmount")],
  disclosurePrincipal: ({ privateState }) => [privateState, stagedBytes(privateState, "principal")],
  disclosureCounterparty: ({ privateState }) => [privateState, stagedBytes(privateState, "counterparty")],
  disclosureMandateId: ({ privateState }) => [privateState, stagedBytes(privateState, "mandateId")],
};

export type QuoteSim = {
  contract: QuoteContract<DisclosePrivateState>;
  ctx: CircuitContext<DisclosePrivateState>;
  ps: DisclosePrivateState;
};

export function bootQuoteDisclose(): QuoteSim {
  const contract = new QuoteContract(quoteDiscloseWitnesses);
  const ps: DisclosePrivateState = { version: 1 };
  const ctor = createConstructorContext(ps, CPK);
  // remit_quote has no explicit constructor: initialState takes only the context.
  const built = contract.initialState(ctor);
  const ctx = createCircuitContext(ADDR, CPK, built.currentContractState, built.currentPrivateState);
  return { contract, ctx, ps: built.currentPrivateState };
}

export function quotePublicLedger(qsim: QuoteSim): QuoteLedger {
  return quoteLedger(qsim.ctx.currentQueryContext.state);
}

export function callQuoteCircuit(
  qsim: QuoteSim,
  run: (ctx: CircuitContext<DisclosePrivateState>) => { context: CircuitContext<DisclosePrivateState> },
): QuoteSim {
  const ctx: CircuitContext<DisclosePrivateState> = { ...qsim.ctx, currentPrivateState: qsim.ps };
  const out = run(ctx);
  return { ...qsim, ctx: out.context, ps: out.context.currentPrivateState };
}

/**
 * Run the generated discloseField(fieldSelector, auditorKey, sealedBox)
 * circuit in the simulator. Witnesses are staged (UNTRUSTED input — asserted
 * in-circuit), then the real generated binding executes.
 */
export function discloseField(
  qsim: QuoteSim,
  fieldSelector: bigint,
  auditorKey: Uint8Array,
  sealedBox: Uint8Array,
  staged: DiscloseStaged,
): QuoteSim {
  const ps: DisclosePrivateState = { ...qsim.ps, staged };
  return callQuoteCircuit({ ...qsim, ps }, (ctx) =>
    qsim.contract.impureCircuits.discloseField(ctx, fieldSelector, auditorKey, sealedBox),
  );
}
