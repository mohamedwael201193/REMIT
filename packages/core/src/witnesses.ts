import type { Witnesses, Note, Offer, Mandate, MandateState } from "@remit/contracts/pool";
import { RemitError } from "./errors.js";
import { fromArray } from "./bytes.js";
import { requirePending, type RemitPrivateState, type JsonPath } from "./state.js";

function b(a: number[]): Uint8Array {
  return fromArray(a);
}

function path(p: JsonPath) {
  return {
    leaf: b(p.leaf),
    path: p.path.map((e) => ({
      sibling: { field: BigInt(e.sibling.field) },
      goes_left: e.goes_left,
    })),
  };
}

function note(n: { asset: string; amount: string; owner: number[] }): Note {
  return { asset: BigInt(n.asset), amount: BigInt(n.amount), owner: b(n.owner) };
}

function offer(o: {
  side: string;
  baseAmount: string;
  quoteAmount: string;
  maker: number[];
  payNonce: number[];
}): Offer {
  return {
    side: BigInt(o.side),
    baseAmount: BigInt(o.baseAmount),
    quoteAmount: BigInt(o.quoteAmount),
    maker: b(o.maker),
    payNonce: b(o.payNonce),
  };
}

function mandate(m: RemitPrivateState["pending"]["mandateData"]): Mandate {
  const x = requirePending(m, "mandateData");
  return {
    principal: b(x.principal),
    executor: b(x.executor),
    side: BigInt(x.side),
    maxFillBase: BigInt(x.maxFillBase),
    limitNum: BigInt(x.limitNum),
    limitDen: BigInt(x.limitDen),
    cpRoot: BigInt(x.cpRoot),
    expiry: BigInt(x.expiry),
    mandateId: b(x.mandateId),
  };
}

function mandateState(s: RemitPrivateState["pending"]["mandateStateData"]): MandateState {
  const x = requirePending(s, "mandateStateData");
  return { mandateId: b(x.mandateId), remaining: BigInt(x.remaining) };
}

export const witnesses: Witnesses<RemitPrivateState> = {
  ownerSecret: ({ privateState }) => {
    const sk = privateState?.pending?.ownerSecret ?? privateState?.ownerSk;
    if (!sk) throw new RemitError("WITNESS_MISSING", "owner secret not staged");
    return [privateState, b(sk)];
  },
  executorSecret: ({ privateState }) => {
    const sk = privateState?.pending?.executorSecret ?? privateState?.executorSk;
    if (!sk) throw new RemitError("WITNESS_MISSING", "executor secret not staged");
    return [privateState, b(sk)];
  },
  freshNonce: ({ privateState }) => [
    privateState,
    b(requirePending(privateState.pending.freshNonce, "freshNonce")),
  ],
  freshNonce2: ({ privateState }) => [
    privateState,
    b(requirePending(privateState.pending.freshNonce2, "freshNonce2")),
  ],
  spendNote: ({ privateState }) => [
    privateState,
    note(requirePending(privateState.pending.spendNote, "spendNote")),
  ],
  spendNoteNonce: ({ privateState }) => [
    privateState,
    b(requirePending(privateState.pending.spendNoteNonce, "spendNoteNonce")),
  ],
  spendNotePath: ({ privateState }) => [
    privateState,
    path(requirePending(privateState.pending.spendNotePath, "spendNotePath")),
  ],
  offerData: ({ privateState }) => [
    privateState,
    offer(requirePending(privateState.pending.offerData, "offerData")),
  ],
  offerRand: ({ privateState }) => [
    privateState,
    b(requirePending(privateState.pending.offerRand, "offerRand")),
  ],
  offerPath: ({ privateState }) => [
    privateState,
    path(requirePending(privateState.pending.offerPath, "offerPath")),
  ],
  mandateData: ({ privateState }) => [privateState, mandate(privateState.pending.mandateData)],
  mandateRand: ({ privateState }) => [
    privateState,
    b(requirePending(privateState.pending.mandateRand, "mandateRand")),
  ],
  mandatePath: ({ privateState }) => [
    privateState,
    path(requirePending(privateState.pending.mandatePath, "mandatePath")),
  ],
  mandateStateData: ({ privateState }) => [
    privateState,
    mandateState(privateState.pending.mandateStateData),
  ],
  mandateStateNonce: ({ privateState }) => [
    privateState,
    b(requirePending(privateState.pending.mandateStateNonce, "mandateStateNonce")),
  ],
  mandateStatePath: ({ privateState }) => [
    privateState,
    path(requirePending(privateState.pending.mandateStatePath, "mandateStatePath")),
  ],
  counterpartyPath: ({ privateState }) => {
    const p = privateState.pending.counterpartyPath;
    if (!p) {
      return [
        privateState,
        {
          leaf: new Uint8Array(32),
          path: Array.from({ length: 8 }, () => ({
            sibling: { field: 0n },
            goes_left: true,
          })),
        },
      ];
    }
    return [privateState, path(p)];
  },
  auditSeed: ({ privateState }) => [
    privateState,
    b(requirePending(privateState.pending.auditSeed, "auditSeed")),
  ],
  withdrawTo: ({ privateState }) => {
    const w = requirePending(privateState.pending.withdrawTo, "withdrawTo");
    return [
      privateState,
      {
        is_left: w.is_left,
        left: { bytes: b(w.left) },
        right: { bytes: b(w.right) },
      },
    ];
  },
};

export function stage(ps: RemitPrivateState, patch: RemitPrivateState["pending"]): RemitPrivateState {
  return { ...ps, pending: { ...ps.pending, ...patch } };
}

export function clearPending(ps: RemitPrivateState): RemitPrivateState {
  return { ...ps, pending: {} };
}
