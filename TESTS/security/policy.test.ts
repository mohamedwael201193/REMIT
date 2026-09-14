import { describe, it, expect } from "vitest";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import { checkFillPolicy } from "../../packages/core/src/policy.ts";
import { pickBest, rankOffers } from "../../packages/agent/src/strategy.ts";
import { decideFill } from "../../packages/agent/src/executor.ts";
import { expectCompactFail, bootPool, createMandate, deposit, publicLedger } from "../../packages/core/src/sim.ts";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import type { Mandate, Offer } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { withOfferDefaults } from "../../packages/core/src/mbbe.ts";
import { fillAttack, paddedBook, placeQuoted } from "./mbbe-harness.ts";

function mandate(over: Partial<Mandate> = {}): Mandate {
  const psk = randomBytes32();
  const esk = randomBytes32();
  return {
    principal: pureCircuits.ownerKey(psk),
    executor: pureCircuits.executorKey(esk),
    side: 0n,
    maxFillBase: 50n,
    limitNum: 30n,
    limitDen: 1000n,
    cpRoot: 0n,
    expiry: 2_000_000_000n,
    mandateId: randomBytes32(),
    ...over,
  };
}

function offer(over: Partial<Offer> = {}): Offer {
  return withOfferDefaults({
    side: 1n,
    baseAmount: 40n,
    quoteAmount: 1280n,
    maker: randomBytes32(),
    payNonce: randomBytes32(),
    ...over,
  });
}

describe("mandate policy (same predicates as Compact fill)", () => {
  const esk = randomBytes32();
  const real = mandate({ executor: pureCircuits.executorKey(esk) });

  it("accepts a compliant fill", () => {
    expect(
      checkFillPolicy({
        esk,
        mandate: real,
        offer: offer(),
        remaining: 100n,
        nowBound: 1_700_000_000n,
        revoked: false,
        counterpartyAllowed: true,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects over-cap, price, budget, expiry, revoke, wrong executor, side, counterparty", () => {
    const base = {
      esk,
      mandate: real,
      offer: offer(),
      remaining: 100n,
      nowBound: 1_700_000_000n,
      revoked: false,
      counterpartyAllowed: true,
    };
    expect(checkFillPolicy({ ...base, offer: offer({ baseAmount: 60n, quoteAmount: 1920n, minFillBase: 60n }) }).reason).toBe("over-cap");
    expect(checkFillPolicy({ ...base, offer: offer({ quoteAmount: 1n }) }).reason).toBe("price");
    expect(checkFillPolicy({ ...base, remaining: 0n }).reason).toBe("budget");
    expect(checkFillPolicy({ ...base, nowBound: real.expiry + 1n }).reason).toBe("expired");
    expect(checkFillPolicy({ ...base, revoked: true }).reason).toBe("revoked");
    expect(checkFillPolicy({ ...base, esk: randomBytes32() }).reason).toBe("wrong-executor");
    expect(checkFillPolicy({ ...base, offer: offer({ side: 0n }) }).reason).toBe("side");
    expect(checkFillPolicy({ ...base, counterpartyAllowed: false }).reason).toBe("counterparty");
  });

  it("agent ranks only compliant offers and never selects over-cap", () => {
    const candidates = [
      { id: "bad", offer: offer({ baseAmount: 80n, quoteAmount: 3000n, minFillBase: 80n }), remaining: 100n, receivedAt: 1 },
      { id: "ok", offer: offer(), remaining: 100n, receivedAt: 1 },
    ];
    const rankArgs = {
      esk,
      mandate: real,
      remaining: 100n,
      nowBound: 1_700_000_000n,
      revoked: false,
      candidates,
      allowCounterparty: () => true,
    };
    const ranked = rankOffers(rankArgs);
    expect(pickBest(ranked, rankArgs)).toBe("ok");
    expect(ranked.find((r) => r.id === "bad")?.ok).toBe(false);
  });
});

describe("circuit is the final enforcement layer", () => {
  it("bypassed local pre-check still fails Compact on over-cap; state unchanged", () => {
    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = randomBytes32();
    let sim = bootPool();
    const dP = deposit(sim, principalSk, 0n, 100n);
    sim = dP.sim;
    const o = withOfferDefaults({
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: pureCircuits.ownerKey(makerSk),
      payNonce: randomBytes32(),
    });
    const placed = placeQuoted(sim, makerSk, o);
    sim = placed.sim;
    const m = {
      principal: pureCircuits.ownerKey(principalSk),
      executor: pureCircuits.executorKey(esk),
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, principalSk, dP.note, m);
    sim = created.sim;
    const malicious = withOfferDefaults({ ...o, baseAmount: 80n, quoteAmount: 2560n, payNonce: randomBytes32() });
    const placedMal = placeQuoted(sim, makerSk, malicious);
    sim = placedMal.sim;
    const bypass = decideFill({
      esk,
      mandate: m,
      remaining: 100n,
      nowBound: 1_800_000_000n,
      revoked: false,
      candidates: [{ id: "mal", offer: malicious, remaining: 100n, receivedAt: 0 }],
      allowCounterparty: () => true,
      bypassLocalPrecheck: true,
    });
    expect(bypass.action).toBe("fill");
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk,
          mandate: m,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          nowBound: 1_800_000_000n,
          book: paddedBook([{ offer: malicious, rand: placedMal.offerRand, live: true }]),
          chosenIndex: 0n,
          fillBase: malicious.baseAmount,
          fillQuote: malicious.quoteAmount,
        }),
      "fill exceeds per-fill cap",
    );
  });

  it("killer demo: mandate max X, agent attempts X+20%, Compact rejects, no fill", () => {
    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = randomBytes32();
    let sim = bootPool();
    const dP = deposit(sim, principalSk, 0n, 100n);
    sim = dP.sim;
    const cap = 50n;
    const over = withOfferDefaults({
      side: 1n,
      baseAmount: (cap * 120n) / 100n,
      quoteAmount: 1920n,
      maker: pureCircuits.ownerKey(makerSk),
      payNonce: randomBytes32(),
    });
    const placedOver = placeQuoted(sim, makerSk, over);
    sim = placedOver.sim;
    const m = {
      principal: pureCircuits.ownerKey(principalSk),
      executor: pureCircuits.executorKey(esk),
      side: 0n,
      maxFillBase: cap,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, principalSk, dP.note, m);
    sim = created.sim;
    const bypass = decideFill({
      esk,
      mandate: m,
      remaining: 100n,
      nowBound: 1_800_000_000n,
      revoked: false,
      candidates: [{ id: "plus20", offer: over, remaining: 100n, receivedAt: 0 }],
      allowCounterparty: () => true,
      bypassLocalPrecheck: true,
    });
    expect(bypass.action).toBe("fill");
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk,
          mandate: m,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          nowBound: 1_800_000_000n,
          book: paddedBook([{ offer: over, rand: placedOver.offerRand, live: true }]),
          chosenIndex: 0n,
          fillBase: over.baseAmount,
          fillQuote: over.quoteAmount,
        }),
      "fill exceeds per-fill cap",
    );
    expect(publicLedger(sim).fills).toBe(0n);
  });

  it("bypassed local pre-check still fails Compact on a price-limit violation", () => {
    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = randomBytes32();
    let sim = bootPool();
    const dP = deposit(sim, principalSk, 0n, 100n);
    sim = dP.sim;
    const badPrice = withOfferDefaults({
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1n,
      maker: pureCircuits.ownerKey(makerSk),
      payNonce: randomBytes32(),
    });
    const placed = placeQuoted(sim, makerSk, badPrice);
    sim = placed.sim;
    const m = {
      principal: pureCircuits.ownerKey(principalSk),
      executor: pureCircuits.executorKey(esk),
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, principalSk, dP.note, m);
    sim = created.sim;
    const bypass = decideFill({
      esk,
      mandate: m,
      remaining: 100n,
      nowBound: 1_800_000_000n,
      revoked: false,
      candidates: [{ id: "price", offer: badPrice, remaining: 100n, receivedAt: 0 }],
      allowCounterparty: () => true,
      bypassLocalPrecheck: true,
    });
    expect(bypass.action).toBe("fill");
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk,
          mandate: m,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          nowBound: 1_800_000_000n,
          book: paddedBook([{ offer: badPrice, rand: placed.offerRand, live: true }]),
          chosenIndex: 0n,
        }),
      "price outside mandate limit",
    );
    expect(publicLedger(sim).fills).toBe(0n);
  });
});
