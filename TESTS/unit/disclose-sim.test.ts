// discloseField selective-audit circuit — simulator tests (Wave 2 N1).
//
// Drives the COMPILED remit_quote contract through @midnight-ntwrk/compact-runtime,
// asserting REAL state. No JS mirrors of the circuit: the circuit's in-circuit
// recomputation (salts/commitments/auditRoot/nullifier) is verified by comparing
// the ON-LEDGER nullifier against an off-chain recomputation built on the
// COMPILED pool pureCircuits + the runtime's persistentHash/persistentCommit.
//
// Circuit (CONTRACT/src/remit_quote.compact, final per c1.done):
//   discloseField(fieldSelector: Uint<8>, auditorKey: Bytes<32>, sealedBox: Bytes<160>): []
//   witnesses: disclosureSeed/disclosureSide/disclosureBaseAmount/disclosureQuoteAmount/
//              disclosurePrincipal/disclosureCounterparty/disclosureMandateId (+ callerSecret)
//   ledger: disclosureNullifiers: Set<Bytes<32>>  (the ledger-write boundary)
//   nullifier = persistentHash([pad(32,"remit:dnull"), commitment, auditorKey])
//   asserts: "bad field selector" / "disclosure already recorded"; proof:true.
//
// Encryption is the HONEST HYBRID (no in-circuit cipher in Compact 0.31.1):
// the sealedBox is built OFF-CIRCUIT with the repo's real RMTB1 pattern
// (X25519 ECDH + XChaCha20-Poly1305, box.ts) via the shared sealDisclosureBox()
// helper; the circuit discloses the box verbatim and makes NO claim about its
// contents — a discloser who seals a different value is DETECTED by the auditor
// (commitment recompute mismatch), not prevented. Stated plainly per Jay.
//
// Test plan:
//  1. proof:false regression — contract-info.json (REAL compiler output) lists
//     discloseField with proof:true (NightHire failure mode).
//  2. Happy path — one REAL pool fill (known auditSeed) yields a real auditRoot;
//     disclose mandateId (Bytes<32>) to an auditorKey: commitment binding holds
//     (on-ledger nullifier == off-chain Hash(commitment||auditorKey)), nullifier
//     written, ciphertext disclosed (!= plaintext), auditor decrypts and recovers
//     the field, plaintext field/salt/seed appear NOWHERE in public outputs.
//  3. Numeric field path — baseAmount (Uint<64>) with big-endian-32 box encoding.
//  4. Refusals — bad selector; replayed disclosure ("disclosure already recorded");
//     same field to another auditor key is a distinct disclosure (key-bound nullifier).
//  5. Detection — forged sealed box is caught by the auditor's recompute;
//     wrong auditor secret cannot open the box.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import {
  CompactTypeBytes,
  CompactTypeVector,
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  persistentHash,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger } from "../../CONTRACT/managed/remit_quote/contract/index.js";
import { pureCircuits as poolPure } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import {
  randomBytes32,
  toArray,
  toHex,
  fromHex,
  bytesEq,
  toBase64Url,
} from "../../packages/core/src/bytes.ts";
import { assertAbsent } from "../../packages/core/src/privacy.ts";
import {
  bootPool,
  deposit,
  placeOffer,
  createMandate,
  fill,
  publicLedger,
  expectCompactFail,
} from "../../packages/core/src/sim.ts";
import {
  auditCommitments,
  auditRoot,
  commitBytes32,
  commitUint64,
} from "../../packages/core/src/audit.ts";
import { openSealed, rfqKeyPair } from "../../packages/core/src/box.ts";
import {
  quoteWitnesses,
  stageQuoteDisclosure,
  sealDisclosureBox,
  disclosureCallArgs,
  disclosureSalt,
  encodeFieldValue32,
  DISCLOSE_FIELDS,
  type QuotePrivateState,
  type DiscloseField,
} from "../../packages/core/src/quote-witnesses.ts";

const CPK = "11".repeat(32);
const B32 = new CompactTypeBytes(32);
const VEC3_B32 = new CompactTypeVector(3, B32);

function pad32(s: string): Uint8Array {
  const out = new Uint8Array(32);
  const b = Buffer.from(s, "utf8");
  if (b.length > 32) throw new Error("pad32 overflow");
  out.set(b, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Fixture: one REAL pool fill with a known auditSeed.
// ---------------------------------------------------------------------------
type FillFixture = {
  poolSim: ReturnType<typeof bootPool>;
  seed: Uint8Array;
  values: {
    side: bigint;
    baseAmount: bigint;
    quoteAmount: bigint;
    principal: Uint8Array;
    counterparty: Uint8Array;
    mandateId: Uint8Array;
  };
  commits: Uint8Array[];
  onChainRoot: Uint8Array;
};

function realFill(): FillFixture {
  const principalSk = randomBytes32();
  const makerSk = randomBytes32();
  const esk = randomBytes32();
  const seed = randomBytes32();
  let sim = bootPool();
  const dP = deposit(sim, principalSk, 0n, 100n);
  sim = dP.sim;
  const dM = deposit(sim, makerSk, 1n, 5000n);
  sim = dM.sim;
  const maker = poolPure.ownerKey(makerSk);
  const offer = { side: 1n, baseAmount: 40n, quoteAmount: 1280n, maker, payNonce: randomBytes32() };
  const placed = placeOffer(sim, makerSk, dM.note, offer);
  sim = placed.sim;
  const mandate = {
    principal: poolPure.ownerKey(principalSk),
    executor: poolPure.executorKey(esk),
    side: 0n,
    maxFillBase: 50n,
    limitNum: 30n,
    limitDen: 1000n,
    cpRoot: 0n,
    expiry: 4_000_000_000n,
    mandateId: randomBytes32(),
  };
  const created = createMandate(sim, principalSk, dP.note, mandate);
  sim = created.sim;
  sim = fill(sim, {
    esk,
    mandate,
    mandateRand: created.mandateRand,
    remaining: 100n,
    stateNonce: created.stateNonce,
    offer,
    offerRand: placed.offerRand,
    nowBound: 1_800_000_000n,
    auditSeed: seed,
  });
  const head = publicLedger(sim).auditRoots.head() as unknown as { is_some: boolean; value: Uint8Array };
  if (!head.is_some) throw new Error("no auditRoot on ledger after fill");
  const values = {
    side: 1n,
    baseAmount: 40n,
    quoteAmount: 1280n,
    principal: mandate.principal,
    counterparty: maker,
    mandateId: mandate.mandateId,
  };
  const commits = auditCommitments(seed, values);
  return { poolSim: sim, seed, values, commits, onChainRoot: head.value };
}

// ---------------------------------------------------------------------------
// Quote harness (shared witnesses + helpers from quote-witnesses.ts).
// ---------------------------------------------------------------------------
function bootQuote() {
  const contract = new Contract(quoteWitnesses);
  const ps: QuotePrivateState = { version: 1, callerSk: toArray(randomBytes32()) };
  const built = contract.initialState(createConstructorContext(ps, CPK));
  const ctx = createCircuitContext(
    dummyContractAddress(),
    CPK,
    built.currentContractState,
    built.currentPrivateState,
  );
  return { contract, ctx };
}

type QuoteSim = ReturnType<typeof bootQuote>;

function stagedFor(fx: FillFixture) {
  return {
    disclosureSeed: toArray(fx.seed),
    disclosureSide: fx.values.side,
    disclosureBaseAmount: fx.values.baseAmount,
    disclosureQuoteAmount: fx.values.quoteAmount,
    disclosurePrincipal: toArray(fx.values.principal),
    disclosureCounterparty: toArray(fx.values.counterparty),
    disclosureMandateId: toArray(fx.values.mandateId),
  };
}

function callDiscloseField(
  q: QuoteSim,
  fx: FillFixture,
  field: DiscloseField,
  auditorKey: Uint8Array,
  sealedBox: Uint8Array,
): QuoteSim {
  const ps = stageQuoteDisclosure(q.ctx.currentPrivateState as QuotePrivateState, stagedFor(fx));
  const ctx = { ...q.ctx, currentPrivateState: ps };
  const args = disclosureCallArgs({ field, auditorKey, sealedBox });
  const out = q.contract.impureCircuits.discloseField(ctx, args.fieldSelector, args.auditorKey, args.sealedBox);
  return { ...q, ctx: out.context };
}

function expectedNullifier(commitment: Uint8Array, auditorKey: Uint8Array): Uint8Array {
  return persistentHash(VEC3_B32, [pad32("remit:dnull"), commitment, auditorKey]);
}

function quotePublicDump(q: QuoteSim): { text: string; hex: string } {
  const qc = q.ctx.currentQueryContext;
  const ld = ledger(qc.state);
  const chunks: string[] = [String(ld.minted)];
  for (const c of ld.claims) chunks.push(toHex(c));
  for (const n of ld.disclosureNullifiers) chunks.push(toHex(n));
  const text = [qc.toString(true), (qc.state as any).toString(true), chunks.join("\n")].join("\n");
  return { text, hex: Buffer.from(text, "utf8").toString("hex") };
}

function poolPublicDump(poolSim: FillFixture["poolSim"]): { text: string; hex: string } {
  const qc = poolSim.ctx.currentQueryContext;
  const text = [qc.toString(true), (qc.state as any).toString(true)].join("\n");
  return { text, hex: Buffer.from(text, "utf8").toString("hex") };
}

// ---------------------------------------------------------------------------
describe("discloseField selective-audit circuit (Wave 2 N1)", () => {
  let fx: FillFixture;
  beforeAll(() => {
    fx = realFill();
    // Binding-sync cross-check: the off-chain scheme (COMPILED pool pureCircuits +
    // runtime persistentCommit) reproduces the REAL on-ledger auditRoot exactly.
    // Any drift between the pool scheme and the circuit's inlined scheme breaks this.
    expect(bytesEq(auditRoot(fx.commits), fx.onChainRoot)).toBe(true);
    expect(DISCLOSE_FIELDS.length).toBe(6);
  });

  it("compiler proves discloseField (proof:true — NightHire regression)", () => {
    const info = JSON.parse(
      readFileSync(
        new URL("../../CONTRACT/managed/remit_quote/compiler/contract-info.json", import.meta.url),
        "utf8",
      ),
    ) as {
      "compiler-version": string;
      circuits: Array<{ name: string; proof: boolean }>;
    };
    expect(info["compiler-version"]).toMatch(/^0\.31\./);
    const dc = info.circuits.find((c) => c.name === "discloseField");
    expect(dc, "discloseField present in compiler output").toBeDefined();
    expect(dc!.proof).toBe(true);
  });

  it("happy path: disclose mandateId to auditorKey — binding holds, nullifier written, ciphertext disclosed, plaintext nowhere on ledger", () => {
    const field: DiscloseField = "mandateId";
    const IDX = DISCLOSE_FIELDS.indexOf(field);
    const value = fx.values.mandateId; // Bytes<32>: 32 random bytes, strongest absence check
    const salt = disclosureSalt(fx.seed, field);
    expect(bytesEq(fx.commits[IDX], commitBytes32(value, salt))).toBe(true);

    const auditor = rfqKeyPair();
    const auditorKey = fromHex(auditor.publicHex);
    const sealedBox = sealDisclosureBox({ auditorKeyPubHex: auditor.publicHex, seed: fx.seed, field, value });
    expect(sealedBox.length).toBe(160);

    const q1 = callDiscloseField(bootQuote(), fx, field, auditorKey, sealedBox);

    // Nullifier written: exactly one entry, and it equals
    // Hash(commitment || auditorKey) recomputed off-chain — proving the circuit's
    // IN-CIRCUIT recomputation (salts + commitments under the pool scheme) matches.
    const ld = ledger(q1.ctx.currentQueryContext.state);
    expect(ld.disclosureNullifiers.size()).toBe(1n);
    const nul = expectedNullifier(fx.commits[IDX], auditorKey);
    expect(ld.disclosureNullifiers.member(nul)).toBe(true);

    // Ciphertext disclosed — and it is NOT the plaintext (ciphertext!=plaintext regression).
    // The real RMTB1 box is the first 141 bytes; the rest is zero padding.
    const box141 = sealedBox.subarray(0, 141);
    expect(bytesEq(box141.subarray(0, 5), Buffer.from("RMTB1"))).toBe(true);
    const pt = new Uint8Array(64);
    pt.set(encodeFieldValue32(field, value), 0);
    pt.set(salt, 32);
    expect(bytesEq(box141, pt)).toBe(false);

    // The auditor — and ONLY the auditor — recovers the field from the disclosed box,
    // then recomputes the commitment exactly as the on-ledger value.
    const opened = openSealed(auditor.secretHex, toBase64Url(box141));
    expect(opened.length).toBe(64);
    expect(bytesEq(opened.subarray(0, 32), value)).toBe(true);
    expect(bytesEq(opened.subarray(32, 64), salt)).toBe(true);
    expect(bytesEq(commitBytes32(opened.subarray(0, 32), opened.subarray(32, 64)), fx.commits[IDX])).toBe(true);

    // Plaintext field appears NOWHERE in public outputs (hex + base64 at minimum;
    // assertAbsent also covers HEX / decimal / base64url / LE-uint64).
    // auditorKey + fieldSelector are PUBLIC METADATA by spec — not asserted absent.
    // The sealed box, commitment, nullifier are public BY DESIGN — not asserted absent.
    const qd = quotePublicDump(q1);
    const pd = poolPublicDump(fx.poolSim);
    const hay = [qd.text, qd.hex, pd.text, pd.hex].join("\n");
    assertAbsent(hay, [value], "disclose-plaintext-field");
    assertAbsent(hay, [salt], "disclose-field-salt");
    assertAbsent(hay, [fx.seed], "disclose-audit-seed");
  });

  it("numeric field path: disclose baseAmount (Uint<64>) with big-endian-32 encoding", () => {
    const field: DiscloseField = "baseAmount";
    const IDX = DISCLOSE_FIELDS.indexOf(field);
    const value = fx.values.baseAmount;
    const salt = disclosureSalt(fx.seed, field);
    expect(bytesEq(fx.commits[IDX], commitUint64(value, salt))).toBe(true);

    const auditor = rfqKeyPair();
    const auditorKey = fromHex(auditor.publicHex);
    const sealedBox = sealDisclosureBox({ auditorKeyPubHex: auditor.publicHex, seed: fx.seed, field, value });

    const q1 = callDiscloseField(bootQuote(), fx, field, auditorKey, sealedBox);
    const ld = ledger(q1.ctx.currentQueryContext.state);
    expect(ld.disclosureNullifiers.member(expectedNullifier(fx.commits[IDX], auditorKey))).toBe(true);

    const opened = openSealed(auditor.secretHex, toBase64Url(sealedBox.subarray(0, 141)));
    const v32 = opened.subarray(0, 32);
    // right-aligned big-endian: leading 24 bytes zero, value in the last 8
    expect(bytesEq(v32.subarray(0, 24), new Uint8Array(24))).toBe(true);
    const decoded = BigInt("0x" + toHex(v32.subarray(24, 32)));
    expect(decoded).toBe(value);
    expect(bytesEq(commitUint64(decoded, opened.subarray(32, 64)), fx.commits[IDX])).toBe(true);

    const qd = quotePublicDump(q1);
    const pd = poolPublicDump(fx.poolSim);
    assertAbsent([qd.text, qd.hex, pd.text, pd.hex].join("\n"), [salt], "disclose-numeric-salt");
  });

  it("refusal: bad field selector fails in-circuit", () => {
    const auditor = rfqKeyPair();
    const sealedBox = sealDisclosureBox({
      auditorKeyPubHex: auditor.publicHex,
      seed: fx.seed,
      field: "mandateId",
      value: fx.values.mandateId,
    });
    const q = bootQuote();
    const ps = stageQuoteDisclosure(q.ctx.currentPrivateState as QuotePrivateState, stagedFor(fx));
    const ctx = { ...q.ctx, currentPrivateState: ps };
    expectCompactFail(
      () => q.contract.impureCircuits.discloseField(ctx, 6n, fromHex(auditor.publicHex), sealedBox),
      "bad field selector",
    );
  });

  it("refusal: replayed disclosure fails on the nullifier; same field to another auditor is a distinct disclosure", () => {
    const field: DiscloseField = "mandateId";
    const IDX = DISCLOSE_FIELDS.indexOf(field);
    const auditor = rfqKeyPair();
    const auditorKey = fromHex(auditor.publicHex);
    const sealedBox = sealDisclosureBox({
      auditorKeyPubHex: auditor.publicHex,
      seed: fx.seed,
      field,
      value: fx.values.mandateId,
    });

    const q1 = callDiscloseField(bootQuote(), fx, field, auditorKey, sealedBox);
    // Replay with a FRESH box (new random nonce) — the nullifier is identical, must refuse.
    const box2 = sealDisclosureBox({
      auditorKeyPubHex: auditor.publicHex,
      seed: fx.seed,
      field,
      value: fx.values.mandateId,
    });
    expectCompactFail(() => callDiscloseField(q1, fx, field, auditorKey, box2), "disclosure already recorded");

    // Same field disclosed to a DIFFERENT auditor key: distinct nullifier, allowed.
    const auditor2 = rfqKeyPair();
    const key2 = fromHex(auditor2.publicHex);
    const box3 = sealDisclosureBox({
      auditorKeyPubHex: auditor2.publicHex,
      seed: fx.seed,
      field,
      value: fx.values.mandateId,
    });
    const q2 = callDiscloseField(q1, fx, field, key2, box3);
    const ld = ledger(q2.ctx.currentQueryContext.state);
    expect(ld.disclosureNullifiers.size()).toBe(2n);
    expect(ld.disclosureNullifiers.member(expectedNullifier(fx.commits[IDX], key2))).toBe(true);
  });

  it("detection (not prevention): forged sealed box is caught by the auditor's recompute", () => {
    // The circuit makes NO claim about box contents (honest hybrid, documented non-claim).
    // A discloser who seals a different value is DETECTED: the auditor's recomputed
    // commitment will not match the on-ledger disclosed commitment.
    const field: DiscloseField = "mandateId";
    const IDX = DISCLOSE_FIELDS.indexOf(field);
    const auditor = rfqKeyPair();
    const auditorKey = fromHex(auditor.publicHex);
    const forged = randomBytes32();
    const sealedBox = sealDisclosureBox({ auditorKeyPubHex: auditor.publicHex, seed: fx.seed, field, value: forged });
    const q1 = callDiscloseField(bootQuote(), fx, field, auditorKey, sealedBox);

    const opened = openSealed(auditor.secretHex, toBase64Url(sealedBox.subarray(0, 141)));
    const recomputed = commitBytes32(opened.subarray(0, 32), opened.subarray(32, 64));
    // Auditor detects: recomputed commitment != the commitment the nullifier binds.
    const ld = ledger(q1.ctx.currentQueryContext.state);
    expect(ld.disclosureNullifiers.member(expectedNullifier(recomputed, auditorKey))).toBe(false);
    expect(ld.disclosureNullifiers.member(expectedNullifier(fx.commits[IDX], auditorKey))).toBe(true);
  });

  it("wrong auditor secret cannot open the sealed box", () => {
    const auditor = rfqKeyPair();
    const other = rfqKeyPair();
    const sealedBox = sealDisclosureBox({
      auditorKeyPubHex: auditor.publicHex,
      seed: fx.seed,
      field: "mandateId",
      value: fx.values.mandateId,
    });
    const box141 = sealedBox.subarray(0, 141);
    expect(() => openSealed(other.secretHex, toBase64Url(box141))).toThrow(/unseal failed/);
    // ...but the intended auditor can.
    expect(openSealed(auditor.secretHex, toBase64Url(box141)).length).toBe(64);
  });
});
