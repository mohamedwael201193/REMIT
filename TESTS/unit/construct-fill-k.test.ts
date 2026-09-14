import { describe, it, expect } from "vitest";
import { constructFill, constructFillK } from "../../packages/agent/src/fill-circuit.ts";
import { decideFill } from "../../packages/agent/src/executor.ts";
import { planFillFromInbox } from "../../packages/agent/src/daemon.ts";
import { constructRankedFill } from "../../packages/agent/src/prove-submit.ts";
import { randomBytes32, toArray } from "../../packages/core/src/bytes.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";
import { legalSlice, padBook, pickChosenIndex } from "../../packages/core/src/mbbe.ts";
import { bootPool, createMandate, deposit, fill, publicLedger } from "../../packages/core/src/sim.ts";
import { buyMandate, keys, placeQuoted, sellOffer } from "../security/mbbe-harness.ts";

describe("constructFillK — Compact-identical K-set", () => {
  it("selects the best eligible of three live offers and Compact fill settles", () => {
    const k = keys();
    let sim = bootPool();
    const cheapIneligible = sellOffer(k.maker, { quoteAmount: 1n });
    const mid = sellOffer(k.maker, { quoteAmount: 1400n });
    const best = sellOffer(k.maker, { quoteAmount: 1600n });
    const p0 = placeQuoted(sim, k.makerSk, cheapIneligible);
    sim = p0.sim;
    const p1 = placeQuoted(sim, k.makerSk, mid);
    sim = p1.sim;
    const p2 = placeQuoted(sim, k.makerSk, best);
    sim = p2.sim;
    const dPrincipal = deposit(sim, k.principalSk, 0n, 100n);
    sim = dPrincipal.sim;
    const mandate = buyMandate(k);
    const created = createMandate(sim, k.principalSk, dPrincipal.note, mandate);
    sim = created.sim;

    const candidates = [
      { id: "cheap", offer: p0.offer, remaining: 100n, receivedAt: 1, rand: p0.offerRand, live: true },
      { id: "mid", offer: p1.offer, remaining: 100n, receivedAt: 1, rand: p1.offerRand, live: true },
      { id: "best", offer: p2.offer, remaining: 100n, receivedAt: 1, rand: p2.offerRand, live: true },
    ];
    const decision = decideFill({
      esk: k.esk,
      mandate,
      remaining: 100n,
      nowBound: 1_800_000_000n,
      revoked: false,
      candidates,
      allowCounterparty: () => true,
    });
    expect(decision.action).toBe("fill");
    if (decision.action !== "fill") throw new Error("expected fill");
    expect(decision.id).toBe("best");
    expect(decision.chosenIndex).toBe(2n);
    expect(pickChosenIndex(decision.book, mandate, 1_800_000_000n, 100n)).toBe(2n);

    const built = constructFillK({
      ledger: publicLedger(sim),
      esk: k.esk,
      mandate,
      remaining: 100n,
      nowBound: 1_800_000_000n,
      revoked: false,
      offer: p0.offer,
      mandateRand: created.mandateRand,
      stateNonce: created.stateNonce,
      offerRand: p0.offerRand,
      auditSeed: randomBytes32(),
      getNonce: randomBytes32(),
      nextStateNonce: randomBytes32(),
      candidates,
    });
    expect(built.decision.action).toBe("fill");
    if (built.decision.action !== "fill") throw new Error("expected fill");
    expect(built.pending.chosenIndex).toBe("2");
    expect(built.decision.id).toBe("best");

    sim = fill(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      offer: built.decision.offer,
      offerRand: built.decision.offerRand!,
      nowBound: 1_800_000_000n,
      book: built.decision.book,
      chosenIndex: built.decision.chosenIndex,
      fillBase: built.decision.fillBase,
      fillQuote: built.decision.fillQuote,
    });
    expect(publicLedger(sim).fills).toBe(1n);
  });

  it("legalSlice preserves Compact ratio and constructFill rejects a lone over-cap", () => {
    const k = keys();
    const mandate = buyMandate(k);
    const o = sellOffer(k.maker, { baseAmount: 80n, quoteAmount: 2560n, minFillBase: 10n });
    const slice = legalSlice(o, mandate, 100n);
    expect(slice.fillBase * o.quoteAmount).toBe(slice.fillQuote * o.baseAmount);
    expect(slice.fillBase).toBeLessThanOrEqual(mandate.maxFillBase);
    expect(() =>
      constructFill({
        ledger: publicLedger(bootPool()),
        esk: k.esk,
        mandate,
        remaining: 100n,
        nowBound: 1_800_000_000n,
        revoked: false,
        offer: sellOffer(k.maker, { baseAmount: 60n, quoteAmount: 1920n, minFillBase: 60n }),
        mandateRand: randomBytes32(),
        stateNonce: randomBytes32(),
        offerRand: randomBytes32(),
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
      }),
    ).toThrow(/rejected fill/);
    expect(padBook([{ offer: o, rand: randomBytes32(), live: true }])).toHaveLength(3);
  });
});

describe("constructRankedFill matches Compact-chosen candidate", () => {
  it("binds the ranked id to constructFillK witnesses", () => {
    const k = keys();
    let sim = bootPool();
    const best = sellOffer(k.maker, { quoteAmount: 1600n });
    const p = placeQuoted(sim, k.makerSk, best);
    sim = p.sim;
    const dPrincipal = deposit(sim, k.principalSk, 0n, 100n);
    sim = dPrincipal.sim;
    const mandate = buyMandate(k);
    const created = createMandate(sim, k.principalSk, dPrincipal.note, mandate);
    sim = created.sim;
    const rec = rfqKeyPair();
    const jsonOffer = {
      side: p.offer.side.toString(),
      baseAmount: p.offer.baseAmount.toString(),
      quoteAmount: p.offer.quoteAmount.toString(),
      maker: toArray(p.offer.maker),
      payNonce: toArray(p.offer.payNonce),
      expiry: p.offer.expiry.toString(),
      minFillBase: p.offer.minFillBase.toString(),
    };
    const { boxed } = makeOfferBox(rec.publicHex, jsonOffer, toArray(p.offerRand));
    const planned = planFillFromInbox({
      rfqSk: rec.secretHex,
      offers: [{ id: "best", boxed, receivedAt: 1 }],
      esk: k.esk,
      mandate,
      remaining: 100n,
      nowBound: 1_800_000_000n,
    });
    expect(planned.decision.action).toBe("fill");
    if (planned.decision.action !== "fill") throw new Error("expected fill");
    const built = constructRankedFill({
      ledger: publicLedger(sim),
      planned,
      esk: k.esk,
      mandate,
      remaining: 100n,
      nowBound: 1_800_000_000n,
      mandateRand: created.mandateRand,
      stateNonce: created.stateNonce,
    });
    expect(built.chosenMatches).toBe(true);
    expect(built.pending.chosenIndex).toBe(planned.decision.chosenIndex.toString());
  });

  it("rejects fillBase 31 against a residual 30 opening before proving", () => {
    const k = keys();
    let sim = bootPool();
    const offer = sellOffer(k.maker, { baseAmount: 30n, quoteAmount: 1200n, minFillBase: 10n });
    const placed = placeQuoted(sim, k.makerSk, offer);
    sim = placed.sim;
    const dPrincipal = deposit(sim, k.principalSk, 0n, 30n);
    sim = dPrincipal.sim;
    const mandate = buyMandate(k, { maxFillBase: 30n });
    const created = createMandate(sim, k.principalSk, dPrincipal.note, mandate);
    sim = created.sim;
    expect(() =>
      constructFillK({
        ledger: publicLedger(sim),
        esk: k.esk,
        mandate,
        remaining: 30n,
        nowBound: 1_800_000_000n,
        revoked: false,
        offer: placed.offer,
        mandateRand: created.mandateRand,
        stateNonce: created.stateNonce,
        offerRand: placed.offerRand,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
        fillBase: 31n,
        fillQuote: 1240n,
      }),
    ).toThrow(/exceeds offer base|ratio mismatch|POLICY_REJECT/);
  });
});
