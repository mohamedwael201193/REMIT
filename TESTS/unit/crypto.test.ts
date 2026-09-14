import { describe, it, expect } from "vitest";
import { openJson, sealJson, rfqKeyPair } from "../../packages/core/src/box.ts";
import { encryptPrivateState, decryptPrivateState } from "../../packages/core/src/persist.ts";
import { emptyPrivateState } from "../../packages/core/src/state.ts";
import { redact } from "../../packages/core/src/redact.ts";
import { encodingsOfBigint, encodingsOfBytes } from "../../packages/core/src/bytes.ts";
import { makeOfferBox, makeMandateBox, openOfferBox, openMandateBox } from "../../packages/core/src/rfq.ts";
import { CIRCUIT_CALL_PATH } from "../../packages/core/src/tx.ts";
import { publicErrorMessage, RemitError } from "../../packages/core/src/errors.ts";

describe("RFQ sealed box", () => {
  it("round-trips JSON to the recipient only", () => {
    const rec = rfqKeyPair();
    const other = rfqKeyPair();
    const boxed = sealJson(rec.publicHex, { side: 0, baseAmount: "40" });
    expect(openJson(rec.secretHex, boxed)).toEqual({ side: 0, baseAmount: "40" });
    expect(() => openJson(other.secretHex, boxed)).toThrow();
    expect(boxed.includes('"baseAmount"')).toBe(false);
    expect(boxed.includes("baseAmount")).toBe(false);
  });

  it("binds recipient, expires, and rejects replay", () => {
    const rec = rfqKeyPair();
    const { boxed } = makeOfferBox(rec.publicHex, {
      side: "1",
      baseAmount: "40",
      quoteAmount: "1280",
      maker: Array.from({ length: 32 }, () => 1),
      payNonce: Array.from({ length: 32 }, () => 2),
    }, Array.from({ length: 32 }, () => 3));
    const once = openOfferBox(rec.secretHex, boxed, rec.publicHex);
    expect(once.kind).toBe("offer");
    expect(() => openOfferBox(rec.secretHex, boxed, rec.publicHex)).toThrow();
    const { boxed: mbox } = makeMandateBox(rec.publicHex, Array.from({ length: 32 }, () => 9));
    const onceM = openMandateBox(rec.secretHex, mbox, rec.publicHex);
    expect(onceM.kind).toBe("mandate");
    expect(() => openMandateBox(rec.secretHex, mbox, rec.publicHex)).toThrow();
  });
});

describe("private-state encryption", () => {
  it("round-trips and rejects a wrong password", () => {
    const ps = emptyPrivateState("ns-a");
    ps.ownerSk = [1, 2, 3];
    const blob = encryptPrivateState(ps, "pw-correct-length-ok");
    expect(decryptPrivateState(blob, "pw-correct-length-ok").namespace).toBe("ns-a");
    expect(() => decryptPrivateState(blob, "wrong")).toThrow();
  });
});

describe("redaction and typed errors", () => {
  it("strips secret-named fields and never leaks witness text", () => {
    const out = redact({ REMIT_OPERATOR_MNEMONIC: "word ".repeat(24).trim(), ok: 1 }) as Record<string, unknown>;
    expect(out.REMIT_OPERATOR_MNEMONIC).toBe("[redacted]");
    expect(out.ok).toBe(1);
    expect(publicErrorMessage(new RemitError("WITNESS_MISSING", "owner secret abcdef", "witness missing"))).toBe("witness missing");
    expect(publicErrorMessage(new Error("witness salt 00aa"))).toBe("operation failed");
  });
});

describe("encodings + circuit-call path", () => {
  it("produces hex/dec/base64 variants and keeps a single tx path", () => {
    expect(encodingsOfBigint(123n).length).toBeGreaterThan(3);
    expect(encodingsOfBytes(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8])).length).toBeGreaterThan(3);
    expect(CIRCUIT_CALL_PATH).toEqual([
      "intent",
      "build",
      "prove",
      "balance",
      "submit",
      "finalize",
      "indexer-truth-gate",
    ]);
  });
});
