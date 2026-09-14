import { describe, expect, it } from "vitest";
import { encryptInbox, decryptInbox } from "../../packages/core/src/inbox.ts";
import { privateStateNamespace as ns, tabStorageKeys as keys } from "../../packages/core/src/tab-seal.ts";
import { createDurableInbox, remitEnvelopeSchema } from "../../apps/api/src/durable.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";

describe("durable ciphertext inbox (no plaintext at rest)", () => {
  it("memory restart in the same store keeps boxed RFQ and never stores baseAmount", async () => {
    const rec = rfqKeyPair();
    const store = createDurableInbox({ password: rec.secretHex, memory: true });
    const { boxed } = makeOfferBox(rec.publicHex, {
      side: "1",
      baseAmount: "40",
      quoteAmount: "1280",
      maker: Array.from({ length: 32 }, () => 1),
      payNonce: Array.from({ length: 32 }, () => 2),
      expiry: "4000000000",
      minFillBase: "1",
    }, Array.from({ length: 32 }, () => 3));
    await store.save({
      v: 1,
      offers: [{ id: "rfq-1", boxed, receivedAt: 1 }],
      mandates: [],
      nonces: ["n1"],
      receipts: [["audit:published", "sealed"]],
    });
    const loaded = await store.load();
    expect(loaded.offers).toHaveLength(1);
    expect(loaded.offers[0]?.boxed).toBe(boxed);
    expect(loaded.nonces).toEqual(["n1"]);
    expect(JSON.stringify(loaded).includes("baseAmount")).toBe(false);
    expect(JSON.stringify(loaded).includes("1280")).toBe(false);
    await store.close();
  });

  it("encryptInbox blob is RMTI1 and omits offer amounts and owner secrets", () => {
    const rec = rfqKeyPair();
    const snap = {
      v: 1 as const,
      offers: [{ id: "x", boxed: "RMTB1ciphertext", receivedAt: 1 }],
      mandates: [],
      nonces: ["deadbeef"],
      receipts: [] as [string, string][],
    };
    const blob = encryptInbox(snap, rec.secretHex);
    expect(blob.subarray(0, 5).toString()).toBe("RMTI1");
    const hay = blob.toString("utf8").toLowerCase();
    expect(hay.includes("baseamount")).toBe(false);
    expect(hay.includes(rec.secretHex.toLowerCase())).toBe(false);
    expect(decryptInbox(blob, rec.secretHex).offers[0]?.id).toBe("x");
  });
});

describe("per-wallet private-state namespace", () => {
  it("hashes network|pool|wallet and does not embed the raw address", () => {
    const a = ns("preprod", "pool", "mn_addr_preprod1aaaaaaaaaaaaaaaa");
    const b = ns("preprod", "pool", "mn_addr_preprod1bbbbbbbbbbbbbbbb");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
    expect(a.includes("mn_addr")).toBe(false);
    expect(keys("preprod", "pool", "mn_addr_preprod1aaaaaaaaaaaaaaaa").wrap).toContain(a);
    expect(keys("preprod", "pool", "mn_addr_preprod1aaaaaaaaaaaaaaaa").wrap).not.toContain("mn_addr");
  });
});

describe("remit_envelopes RLS", () => {
  it("enables RLS and denies anon/authenticated", () => {
    const sql = remitEnvelopeSchema();
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/REVOKE ALL ON TABLE remit_envelopes FROM PUBLIC/);
    expect(sql).toMatch(/remit_envelopes_deny_anon/);
    expect(sql).toMatch(/remit_envelopes_deny_authenticated/);
    expect(sql).toMatch(/USING \(false\) WITH CHECK \(false\)/);
    expect(sql).toMatch(/ciphertext text NOT NULL/);
  });
});
