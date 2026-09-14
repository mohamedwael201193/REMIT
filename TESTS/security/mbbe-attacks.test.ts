import { describe, it, expect } from "vitest";
import { CompactError } from "@midnight-ntwrk/compact-runtime";
import type { Offer } from "@remit/contracts/pool";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import { pickChosenIndex } from "../../packages/core/src/mbbe.ts";
import {
  bootPool,
  createMandate,
  deposit,
  expectCompactFail,
  publicLedger,
  revokeMandate,
  withdraw,
} from "../../packages/core/src/sim.ts";
import {
  compiledMbbeReady,
  compiledOfferHasExpiry,
  impureCircuitNames,
  mbbeDescribeTitle,
  MBBE_PROBE_PENDING,
} from "./mbbe-capability.ts";
import {
  bootDesk,
  buyMandate,
  cancelAttackOffer,
  expectCompactFailAny,
  FAR_EXPIRY,
  fillAttack,
  keys,
  paddedBook,
  placeAttackOffer,
  placeQuoted,
  residualOf,
  sellOffer,
  type AttackSlot,
} from "./mbbe-harness.ts";

const NOW = 1_800_000_000n;
const mbbe = compiledMbbeReady();

function liveSlot(offer: Offer, rand: Uint8Array, live = true): AttackSlot {
  return { offer, rand, live };
}

describe("MBBE compiled Offer detection", () => {
  it("imports Offer from @remit/contracts/pool and detects expiry", () => {
    const dummy = {
      side: 1n,
      baseAmount: 1n,
      quoteAmount: 1n,
      maker: new Uint8Array(32),
      payNonce: new Uint8Array(32),
      expiry: FAR_EXPIRY,
      minFillBase: 1n,
    } as Offer;
    expect("expiry" in dummy).toBe(true);
    if (mbbe) {
      expect(compiledOfferHasExpiry()).toBe(true);
      expect(impureCircuitNames().sort()).toEqual(
        ["cancelOffer", "createMandate", "deposit", "fill", "placeOffer", "revokeMandate", "withdraw"].sort(),
      );
      expect(impureCircuitNames()).not.toContain("fillBest");
    } else {
      expect(compiledOfferHasExpiry(), MBBE_PROBE_PENDING).toBe(false);
    }
  });
});

describe("AUTH — unauthorized actions (Compact)", () => {
  it("rejects unauthorized revoke, unauthorized cancel, and wrong principal", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const offer = sellOffer(k.maker);
    const placed = placeQuoted(sim, k.makerSk, offer);
    sim = placed.sim;
    const mandate = buyMandate(k);
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;

    expectCompactFail(
      () => revokeMandate(sim, k.makerSk, mandate, created.mandateRand, 100n, created.stateNonce),
      "not your mandate",
    );
    expectCompactFail(() => cancelAttackOffer(sim, k.principalSk, offer, placed.offerRand), "not your offer");

    const stranger = randomBytes32();
    const wrongPrincipal = buyMandate(k, { principal: pureCircuits.ownerKey(stranger), mandateId: randomBytes32() });
    const dWrong = deposit(sim, k.principalSk, 0n, 50n);
    sim = dWrong.sim;
    expectCompactFail(
      () => createMandate(sim, k.principalSk, dWrong.note, wrongPrincipal),
      "mandate principal must be caller",
    );
  });

  it("rejects withdraw of someone else's note", () => {
    const k = keys();
    let sim = bootPool();
    const dM = deposit(sim, k.makerSk, 1n, 40n);
    sim = dM.sim;
    expectCompactFail(() => withdraw(sim, k.principalSk, dM.note, 1n), "not your note");
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("AUTH — fill binding"), () => {
  it("rejects unauthorized fill (wrong esk)", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    expectCompactFail(
      () =>
        fillAttack(placed.sim, {
          esk: randomBytes32(),
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
        }),
      "not the mandated executor",
    );
  });

  it("rejects a forged / dummy counterparty path when cpRoot is set", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const offer = sellOffer(k.maker);
    const placed = placeQuoted(sim, k.makerSk, offer);
    sim = placed.sim;
    const mandate = buyMandate(k, { cpRoot: 1n });
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    expectCompactFail(
      () =>
        fillAttack(created.sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
        }),
      "counterparty not allowed",
    );
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("REPLAY"), () => {
  it("rejects a reused offer opening after fill", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const nextStateNonce = randomBytes32();
    let sim = fillAttack(placed.sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(offer, placed.offerRand)]),
      chosenIndex: 0n,
      nextStateNonce,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    const paid = offer.baseAmount;
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - paid,
          stateNonce: nextStateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
        }),
      "offer already used",
    );
  });

  it("rejects residual replay of the old opening after a partial fill", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 1280n, minFillBase: 10n });
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const nextStateNonce = randomBytes32();
    const fb = 20n;
    const fq = 640n;
    let sim = fillAttack(placed.sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(offer, placed.offerRand)]),
      chosenIndex: 0n,
      fillBase: fb,
      fillQuote: fq,
      nextStateNonce,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - fb,
          stateNonce: nextStateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
          fillBase: fb,
          fillQuote: fq,
        }),
      "offer already used",
    );
  });

  it("rejects reused mandate-state and a cross-mandate state pairing", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const nextStateNonce = randomBytes32();
    let sim = fillAttack(placed.sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(offer, placed.offerRand)]),
      chosenIndex: 0n,
      nextStateNonce,
    });
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
        }),
      "state already consumed",
    );

    const k2 = keys();
    const dP2 = deposit(sim, k2.principalSk, 0n, 100n);
    sim = dP2.sim;
    const m2 = buyMandate(k2, { executor: desk.k.executor });
    const c2 = createMandate(sim, k2.principalSk, dP2.note, m2);
    sim = c2.sim;
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - offer.baseAmount,
          stateNonce: nextStateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
          foreignMandate: { mandate: m2, mandateRand: c2.mandateRand },
        }),
      "state/mandate mismatch",
    );
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("MARKET — eligible-only K=3"), () => {
  it("Senyap-negative: cheapest live ineligible (expired, better price) while second-best eligible MUST succeed", () => {
    const desk = bootDesk();
    const betterExpired = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 2000n, expiry: NOW - 1n });
    const eligible = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 1280n });
    let sim = desk.sim;
    const p0 = placeQuoted(sim, desk.k.makerSk, betterExpired);
    sim = p0.sim;
    const p1 = placeQuoted(sim, desk.k.makerSk, eligible);
    sim = p1.sim;
    const book = paddedBook([liveSlot(betterExpired, p0.offerRand), liveSlot(eligible, p1.offerRand)]);
    expect(pickChosenIndex(book, desk.mandate, NOW, desk.remaining)).toBe(1n);

    const fillsBefore = publicLedger(sim).fills;
    sim = fillAttack(sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book,
      chosenIndex: 1n,
    });
    expect(publicLedger(sim).fills).toBe(fillsBefore + 1n);
  });

  it("selecting the ineligible (expired) better slot MUST fail and must not settle", () => {
    const desk = bootDesk();
    const betterExpired = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 2000n, expiry: NOW - 1n });
    const eligible = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 1280n });
    let sim = desk.sim;
    const p0 = placeQuoted(sim, desk.k.makerSk, betterExpired);
    sim = p0.sim;
    const p1 = placeQuoted(sim, desk.k.makerSk, eligible);
    sim = p1.sim;
    const book = paddedBook([liveSlot(betterExpired, p0.offerRand), liveSlot(eligible, p1.offerRand)]);
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book,
          chosenIndex: 0n,
        }),
      ["offer expired", "selected slot is not eligible"],
    );
    expect(publicLedger(sim).fills).toBe(0n);
  });

  it("price-ineligible live slot must not be selected; eligible sibling still fills", () => {
    const desk = bootDesk();
    const badPrice = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 1n });
    const ok = sellOffer(desk.k.maker);
    let sim = desk.sim;
    const pBad = placeQuoted(sim, desk.k.makerSk, badPrice);
    sim = pBad.sim;
    const pOk = placeQuoted(sim, desk.k.makerSk, ok);
    sim = pOk.sim;
    const book = paddedBook([liveSlot(badPrice, pBad.offerRand), liveSlot(ok, pOk.offerRand)]);
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book,
          chosenIndex: 0n,
        }),
      "price outside mandate limit",
    );
    sim = fillAttack(sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book,
      chosenIndex: 1n,
    });
    expect(publicLedger(sim).fills).toBe(1n);
  });

  it("padding live=false cannot win", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const book = paddedBook([liveSlot(offer, placed.offerRand, true)]);
    expect(book[1]?.live).toBe(false);
    expect(book[2]?.live).toBe(false);
    expectCompactFail(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book,
          chosenIndex: 2n,
        }),
      "chosen slot is empty",
    );
    expect(publicLedger(placed.sim).fills).toBe(0n);
  });

  it("zero live slots fails", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const proto = liveSlot(offer, placed.offerRand, false);
    expectCompactFail(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: [proto, proto, proto],
          chosenIndex: 0n,
        }),
      "chosen slot is empty",
    );
  });

  it("expired offer is not selected when a live eligible sibling exists", () => {
    const desk = bootDesk();
    const expired = sellOffer(desk.k.maker, { expiry: NOW - 5n, quoteAmount: 1280n });
    const live = sellOffer(desk.k.maker, { quoteAmount: 1300n });
    let sim = desk.sim;
    const pExp = placeQuoted(sim, desk.k.makerSk, expired);
    sim = pExp.sim;
    const pLive = placeQuoted(sim, desk.k.makerSk, live);
    sim = pLive.sim;
    const book = paddedBook([liveSlot(expired, pExp.offerRand), liveSlot(live, pLive.offerRand)]);
    expect(pickChosenIndex(book, desk.mandate, NOW, desk.remaining)).toBe(1n);
    sim = fillAttack(sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book,
      chosenIndex: 1n,
    });
    expect(publicLedger(sim).fills).toBe(1n);
  });

  it("cancelled or spent selected fails; fill after cancel fails", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const sim = cancelAttackOffer(placed.sim, desk.k.makerSk, offer, placed.offerRand);
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
        }),
      "offer already used",
    );
  });

  it("fill after a successful fill cannot cancel the spent offer", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const sim = fillAttack(placed.sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(offer, placed.offerRand)]),
      chosenIndex: 0n,
    });
    expectCompactFail(() => cancelAttackOffer(sim, desk.k.makerSk, offer, placed.offerRand), "offer already used");
  });

  it("malicious live=true on a spent better loser cannot settle that spent offer", () => {
    const desk = bootDesk();
    const better = sellOffer(desk.k.maker, { quoteAmount: 2000n });
    const worse = sellOffer(desk.k.maker, { quoteAmount: 1280n });
    let sim = desk.sim;
    const pBetter = placeQuoted(sim, desk.k.makerSk, better);
    sim = pBetter.sim;
    const pWorse = placeQuoted(sim, desk.k.makerSk, worse);
    sim = pWorse.sim;
    sim = cancelAttackOffer(sim, desk.k.makerSk, better, pBetter.offerRand);
    const fillsBefore = publicLedger(sim).fills;
    const book = paddedBook([liveSlot(better, pBetter.offerRand, true), liveSlot(worse, pWorse.offerRand, true)]);
    try {
      fillAttack(sim, {
        esk: desk.k.esk,
        mandate: desk.mandate,
        mandateRand: desk.mandateRand,
        remaining: desk.remaining,
        stateNonce: desk.stateNonce,
        nowBound: NOW,
        book,
        chosenIndex: 0n,
      });
      throw new Error("selecting a spent better slot must not succeed");
    } catch (e) {
      if (e instanceof Error && e.message === "selecting a spent better slot must not succeed") throw e;
      const msg = e instanceof CompactError || e instanceof Error ? e.message : String(e);
      expect(msg).toContain("offer already used");
    }
    expect(publicLedger(sim).fills).toBe(fillsBefore);
  });

  it("fillBase=0 fails", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    expectCompactFail(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
          fillBase: 0n,
          fillQuote: 0n,
        }),
      "zero fill base",
    );
  });

  it("ratio mismatch fails", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker, { minFillBase: 1n });
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    expectCompactFail(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
          fillBase: 20n,
          fillQuote: 1n,
        }),
      "fill ratio mismatch",
    );
  });

  it("minFill rejects a sub-minimum slice unless the slice is the remainder", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 1280n, minFillBase: 25n });
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    expectCompactFail(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
          fillBase: 10n,
          fillQuote: 320n,
        }),
      "below minFill",
    );
  });

  it("remainder < minFill succeeds when filling the leftover opening", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 200n);
    sim = dP.sim;
    const mandate = buyMandate(k, { maxFillBase: 80n });
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    const offer = sellOffer(k.maker, { baseAmount: 40n, quoteAmount: 1280n, minFillBase: 25n });
    const placed = placeQuoted(sim, k.makerSk, offer);
    sim = placed.sim;
    const nextStateNonce = randomBytes32();
    sim = fillAttack(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 200n,
      stateNonce: created.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(offer, placed.offerRand)]),
      chosenIndex: 0n,
      fillBase: 30n,
      fillQuote: 960n,
      nextStateNonce,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    const residual = residualOf(offer, placed.offerRand, 30n, 960n);
    expect(residual.offer.baseAmount).toBe(10n);
    expect(10n < offer.minFillBase).toBe(true);
    sim = fillAttack(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 170n,
      stateNonce: nextStateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(residual.offer, residual.rand)]),
      chosenIndex: 0n,
      fillBase: 10n,
      fillQuote: 320n,
    });
    expect(publicLedger(sim).fills).toBe(2n);
  });

  it("zero residual still inserts and is un-fillable", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const openBefore = publicLedger(placed.sim).openOffers;
    const freeBefore = publicLedger(placed.sim).offers.firstFree();
    const nextStateNonce = randomBytes32();
    let sim = fillAttack(placed.sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(offer, placed.offerRand)]),
      chosenIndex: 0n,
      nextStateNonce,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    expect(publicLedger(sim).openOffers).toBe(openBefore);
    expect(publicLedger(sim).offers.firstFree()).toBe(freeBefore + 1n);
    const residual = residualOf(offer, placed.offerRand, offer.baseAmount, offer.quoteAmount);
    expect(residual.offer.baseAmount).toBe(0n);
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - offer.baseAmount,
          stateNonce: nextStateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(residual.offer, residual.rand)]),
          chosenIndex: 0n,
          fillBase: 1n,
          fillQuote: 1n,
        }),
      ["zero amounts", "zero fill base", "fill exceeds offer base", "selected slot is not eligible"],
    );
  });

  it("selecting a worse eligible while a better eligible is live fails unique-best", () => {
    const desk = bootDesk();
    const better = sellOffer(desk.k.maker, { quoteAmount: 2000n });
    const worse = sellOffer(desk.k.maker, { quoteAmount: 1280n });
    let sim = desk.sim;
    const pB = placeQuoted(sim, desk.k.makerSk, better);
    sim = pB.sim;
    const pW = placeQuoted(sim, desk.k.makerSk, worse);
    sim = pW.sim;
    const book = paddedBook([liveSlot(better, pB.offerRand), liveSlot(worse, pW.offerRand)]);
    expect(pickChosenIndex(book, desk.mandate, NOW, desk.remaining)).toBe(0n);
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book,
          chosenIndex: 1n,
        }),
      ["slot 0 is strictly better", "strictly better"],
    );
  });

  it("plan Eligible: minFill-impossible over-cap live must not DoS the second-best fill", () => {
    const desk = bootDesk();
    const over = sellOffer(desk.k.maker, {
      baseAmount: 80n,
      quoteAmount: 3200n,
      minFillBase: 80n,
    });
    const ok = sellOffer(desk.k.maker);
    let sim = desk.sim;
    const pOver = placeQuoted(sim, desk.k.makerSk, over);
    sim = pOver.sim;
    const pOk = placeQuoted(sim, desk.k.makerSk, ok);
    sim = pOk.sim;
    const book = paddedBook([liveSlot(over, pOver.offerRand), liveSlot(ok, pOk.offerRand)]);
    // Selecting the over-cap opening at full size must fail.
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book,
          chosenIndex: 0n,
          fillBase: 80n,
          fillQuote: 3200n,
        }),
      ["fill exceeds per-fill cap", "below minFill", "selected slot is not eligible"],
    );
    const fillsBefore = publicLedger(sim).fills;
    // Plan §10.(3).8 / §21: fillableBase 50 < minFill 80 and not remainder → ineligible.
    // Compact slotEligible currently treats cap>0 as eligible, so idx=1 aborts "slot 0 is strictly better".
    sim = fillAttack(sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book,
      chosenIndex: 1n,
    });
    expect(publicLedger(sim).fills).toBe(fillsBefore + 1n);
  });
});
