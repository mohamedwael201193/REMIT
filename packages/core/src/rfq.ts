import { randomBytes32, toHex } from "./bytes.js";
import { RemitError } from "./errors.js";
import { openJson, sealJson } from "./box.js";
import type { JsonOffer } from "./state.js";

export type SealedRfqOffer = {
  v: 1;
  kind: "offer";
  nonce: string;
  expiresAt: number;
  recipientBinding: string;
  offer: JsonOffer;
  offerRand: number[];
};

export type SealedMandateHint = {
  v: 1;
  kind: "mandate";
  nonce: string;
  expiresAt: number;
  recipientBinding: string;
  mandateId: number[];
};

export type SealedReceipt = {
  v: 1;
  kind: "receipt";
  nonce: string;
  fillTx?: string;
  auditRootHex?: string;
  ok: boolean;
  reason?: string;
};

const seen = new Set<string>();

export function makeOfferBox(
  recipientPubHex: string,
  offer: JsonOffer,
  offerRand: number[],
  ttlMs = 15 * 60_000,
): { boxed: string; nonce: string } {
  const nonce = toHex(randomBytes32());
  const payload: SealedRfqOffer = {
    v: 1,
    kind: "offer",
    nonce,
    expiresAt: Date.now() + ttlMs,
    recipientBinding: recipientPubHex,
    offer,
    offerRand,
  };
  return { boxed: sealJson(recipientPubHex, payload), nonce };
}

export function makeMandateBox(
  recipientPubHex: string,
  mandateId: number[],
  ttlMs = 15 * 60_000,
): { boxed: string; nonce: string } {
  const nonce = toHex(randomBytes32());
  const payload: SealedMandateHint = {
    v: 1,
    kind: "mandate",
    nonce,
    expiresAt: Date.now() + ttlMs,
    recipientBinding: recipientPubHex,
    mandateId,
  };
  return { boxed: sealJson(recipientPubHex, payload), nonce };
}

export function openMandateBox(secretHex: string, boxed: string, expectedPubHex: string): SealedMandateHint {
  const obj = openJson<SealedMandateHint>(secretHex, boxed);
  if (obj.v !== 1 || obj.kind !== "mandate") throw new RemitError("SEALED_BOX", "not a mandate box");
  if (obj.expiresAt < Date.now()) throw new RemitError("SEALED_BOX", "expired box");
  if (obj.recipientBinding !== expectedPubHex) throw new RemitError("SEALED_BOX", "recipient mismatch");
  if (seen.has(obj.nonce)) throw new RemitError("SEALED_BOX", "replayed nonce");
  seen.add(obj.nonce);
  return obj;
}

export function openOfferBox(secretHex: string, boxed: string, expectedPubHex: string): SealedRfqOffer {
  const obj = openJson<SealedRfqOffer>(secretHex, boxed);
  if (obj.v !== 1 || obj.kind !== "offer") throw new RemitError("SEALED_BOX", "not an offer box");
  if (obj.expiresAt < Date.now()) throw new RemitError("SEALED_BOX", "expired box");
  if (obj.recipientBinding !== expectedPubHex) throw new RemitError("SEALED_BOX", "recipient mismatch");
  if (seen.has(obj.nonce)) throw new RemitError("SEALED_BOX", "replayed nonce");
  seen.add(obj.nonce);
  return obj;
}

export function rememberNonce(nonce: string): void {
  if (seen.has(nonce)) throw new RemitError("SEALED_BOX", "replayed nonce");
  seen.add(nonce);
}

export function hasNonce(nonce: string): boolean {
  return seen.has(nonce);
}

/** What the executor can see after unsealing: the openings it was given. Matching is not MPC. */
export const EXECUTOR_VISIBILITY = {
  model: "constrained-broker",
  mpc: false,
  sees: [
    "offer side/amounts/maker/payNonce (opening)",
    "offer randomness",
    "mandate openings it is given by the principal",
    "public ledger commitments/nullifiers/auditRoot",
  ],
  neverStoredOnApi: ["plaintext openings", "witnesses", "salts after process exit"],
} as const;
