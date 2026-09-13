import {
  CompactError,
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits, type Mandate, type Offer } from "@remit/contracts/pool";
import { toArray, randomBytes32 } from "./bytes.js";
import { RemitError } from "./errors.js";
import { dumpPublicLedger } from "./privacy.js";
import { emptyPrivateState, type JsonPath, type RemitPrivateState } from "./state.js";
import { stage, witnesses } from "./witnesses.js";

const CPK = "11".repeat(32);
const ADDR = dummyContractAddress();

export type OwnedNote = {
  asset: bigint;
  amount: bigint;
  owner: Uint8Array;
  nonce: Uint8Array;
};

export type Sim = {
  contract: Contract<RemitPrivateState>;
  ctx: CircuitContext<RemitPrivateState>;
  ps: RemitPrivateState;
  quoteColor: Uint8Array;
};

export function jsonPath(p: {
  leaf: Uint8Array;
  path: { sibling: { field: bigint }; goes_left: boolean }[];
}): JsonPath {
  return {
    leaf: toArray(p.leaf),
    path: p.path.map((e) => ({ sibling: { field: e.sibling.field.toString() }, goes_left: e.goes_left })),
  };
}

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

export function placeOffer(
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
  const next = callCircuit(sim, (ctx) => sim.contract.impureCircuits.placeOffer(ctx), {
    ownerSecret: toArray(ownerSk),
    spendNote: { asset: note.asset.toString(), amount: note.amount.toString(), owner: toArray(note.owner) },
    spendNoteNonce: toArray(note.nonce),
    spendNotePath: notePath(sim, note),
    offerData: {
      side: offer.side.toString(),
      baseAmount: offer.baseAmount.toString(),
      quoteAmount: offer.quoteAmount.toString(),
      maker: toArray(offer.maker),
      payNonce: toArray(offer.payNonce),
    },
    offerRand: toArray(offerRand),
    freshNonce: toArray(changeNonce),
  });
  return { sim: next, offer, offerRand, change };
}

export function offerPath(sim: Sim, offer: Offer, rand: Uint8Array): JsonPath {
  const c = pureCircuits.offerCommitment(offer, rand);
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
  offer: Offer;
  offerRand: Uint8Array;
  nowBound: bigint;
  auditSeed?: Uint8Array;
  getNonce?: Uint8Array;
  nextStateNonce?: Uint8Array;
};

export function fill(sim: Sim, args: FillArgs): Sim {
  const seed = args.auditSeed ?? randomBytes32();
  const getNonce = args.getNonce ?? randomBytes32();
  const nextStateNonce = args.nextStateNonce ?? randomBytes32();
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
    offerData: {
      side: args.offer.side.toString(),
      baseAmount: args.offer.baseAmount.toString(),
      quoteAmount: args.offer.quoteAmount.toString(),
      maker: toArray(args.offer.maker),
      payNonce: toArray(args.offer.payNonce),
    },
    offerRand: toArray(args.offerRand),
    offerPath: offerPath(sim, args.offer, args.offerRand),
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
