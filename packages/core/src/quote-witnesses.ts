import type { Witnesses } from "@remit/contracts/quote";
import { pureCircuits } from "@remit/contracts/pool";
import { RemitError } from "./errors.js";
import { fromArray, fromBase64Url } from "./bytes.js";
import { sealTo } from "./box.js";

// ---------------------------------------------------------------------------
// discloseField() — Wave 2 selective disclosure, FINAL circuit (c1.done).
//
// Circuit: CONTRACT/src/remit_quote.compact
//   discloseField(fieldSelector: Uint<8>, auditorKey: Bytes<32>,
//                 sealedBox: Bytes<160>): []
//
// Honest hybrid (verified: Compact 0.31.1 has NO in-circuit cipher): the
// field is sealed OFF-CIRCUIT with the repo's real, tested RMTB1 pattern
// (X25519 ECDH + XChaCha20-Poly1305, box.ts `sealTo`) and passed in as an
// opaque PUBLIC argument disclosed verbatim; the circuit asserts
// authorization + binding + anti-replay only. It makes NO claim about the
// box's contents — the auditor decrypts off-chain and recomputes
// persistentCommit<type>(value, salt) against the disclosed commitment
// (discloser dishonesty is detected, not prevented).
//
// Witnesses (7) — the fill's audit seed + the six audit-field values, as
// committed by remit_pool's fill circuit (mirrors pool fill's audit vector).
// Selector order MUST match the circuit's c0..c5 and the pool's order:
//   0 side, 1 baseAmount, 2 quoteAmount, 3 principal, 4 counterparty, 5 mandateId.
//
// NOTE: these witness names must match the `witness ...(): ...;`
// declarations in CONTRACT/src/remit_quote.compact (CONTRACT-1, c1.done).
// Until CONTRACT-3 regenerates the managed artifacts, this object will NOT
// satisfy the stale generated Witnesses type (expected tsc failure — the
// stale type only knows callerSecret; see midnight-wave2/status).
//
// Witness values are UNTRUSTED input: they are staged by the local caller
// and asserted inside the circuit; they must never be used for caller
// verification (see MIDNIGHT-BUILD-GUIDE.md §5 item 1).
// ---------------------------------------------------------------------------

export const DISCLOSE_FIELDS = [
  "side",
  "baseAmount",
  "quoteAmount",
  "principal",
  "counterparty",
  "mandateId",
] as const;
export type DiscloseField = (typeof DISCLOSE_FIELDS)[number];

/** The sealedBox circuit argument is disclosed as Bytes<160>; the real RMTB1 box is 141 bytes. */
export const SEALED_BOX_ARG_BYTES = 160;

export type QuotePrivateState = {
  version: 1;
  callerSk?: number[];
  // ---- discloseField() staging ----
  /** Fill's audit seed (witness disclosureSeed). */
  disclosureSeed?: number[];
  /** Fill's audit vector (witnesses disclosureSide .. disclosureMandateId).
   *  baseAmount/quoteAmount are the FILLED amounts (fb/fq), not the offer's. */
  disclosureSide?: number | bigint;
  disclosureBaseAmount?: number | bigint;
  disclosureQuoteAmount?: number | bigint;
  disclosurePrincipal?: number[];
  disclosureCounterparty?: number[];
  disclosureMandateId?: number[];
};

function requireStagedBytes(v: number[] | undefined, name: string): number[] {
  if (!v) throw new RemitError("WITNESS_MISSING", `quote disclose value not staged: ${name}`);
  if (v.length !== 32) throw new RemitError("AUDIT", `quote disclose value ${name}: expected 32 bytes, got ${v.length}`);
  return v;
}

function requireStagedUint(v: number | bigint | undefined, name: string): bigint {
  if (v === undefined) throw new RemitError("WITNESS_MISSING", `quote disclose value not staged: ${name}`);
  const b = BigInt(v);
  if (b < 0n) throw new RemitError("AUDIT", `quote disclose value ${name}: negative`);
  return b;
}

export const quoteWitnesses: Witnesses<QuotePrivateState> = {
  callerSecret: ({ privateState }) => {
    if (!privateState?.callerSk) throw new RemitError("WITNESS_MISSING", "quote caller secret not staged");
    return [privateState, fromArray(privateState.callerSk)];
  },
  // --- discloseField() witnesses (FINAL circuit, CONTRACT-1 c1.done) ---
  disclosureSeed: ({ privateState }) => [
    privateState,
    fromArray(requireStagedBytes(privateState?.disclosureSeed, "disclosureSeed")),
  ],
  disclosureSide: ({ privateState }) => [
    privateState,
    requireStagedUint(privateState?.disclosureSide, "disclosureSide"),
  ],
  disclosureBaseAmount: ({ privateState }) => [
    privateState,
    requireStagedUint(privateState?.disclosureBaseAmount, "disclosureBaseAmount"),
  ],
  disclosureQuoteAmount: ({ privateState }) => [
    privateState,
    requireStagedUint(privateState?.disclosureQuoteAmount, "disclosureQuoteAmount"),
  ],
  disclosurePrincipal: ({ privateState }) => [
    privateState,
    fromArray(requireStagedBytes(privateState?.disclosurePrincipal, "disclosurePrincipal")),
  ],
  disclosureCounterparty: ({ privateState }) => [
    privateState,
    fromArray(requireStagedBytes(privateState?.disclosureCounterparty, "disclosureCounterparty")),
  ],
  disclosureMandateId: ({ privateState }) => [
    privateState,
    fromArray(requireStagedBytes(privateState?.disclosureMandateId, "disclosureMandateId")),
  ],
};

// ---------------------------------------------------------------------------
// Sealed-box builder (off-circuit hybrid half).
// ---------------------------------------------------------------------------

const isBytes32Field = (f: DiscloseField) => f === "principal" || f === "counterparty" || f === "mandateId";

/**
 * Encode a field value as value32: 32 bytes big-endian, right-aligned for
 * Uint<8>/Uint<64> (circuit: "Uint<8>/Uint<64> right-aligned, Bytes<32>
 * as-is"). Throws for out-of-range values — range is enforced off-circuit
 * so the box never carries a value the circuit would reject.
 */
export function encodeFieldValue32(field: DiscloseField, value: Uint8Array | number[] | number | bigint): Uint8Array {
  const out = new Uint8Array(32);
  if (isBytes32Field(field)) {
    const b = value instanceof Uint8Array ? value : fromArray(value as number[]);
    if (b.length !== 32) throw new RemitError("AUDIT", `disclose field ${field}: expected 32 bytes, got ${b.length}`);
    out.set(b);
    return out;
  }
  const v = BigInt(value as number | bigint);
  const max = field === "side" ? 255n : (1n << 64n) - 1n;
  if (v < 0n || v > max) throw new RemitError("AUDIT", `disclose field ${field}: out of range`);
  for (let i = 0; i < 8; i++) out[31 - i] = Number((v >> BigInt(i * 8)) & 0xffn);
  return out;
}

/**
 * salt32 = fieldSalt(seed, idx) under the pool's exact scheme, computed
 * off-circuit via the managed pool pure circuit (pool artifacts are current —
 * pool was untouched by CONTRACT-1). The salt MUST stay sealed: small fields
 * (side) are brute-forceable if the salt were public.
 */
export function disclosureSalt(seed: Uint8Array | number[], field: DiscloseField): Uint8Array {
  const idx = DISCLOSE_FIELDS.indexOf(field);
  if (idx < 0) throw new RemitError("AUDIT", `unknown disclose field: ${String(field)}`);
  return pureCircuits.fieldSalt(seed instanceof Uint8Array ? seed : fromArray(seed), BigInt(idx));
}

/**
 * Build the sealedBox PUBLIC ARGUMENT for discloseField():
 *   RMTB1 seal of plaintext value32 || salt32 (32B big-endian each),
 *   zero-padded to Bytes<160>.
 * Box layout: "RMTB1"(5) || ephPub(32) || nonce(24) || ct(80) = 141 bytes
 * (64B plaintext + 16B Poly1305 tag). Matches the circuit's documented
 * layout in remit_quote.compact's header.
 */
export function sealDisclosureBox(opts: {
  /** Recipient's X25519 public key, hex (the auditorKey the circuit will disclose). */
  auditorKeyPubHex: string;
  /** The fill's audit seed. */
  seed: Uint8Array | number[];
  field: DiscloseField;
  value: Uint8Array | number[] | number | bigint;
}): Uint8Array {
  const seedBytes = opts.seed instanceof Uint8Array ? opts.seed : fromArray(opts.seed);
  const plaintext = new Uint8Array(64);
  plaintext.set(encodeFieldValue32(opts.field, opts.value), 0);
  plaintext.set(disclosureSalt(seedBytes, opts.field), 32);
  const raw = fromBase64Url(sealTo(opts.auditorKeyPubHex, plaintext));
  if (raw.length > SEALED_BOX_ARG_BYTES) {
    throw new RemitError("SEALED_BOX", `sealed box ${raw.length}B exceeds Bytes<160>`);
  }
  const out = new Uint8Array(SEALED_BOX_ARG_BYTES);
  out.set(raw);
  return out;
}

/**
 * Build the PUBLIC ARGUMENTS for the discloseField circuit call, in the
 * circuit's exact parameter order: fieldSelector, auditorKey, sealedBox.
 */
export function disclosureCallArgs(opts: {
  field: DiscloseField;
  /** X25519 public key of the auditor — disclosed as public metadata by design. */
  auditorKey: Uint8Array | number[];
  /** Output of sealDisclosureBox, zero-padded to 160 bytes. */
  sealedBox: Uint8Array | number[];
}): { fieldSelector: bigint; auditorKey: Uint8Array; sealedBox: Uint8Array } {
  const idx = DISCLOSE_FIELDS.indexOf(opts.field);
  if (idx < 0) throw new RemitError("AUDIT", `unknown disclose field: ${String(opts.field)}`);
  const ak = opts.auditorKey instanceof Uint8Array ? opts.auditorKey : fromArray(opts.auditorKey);
  if (ak.length !== 32) throw new RemitError("AUDIT", `auditorKey must be 32 bytes, got ${ak.length}`);
  const box = opts.sealedBox instanceof Uint8Array ? opts.sealedBox : fromArray(opts.sealedBox);
  if (box.length !== SEALED_BOX_ARG_BYTES) {
    throw new RemitError("AUDIT", `sealedBox must be ${SEALED_BOX_ARG_BYTES} bytes, got ${box.length}`);
  }
  return { fieldSelector: BigInt(idx), auditorKey: ak, sealedBox: box };
}

// ---------------------------------------------------------------------------
// Staging helpers.
// ---------------------------------------------------------------------------

export type DisclosureStaging = {
  disclosureSeed: number[];
  disclosureSide: number | bigint;
  disclosureBaseAmount: number | bigint;
  disclosureQuoteAmount: number | bigint;
  disclosurePrincipal: number[];
  disclosureCounterparty: number[];
  disclosureMandateId: number[];
};

/** Stage one discloseField() call's private inputs into the quote private state. */
export function stageQuoteDisclosure(ps: QuotePrivateState, fields: DisclosureStaging): QuotePrivateState {
  return { ...ps, ...fields };
}

/** Clear staged discloseField() inputs after the call completes (hygiene: do not reuse audit values). */
export function clearQuoteDisclosure(ps: QuotePrivateState): QuotePrivateState {
  const {
    disclosureSeed: _s,
    disclosureSide: _side,
    disclosureBaseAmount: _b,
    disclosureQuoteAmount: _q,
    disclosurePrincipal: _p,
    disclosureCounterparty: _c,
    disclosureMandateId: _m,
    ...rest
  } = ps;
  void _s; void _side; void _b; void _q; void _p; void _c; void _m;
  return rest as QuotePrivateState;
}
