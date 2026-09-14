import { describe, it, expect } from "vitest";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import { residualOf } from "../../packages/core/src/mbbe.ts";
import { planFillFromInbox } from "../../packages/agent/src/daemon.ts";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";

describe("agent daemon plans Compact-identical fills from a sealed inbox", () => {
  it("selects the best eligible of three boxed offers and does not rewrite the mandate", () => {
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
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const box = (id: string, base: string, quote: string, minFill: string) => {
      const rand = Array.from(randomBytes32());
      const { boxed } = makeOfferBox(
        rec.publicHex,
        {
          side: "1",
          baseAmount: base,
          quoteAmount: quote,
          maker,
          payNonce: Array.from(randomBytes32()),
          expiry: "4000000000",
          minFillBase: minFill,
        },
        rand,
      );
      return { id, boxed, receivedAt: Date.now() };
    };
    const planned = planFillFromInbox({
      rfqSk: rec.secretHex,
      offers: [
        box("ineligible", "60", "1920", "60"),
        box("mid", "40", "1280", "1"),
        box("best", "80", "3200", "10"),
      ],
      esk,
      mandate,
      remaining: 5_000_000n,
      nowBound: 1_800_000_000n,
    });
    expect(planned.opened).toBe(3);
    expect(planned.dropped).toBe(0);
    expect(planned.decision.action).toBe("fill");
    if (planned.decision.action !== "fill") throw new Error("expected fill");
    expect(planned.decision.id).toBe("best");
    expect(planned.decision.fillBase).toBe(50n);
    expect(planned.decision.fillQuote).toBe(2000n);
    expect(planned.receipt.globalBest).toBe(false);
    expect(planned.receipt.eligibleCount).toBe(2);
    expect(planned.receipt.rejected.some((r) => r.id === "ineligible")).toBe(true);
    const residual = residualOf(
      planned.decision.offer,
      planned.decision.offerRand ?? planned.decision.offer.payNonce,
      planned.decision.fillBase,
      planned.decision.fillQuote,
    );
    expect(residual.offer.baseAmount).toBe(30n);
    expect(residual.offer.quoteAmount).toBe(1200n);
    expect(mandate.maxFillBase).toBe(50n);
  });
});
