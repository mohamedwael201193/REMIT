/**
 * discloseField refusal paths + ciphertext!=plaintext regression (Wave 2 N3).
 *
 * Drives the REAL compiled `discloseField(fieldSelector, auditorKey, sealedBox)`
 * circuit in CONTRACT/managed/remit_quote through @midnight-ntwrk/compact-runtime
 * via the repo's own simulator harness (sim.ts) and witness/seal helpers
 * (quote-witnesses.ts). No JS mirrors of circuit logic: commitments/salts/roots
 * are recomputed with the repo's real primitives (pool pureCircuits.fieldSalt /
 * auditRootOf from the COMPILED pool contract, audit.ts persistentCommit
 * wrappers, compact-runtime persistentHash), and every recomputation is pinned
 * to the circuit's actual behavior by checking the nullifier the CIRCUIT wrote
 * to its ledger.
 *
 * Security model under test (see CONTRACT/src/remit_quote.compact N1 header):
 *  - the circuit recomputes the six field commitments + auditRoot in-circuit,
 *    discloses (root, commitment, fieldSelector, auditorKey, sealedBox) and
 *    writes the nullifier Hash(commitment || auditorKey) to disclosureNullifiers;
 *  - the sealed box is an OPAQUE public input (honest hybrid): sealing is
 *    off-circuit X25519+XChaCha20-Poly1305 (box.ts RMTB1); the circuit makes NO
 *    claim binding the box to the named auditorKey or to the committed field.
 *    Those bindings are auditor-detected, not circuit-prevented — tests (1) and
 *    (2) assert the DETECTION side rejects.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CompactError,
  persistentHash,
  CompactTypeBytes,
  CompactTypeVector,
} from "@midnight-ntwrk/compact-runtime";
import { pureCircuits as poolPure } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import {
  bootQuoteDisclose,
  discloseField as runDiscloseFieldCircuit,
  quotePublicLedger,
  type QuoteSim,
} from "../../packages/core/src/sim.ts";
import {
  DISCLOSE_FIELDS,
  sealDisclosureBox,
  encodeFieldValue32,
  disclosureSalt,
  disclosureCallArgs,
  type DiscloseField,
} from "../../packages/core/src/quote-witnesses.ts";
import { commitUint8, commitUint64, commitBytes32 } from "../../packages/core/src/audit.ts";
import { openSealed, rfqKeyPair } from "../../packages/core/src/box.ts";
import {
  randomBytes32,
  encodingsOfBytes,
  encodingsOfBigint,
  toHex,
  toBase64Url,
  fromHex,
} from "../../packages/core/src/bytes.ts";

// ---------------------------------------------------------------------------
// Binding-sync check (N3/J9): after artifact regen, the generated bindings'
// circuit IDs, witnesses and public argument signatures must match the
// discloseField design. Drift = a circuit renamed, removed, or re-signed in
// the Compact source without the callers being updated. Fail LOUD here.
// ---------------------------------------------------------------------------

const QUOTE_INFO = resolve(process.cwd(), "CONTRACT/managed/remit_quote/compiler/contract-info.json");
const QUOTE_SRC = resolve(process.cwd(), "CONTRACT/src/remit_quote.compact");

type ManifestCircuit = {
  name?: string;
  pure?: boolean;
  proof?: boolean;
  arguments?: { name?: string }[];
};
type Manifest = {
  circuits?: ManifestCircuit[];
  witnesses?: { name?: string }[];
  ledger?: { name?: string }[];
};

function readManifest(): Manifest {
  return JSON.parse(readFileSync(QUOTE_INFO, "utf8")) as Manifest;
}

describe("discloseField binding sync (artifact regen guard)", () => {
  it("generated artifacts expose discloseField(fieldSelector, auditorKey, sealedBox) + disclosureNullifiers", () => {
    const manifest = readManifest();
    const circuit = (manifest.circuits ?? []).find((c) => c.name === "discloseField");
    expect(circuit, "discloseField missing from regenerated contract-info.json").toBeDefined();
    expect(circuit!.pure).toBe(false);
    const argNames = (circuit!.arguments ?? []).map((a) => a?.name);
    expect(argNames).toEqual(["fieldSelector", "auditorKey", "sealedBox"]);

    const witnessNames = (manifest.witnesses ?? []).map((w) => w?.name);
    for (const w of [
      "disclosureSeed",
      "disclosureSide",
      "disclosureBaseAmount",
      "disclosureQuoteAmount",
      "disclosurePrincipal",
      "disclosureCounterparty",
      "disclosureMandateId",
    ]) {
      expect(witnessNames, `witness ${w} missing after regen`).toContain(w);
    }
    const ledgerNames = (manifest.ledger ?? []).map((l) => l?.name);
    expect(ledgerNames).toContain("disclosureNullifiers");
  });
});

// ---------------------------------------------------------------------------
// Harness.
// ---------------------------------------------------------------------------

type FillValues = {
  seed: Uint8Array;
  side: bigint;
  baseAmount: bigint;
  quoteAmount: bigint;
  principal: Uint8Array;
  counterparty: Uint8Array;
  mandateId: Uint8Array;
};

function freshFillValues(): FillValues {
  return {
    seed: randomBytes32(),
    side: 1n,
    baseAmount: 40n,
    quoteAmount: 1280n,
    principal: randomBytes32(),
    counterparty: randomBytes32(),
    mandateId: randomBytes32(),
  };
}

function valueForField(f: FillValues, field: DiscloseField): Uint8Array | bigint {
  switch (field) {
    case "side":
      return f.side;
    case "baseAmount":
      return f.baseAmount;
    case "quoteAmount":
      return f.quoteAmount;
    case "principal":
      return f.principal;
    case "counterparty":
      return f.counterparty;
    case "mandateId":
      return f.mandateId;
  }
}

const B32 = new CompactTypeBytes(32);
const VEC3_B32 = new CompactTypeVector(3, B32);

function pad32(s: string): Uint8Array {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(s));
  return out;
}

/** Recompute one field commitment with the REAL primitives (pool scheme). */
function fieldCommitment(field: DiscloseField, f: FillValues): Uint8Array {
  const salt = disclosureSalt(f.seed, field);
  const v = valueForField(f, field);
  if (field === "side") return commitUint8(v as bigint, salt);
  if (field === "baseAmount" || field === "quoteAmount") return commitUint64(v as bigint, salt);
  return commitBytes32(v as Uint8Array, salt);
}

/** Nullifier exactly as the circuit computes it: persistentHash(["remit:dnull", commitment, auditorKey]). */
function disclosureNullifier(commitment: Uint8Array, auditorKey: Uint8Array): Uint8Array {
  return persistentHash(VEC3_B32, [pad32("remit:dnull"), commitment, auditorKey]);
}

type SealedBox = {
  /** base64url RMTB1 box (auditor-side input) */
  b64: string;
  /** 160-byte zero-padded public circuit input */
  bytes160: Uint8Array;
};

/** Honest sealer via the repo's real sealDisclosureBox; also returns the auditor-side b64. */
function sealFieldBox(
  auditorPubHex: string,
  f: FillValues,
  field: DiscloseField,
  valueOverride?: Uint8Array | bigint,
): SealedBox {
  const bytes160 = sealDisclosureBox({
    auditorKeyPubHex: auditorPubHex,
    seed: f.seed,
    field,
    value: valueOverride ?? valueForField(f, field),
  });
  // The real RMTB1 box is 141 bytes; the rest of Bytes<160> is zero padding.
  const raw = bytes160.subarray(0, 141);
  expect(bytes160.subarray(141).every((b) => b === 0)).toBe(true);
  expect(raw[0]).toBe("R".charCodeAt(0)); // "RMTB1" magic intact
  return { b64: toBase64Url(raw), bytes160 };
}

type NullifierSet = {
  member(x: Uint8Array): boolean;
  size(): bigint;
  [Symbol.iterator](): Iterator<Uint8Array>;
};

function nullifiers(qsim: QuoteSim): NullifierSet {
  return (quotePublicLedger(qsim) as unknown as { disclosureNullifiers: NullifierSet }).disclosureNullifiers;
}

/** Run the REAL discloseField circuit through the sim harness. */
function disclose(
  qsim: QuoteSim,
  f: FillValues,
  field: DiscloseField,
  auditorKey: Uint8Array,
  box: SealedBox,
): QuoteSim {
  const args = disclosureCallArgs({ field, auditorKey, sealedBox: box.bytes160 });
  return runDiscloseFieldCircuit(qsim, args.fieldSelector, args.auditorKey, args.sealedBox, {
    callerSk: Array.from(randomBytes32()),
    seed: Array.from(f.seed),
    side: f.side,
    baseAmount: f.baseAmount,
    quoteAmount: f.quoteAmount,
    principal: Array.from(f.principal),
    counterparty: Array.from(f.counterparty),
    mandateId: Array.from(f.mandateId),
  });
}

function expectCompactFail(fn: () => unknown, needle: string): void {
  try {
    fn();
  } catch (e) {
    const msg = e instanceof CompactError || e instanceof Error ? e.message : String(e);
    expect(msg).toContain(needle);
    return;
  }
  throw new Error(`expected Compact failure containing "${needle}", but the circuit succeeded`);
}

/**
 * Auditor-side verification (the detection half of the honest hybrid):
 * decrypt the box, recompute persistentCommit(value, salt) with the salt
 * carried INSIDE the box, compare against the disclosed commitment.
 */
function auditorVerify(
  auditorSecretHex: string,
  boxB64: string,
  field: DiscloseField,
  disclosedCommitment: Uint8Array,
): { ok: boolean; reason: string } {
  let plaintext: Uint8Array;
  try {
    plaintext = openSealed(auditorSecretHex, boxB64);
  } catch (e) {
    return { ok: false, reason: `unseal: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (plaintext.length !== 64) return { ok: false, reason: `bad plaintext length ${plaintext.length}` };
  const value32 = plaintext.subarray(0, 32);
  const salt32 = plaintext.subarray(32, 64);
  let recomputed: Uint8Array;
  if (field === "side") recomputed = commitUint8(BigInt(`0x${toHex(value32)}`), salt32);
  else if (field === "baseAmount" || field === "quoteAmount")
    recomputed = commitUint64(BigInt(`0x${toHex(value32)}`), salt32);
  else recomputed = commitBytes32(value32, salt32);
  if (toHex(recomputed) !== toHex(disclosedCommitment)) {
    return { ok: false, reason: "commitment-mismatch: box plaintext does not match the disclosed commitment" };
  }
  return { ok: true, reason: "match" };
}

function containsSubsequence(hay: Uint8Array, needle: Uint8Array): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false;
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// (1) wrong auditor key -> reject (at unseal: a box sealed to A cannot be
// opened by B). The circuit itself does NOT bind box->key (explicit non-claim
// in the circuit header) — the refusal lives on the auditor side, tested here
// against the real seal/open path.
// ---------------------------------------------------------------------------

describe("discloseField refusal paths", () => {
  it("(1) wrong auditor key: a box sealed to A is rejected at unseal by B", () => {
    const a = rfqKeyPair();
    const b = rfqKeyPair();
    const f = freshFillValues();
    const field: DiscloseField = "baseAmount";
    const box = sealFieldBox(a.publicHex, f, field);

    // Circuit-level truth: the circuit does not bind the sealed box to the
    // named auditorKey (honest-hybrid non-claim) — the call naming the WRONG
    // key still executes and records B's nullifier. The protection is that
    // the resulting disclosure is unreadable to B.
    const wrongKey = fromHex(b.publicHex);
    const qsim = disclose(bootQuoteDisclose(), f, field, wrongKey, box);
    const nulB = disclosureNullifier(fieldCommitment(field, f), wrongKey);
    expect(nullifiers(qsim).member(nulB)).toBe(true);

    // Auditor side: B cannot open a box sealed to A -> REJECT.
    expect(() => openSealed(b.secretHex, box.b64)).toThrow(/unseal failed/);
    // Positive control: the right auditor opens it cleanly.
    const pt = openSealed(a.secretHex, box.b64);
    expect(pt.length).toBe(64);
    expect(toHex(pt.subarray(0, 32))).toBe(toHex(encodeFieldValue32(field, f.baseAmount)));
  });

  it("(2) forged field: box plaintext that does not match the disclosed commitment is rejected by auditor verification", () => {
    const auditor = rfqKeyPair();
    const f = freshFillValues();
    const field: DiscloseField = "baseAmount"; // witnesses commit 40
    const auditorKey = fromHex(auditor.publicHex);

    // FORGE: seal baseAmount = 999 while the witnesses commit baseAmount = 40.
    const forgedBox = sealFieldBox(auditor.publicHex, f, field, 999n);

    // Circuit-level truth: the sealed box is opaque to the circuit, so the
    // forged box still executes (detectable-not-preventable, per header).
    const qsim = disclose(bootQuoteDisclose(), f, field, auditorKey, forgedBox);
    const disclosedCommitment = fieldCommitment(field, f);
    const nul = disclosureNullifier(disclosedCommitment, auditorKey);
    // Pin: our recomputed commitment is what the circuit actually used —
    // the nullifier the CIRCUIT wrote matches, so the commitment matches.
    expect(nullifiers(qsim).member(nul)).toBe(true);

    // Auditor side: decrypted 999 does not recompute to the disclosed
    // commitment for 40 -> REJECT.
    const verdict = auditorVerify(auditor.secretHex, forgedBox.b64, field, disclosedCommitment);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("commitment-mismatch");

    // Positive control: the honest box verifies.
    const honestBox = sealFieldBox(auditor.publicHex, f, field);
    expect(auditorVerify(auditor.secretHex, honestBox.b64, field, disclosedCommitment).ok).toBe(true);
  });

  it("(3) replayed disclosure: the same nullifier twice is rejected by the circuit", () => {
    const auditor = rfqKeyPair();
    const f = freshFillValues();
    const field: DiscloseField = "quoteAmount";
    const auditorKey = fromHex(auditor.publicHex);
    const box = sealFieldBox(auditor.publicHex, f, field);

    const once = disclose(bootQuoteDisclose(), f, field, auditorKey, box);
    const nul = disclosureNullifier(fieldCommitment(field, f), auditorKey);
    expect(nullifiers(once).member(nul)).toBe(true);
    expect(nullifiers(once).size()).toBe(1n);

    // Replay the identical disclosure -> circuit assert fires.
    expectCompactFail(() => disclose(once, f, field, auditorKey, box), "disclosure already recorded");
    // Ledger unchanged by the failed replay.
    expect(nullifiers(once).size()).toBe(1n);
  });

  it("(5) selective per-auditor: disclosure to B after disclosure to A yields a distinct, valid nullifier", () => {
    const auditorA = rfqKeyPair();
    const auditorB = rfqKeyPair();
    const f = freshFillValues();
    const field: DiscloseField = "baseAmount";
    const keyA = fromHex(auditorA.publicHex);
    const keyB = fromHex(auditorB.publicHex);
    const boxA = sealFieldBox(auditorA.publicHex, f, field);
    const boxB = sealFieldBox(auditorB.publicHex, f, field);

    const afterA = disclose(bootQuoteDisclose(), f, field, keyA, boxA);
    const nulA = disclosureNullifier(fieldCommitment(field, f), keyA);
    expect(nullifiers(afterA).member(nulA)).toBe(true);

    // Same field to a second auditor: must succeed (selective disclosure),
    // with a nullifier distinct from A's.
    const afterB = disclose(afterA, f, field, keyB, boxB);
    const nulB = disclosureNullifier(fieldCommitment(field, f), keyB);
    expect(toHex(nulB)).not.toBe(toHex(nulA));
    expect(nullifiers(afterB).member(nulB)).toBe(true);
    expect(nullifiers(afterB).member(nulA)).toBe(true);
    expect(nullifiers(afterB).size()).toBe(2n);

    // And each auditor opens only their own box.
    expect(() => openSealed(auditorA.secretHex, boxB.b64)).toThrow(/unseal failed/);
    expect(() => openSealed(auditorB.secretHex, boxA.b64)).toThrow(/unseal failed/);
    expect(openSealed(auditorA.secretHex, boxA.b64).length).toBe(64);
    expect(openSealed(auditorB.secretHex, boxB.b64).length).toBe(64);
  });
});

// ---------------------------------------------------------------------------
// (4) CIPHERTEXT != PLAINTEXT regression (J9).
// If the circuit ever leaks a field's plaintext via disclose(), this fails:
// every disclosed byte-string must differ from every encoding of the field.
// The disclosed commitment/root/nullifier recomputations are pinned to the
// circuit by the nullifier the CIRCUIT wrote to disclosureNullifiers —
// membership proves our recomputed values equal the circuit's in-circuit
// values (same auditorKey, collision-resistant hash).
// ---------------------------------------------------------------------------

describe("discloseField ciphertext!=plaintext regression", () => {
  it("no disclosed byte-string equals any encoding of any disclosable field", () => {
    const auditor = rfqKeyPair();
    const auditorKey = fromHex(auditor.publicHex);

    for (const field of DISCLOSE_FIELDS) {
      const f = freshFillValues();
      const box = sealFieldBox(auditor.publicHex, f, field);
      const qsim = disclose(bootQuoteDisclose(), f, field, auditorKey, box);

      // Pin recomputations to the circuit: the nullifier the CIRCUIT wrote
      // must equal our recomputation.
      const commits = (DISCLOSE_FIELDS as readonly DiscloseField[]).map((fld) => fieldCommitment(fld, f));
      const root = poolPure.auditRootOf(commits as unknown as [
        Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array,
      ]);
      const nul = disclosureNullifier(fieldCommitment(field, f), auditorKey);
      expect(nullifiers(qsim).member(nul)).toBe(true);

      const disclosed: { label: string; bytes: Uint8Array }[] = [
        { label: "sealedBox", bytes: box.bytes160 },
        { label: "commitment", bytes: fieldCommitment(field, f) },
        { label: "auditRoot", bytes: root },
        { label: "nullifier", bytes: nul },
        { label: "auditorKey", bytes: auditorKey },
      ];
      const value32 = encodeFieldValue32(field, valueForField(f, field));
      const plaintextEncodings = new Set<string>(encodingsOfBytes(value32));
      const v = valueForField(f, field);
      if (typeof v === "bigint") {
        for (const e of encodingsOfBigint(v)) plaintextEncodings.add(e);
      }
      // Sanity: the encodings set is non-trivial (the check below is real).
      expect(plaintextEncodings.has(toHex(value32))).toBe(true);

      for (const { label, bytes } of disclosed) {
        const hex = toHex(bytes);
        expect(
          plaintextEncodings.has(hex),
          `field ${field}: disclosed ${label} equals a plaintext encoding`,
        ).toBe(false);
        expect(
          plaintextEncodings.has(hex.toUpperCase()),
          `field ${field}: disclosed ${label} equals an upper-case plaintext encoding`,
        ).toBe(false);
      }
      // Ciphertext must not even CONTAIN the raw field bytes (XChaCha20-Poly1305
      // output is indistinguishable from random; contained plaintext would
      // mean the "encryption" is broken or absent).
      expect(
        containsSubsequence(box.bytes160, value32),
        `field ${field}: sealed box contains raw field bytes`,
      ).toBe(false);
      // Positive control: the box is well-formed — the auditor recovers the
      // exact value32||salt32 the circuit's commitment binds.
      const pt = openSealed(auditor.secretHex, box.b64);
      expect(toHex(pt.subarray(0, 32))).toBe(toHex(value32));
      expect(toHex(pt.subarray(32, 64))).toBe(toHex(disclosureSalt(f.seed, field)));
    }
  });

  it("source guard: no disclose() site in discloseField leaks a witness-derived secret", () => {
    const src = readFileSync(QUOTE_SRC, "utf8");
    const bodyMatch = src.match(/export circuit discloseField\([\s\S]*?\n\}/);
    expect(bodyMatch, "discloseField circuit body not found in remit_quote.compact").toBeTruthy();
    const body = bodyMatch![0];
    const sites = [...body.matchAll(/disclose\(\s*([^();]+?)\s*\)/g)].map((m) => m[1]!.trim());
    expect(sites.length).toBeGreaterThan(0);
    // Allowlist: the only values this circuit may disclose. Anything else —
    // a witness call, a raw field, the seed — is a plaintext leak by construction.
    const allowed = new Set(["root", "commitment", "fieldSelector", "auditorKey", "sealedBox", "nul"]);
    const denied = [
      "disclosureSeed",
      "disclosureSide",
      "disclosureBaseAmount",
      "disclosureQuoteAmount",
      "disclosurePrincipal",
      "disclosureCounterparty",
      "disclosureMandateId",
    ];
    for (const site of sites) {
      expect(allowed.has(site), `disclose(${site}) is not an allowlisted public value`).toBe(true);
      for (const d of denied) {
        expect(site.includes(d), `disclose(${site}) leaks witness-derived secret ${d}`).toBe(false);
      }
    }
  });
});
