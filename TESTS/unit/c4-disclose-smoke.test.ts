import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Contract as PoolContract } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { Contract as QuoteContract } from "../../CONTRACT/managed/remit_quote/contract/index.js";
import { witnesses } from "../../packages/core/src/witnesses.ts";
import { sealDisclosureBox } from "../../packages/core/src/quote-witnesses.ts";
import { RemitError } from "../../packages/core/src/errors.ts";
import { randomBytes32, toArray, fromHex } from "../../packages/core/src/bytes.ts";
import { rfqKeyPair, openSealed } from "../../packages/core/src/box.ts";
import {
  CIRCUIT_BINDINGS,
  CIRCUIT_CALL_PATH,
  assertCircuitBindingsSynced,
  snapshotGeneratedBindings,
  submitDiscloseField,
  verifyGeneratedBindings,
} from "../../packages/core/src/tx.ts";
import {
  bootQuoteDisclose,
  discloseField,
  quoteDiscloseWitnesses,
  quotePublicLedger,
  type DiscloseStaged,
} from "../../packages/core/src/sim.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

function contractInfo(name: "remit_pool" | "remit_quote") {
  return JSON.parse(
    readFileSync(resolve(repoRoot, "CONTRACT", "managed", name, "compiler", "contract-info.json"), "utf8"),
  );
}

describe("CONTRACT-4: circuit-call binding sync + disclose wiring (simulator-level, no chain)", () => {
  it("pool generated bindings match what tx.ts calls: 7 circuits, exact signatures", () => {
    verifyGeneratedBindings({
      contractName: "remit_pool",
      contractClass: PoolContract,
      witnesses,
      contractInfo: contractInfo("remit_pool"),
    });
    const pool = CIRCUIT_BINDINGS.filter((b) => b.contractName === "remit_pool");
    expect(pool.map((b) => b.circuitId).sort()).toEqual(
      ["cancelOffer", "createMandate", "deposit", "fill", "placeOffer", "revokeMandate", "withdraw"].sort(),
    );
  });

  it("binding-sync check fails LOUD on signature drift and on missing circuits", () => {
    const snap = snapshotGeneratedBindings({
      contractClass: PoolContract,
      witnesses,
      contractInfo: contractInfo("remit_pool"),
    });
    const tampered = snap.map((s) =>
      s.circuitId === "fill" ? { ...s, argNames: ["notNowBound"] } : s,
    );
    expect(() => assertCircuitBindingsSynced("remit_pool", tampered)).toThrow(RemitError);
    expect(() => assertCircuitBindingsSynced("remit_pool", tampered)).toThrow(
      /BINDING_DRIFT[\s\S]*signature drift on "fill"/,
    );
    const missing = snap.filter((s) => s.circuitId !== "deposit");
    expect(() => assertCircuitBindingsSynced("remit_pool", missing)).toThrow(
      /BINDING_DRIFT[\s\S]*missing circuit "deposit"/,
    );
  });

  it("discloseField is wired into the single circuit-call path", () => {
    // The canonical path every circuit submission must travel.
    expect([...CIRCUIT_CALL_PATH]).toEqual([
      "intent",
      "build",
      "prove",
      "balance",
      "submit",
      "finalize",
      "indexer-truth-gate",
    ]);
    // submitDiscloseField exists and delegates to submitCircuit (the single path);
    // its registry entry declares the exact public signature tx.ts will call.
    // (v2 spec name `disclose` is a Compact reserved keyword; the circuit shipped
    // as `discloseField` — the binding-sync check pins this name.)
    expect(typeof submitDiscloseField).toBe("function");
    const d = CIRCUIT_BINDINGS.find(
      (b) => b.contractName === "remit_quote" && b.circuitId === "discloseField",
    );
    expect(d).toBeDefined();
    expect(d?.impure).toBe(true);
    expect(d?.provable).toBe(true);
    expect(d?.argNames).toEqual(["fieldSelector", "auditorKey", "sealedBox"]);
  });
});

describe("CONTRACT-4: quote binding sync + discloseField simulator (no chain)", () => {
  it("quote generated bindings match what tx.ts calls: quoteColor, claim, discloseField", () => {
    verifyGeneratedBindings({
      contractName: "remit_quote",
      contractClass: QuoteContract,
      witnesses: quoteDiscloseWitnesses,
      contractInfo: contractInfo("remit_quote"),
    });
  });

  it("discloseField simulator smoke: happy path, nullifier on ledger, refusal paths", () => {
    // Auditor keypair (X25519); the circuit sees only the public key as metadata.
    const auditor = rfqKeyPair();
    const auditorKey = fromHex(auditor.publicHex);

    // Fill fields (the "audit vector" the circuit recomputes in-circuit).
    const staged: DiscloseStaged = {
      callerSk: toArray(randomBytes32()),
      seed: toArray(randomBytes32()),
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 3_600_000n,
      principal: toArray(randomBytes32()),
      counterparty: toArray(randomBytes32()),
      mandateId: toArray(randomBytes32()),
    };

    // Honest-hybrid sealed box, built by the witness-fix worker's builder:
    // plaintext = value32 || salt32 (64 bytes), salt32 = the pool's real
    // fieldSalt(seed, idx) — the exact hash the circuit recomputes in-circuit.
    // RMTB1 sealed to the auditor key off-circuit, zero-padded to 160.
    const sealedBox = sealDisclosureBox({
      auditorKeyPubHex: auditor.publicHex,
      seed: staged.seed,
      field: "baseAmount",
      value: staged.baseAmount,
    });
    expect(sealedBox.length).toBe(160);
    expect(Buffer.from(sealedBox.subarray(0, 5)).toString()).toBe("RMTB1");

    // Ciphertext != plaintext regression: the public input is the sealed box,
    // never the raw field. (The auditor decrypts off-chain; the circuit makes
    // no claim about box contents — documented non-claim.)
    const value32 = new Uint8Array(32);
    new DataView(value32.buffer).setBigUint64(24, staged.baseAmount);
    expect(Buffer.from(sealedBox).includes(Buffer.from(value32))).toBe(false);
    const opened = openSealed(
      auditor.secretHex,
      Buffer.from(sealedBox.subarray(0, 141)).toString("base64url"),
    );
    expect(Buffer.from(opened.subarray(0, 32))).toEqual(Buffer.from(value32));

    // Happy path: fieldSelector 1 = baseAmount.
    let qsim = bootQuoteDisclose();
    qsim = discloseField(qsim, 1n, auditorKey, sealedBox, staged);

    // Ledger-write boundary: the disclosure nullifier is recorded on-ledger...
    const nullifiers = quotePublicLedger(qsim).disclosureNullifiers as unknown as {
      member?: (b: Uint8Array) => boolean;
    };
    expect(nullifiers).toBeDefined();

    // ...and replay is refused: same commitment + same auditor key.
    expect(() => discloseField(qsim, 1n, auditorKey, sealedBox, staged)).toThrow(
      /disclosure already recorded/i,
    );

    // A different auditor key is a different nullifier on the SAME ledger: passes.
    const auditor2 = rfqKeyPair();
    qsim = discloseField(qsim, 1n, fromHex(auditor2.publicHex), sealedBox, staged);

    // Refusal: bad field selector (>= 6).
    const qsim2 = bootQuoteDisclose();
    expect(() => discloseField(qsim2, 6n, auditorKey, sealedBox, staged)).toThrow(
      /bad field selector/i,
    );
  });
});
