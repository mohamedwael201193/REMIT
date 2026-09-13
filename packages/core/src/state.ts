import { sha256 } from "@noble/hashes/sha256";
import { fromHex, toHex } from "./bytes.js";

export const ASSET_NIGHT = 0n;
export const ASSET_QUOTE = 1n;
export const SIDE_SELL_BASE = 0n;
export const SIDE_BUY_BASE = 1n;

export type OwnedNoteLike = {
  asset: bigint;
  amount: bigint;
  owner: Uint8Array;
};

export type OwnedNote = OwnedNoteLike & { nonce: Uint8Array };

export type JsonNote = {
  asset: string;
  amount: string;
  owner: number[];
  nonce: number[];
  leafIndex?: string;
};

export type JsonOffer = {
  side: string;
  baseAmount: string;
  quoteAmount: string;
  maker: number[];
  payNonce: number[];
};

export type JsonMandate = {
  principal: number[];
  executor: number[];
  side: string;
  maxFillBase: string;
  limitNum: string;
  limitDen: string;
  cpRoot: string;
  expiry: string;
  mandateId: number[];
};

export type JsonMandateState = {
  mandateId: number[];
  remaining: string;
};

export type JsonPath = {
  leaf: number[];
  path: { sibling: { field: string }; goes_left: boolean }[];
};

export type PendingWitness = {
  ownerSecret?: number[];
  executorSecret?: number[];
  freshNonce?: number[];
  freshNonce2?: number[];
  spendNote?: { asset: string; amount: string; owner: number[] };
  spendNoteNonce?: number[];
  spendNotePath?: JsonPath;
  offerData?: JsonOffer;
  offerRand?: number[];
  offerPath?: JsonPath;
  mandateData?: JsonMandate;
  mandateRand?: number[];
  mandatePath?: JsonPath;
  mandateStateData?: JsonMandateState;
  mandateStateNonce?: number[];
  mandateStatePath?: JsonPath;
  counterpartyPath?: JsonPath;
  auditSeed?: number[];
  withdrawTo?: { is_left: boolean; left: number[]; right: number[] };
};

export type RemitPrivateState = {
  version: 1;
  namespace: string;
  ownerSk?: number[];
  executorSk?: number[];
  notes: JsonNote[];
  offers: { offer: JsonOffer; rand: number[]; leafIndex?: string }[];
  mandates: { mandate: JsonMandate; rand: number[]; leafIndex?: string }[];
  mandateStates: { state: JsonMandateState; nonce: number[]; leafIndex?: string }[];
  receipts: Record<string, unknown>[];
  disclosure: Record<string, unknown>[];
  pending: PendingWitness;
};

export function emptyPrivateState(namespace: string): RemitPrivateState {
  return {
    version: 1,
    namespace,
    notes: [],
    offers: [],
    mandates: [],
    mandateStates: [],
    receipts: [],
    disclosure: [],
    pending: {},
  };
}

export function walletNamespace(network: string, address: string, contract: string): string {
  return toHex(sha256(new TextEncoder().encode(`${network}|${address}|${contract}`)));
}

export function requirePending<T>(v: T | undefined, name: string): T {
  if (v === undefined) {
    throw new Error(`witness '${name}' was not staged`);
  }
  return v;
}

export function hex32(n: number[]): Uint8Array {
  if (n.length !== 32) throw new Error("expected 32 bytes");
  return Uint8Array.from(n);
}

export function quoteColorPlaceholder(): Uint8Array {
  return fromHex("00".repeat(32));
}

export { toHex, fromHex };
