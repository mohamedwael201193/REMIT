import { describe, it, expect } from "vitest";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import { runEncryptedRfqTick } from "../../packages/agent/src/pipeline.ts";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";

describe("encrypted RFQ executor tick", () => {
  it("unseals offers, scores, and refuses over-cap without changing the mandate", () => {
    const rec = rfqKeyPair();
    const esk = randomBytes32();
    const principal = pureCircuits.ownerKey(randomBytes32());
    const maker = Array.from(randomBytes32());
    const mandate = {
      principal,
      executor: pureCircuits.executorKey(esk),
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 2_000_000_000n,
      mandateId: randomBytes32(),
    };
    const ok = makeOfferBox(rec.publicHex, {
      side: "1",
      baseAmount: "40",
      quoteAmount: "1280",
      maker,
      payNonce: Array.from(randomBytes32()),
      expiry: "2000000000",
      minFillBase: "1",
    }, Array.from(randomBytes32()));
    const over = makeOfferBox(rec.publicHex, {
      side: "1",
      baseAmount: "60",
      quoteAmount: "1920",
      maker,
      payNonce: Array.from(randomBytes32()),
      expiry: "2000000000",
      minFillBase: "60",
    }, Array.from(randomBytes32()));
    const tick = runEncryptedRfqTick({
      rfqSecretHex: rec.secretHex,
      boxedOffers: [
        { id: "over", boxed: over.boxed },
        { id: "ok", boxed: ok.boxed },
      ],
      esk,
      mandate,
      remaining: 100n,
      nowBound: 1_700_000_000n,
      revoked: false,
    });
    expect(tick.opened).toBe(2);
    expect(tick.dropped).toBe(0);
    expect(tick.decision.action).toBe("fill");
    if (tick.decision.action === "fill") expect(tick.decision.id).toBe("ok");
    expect(mandate.maxFillBase).toBe(50n);
  });
});
