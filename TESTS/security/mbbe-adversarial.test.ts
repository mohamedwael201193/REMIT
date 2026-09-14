import { describe, it, expect } from "vitest";
import type { Offer } from "@remit/contracts/pool";
import { decideFill } from "../../packages/agent/src/executor.ts";
import { pickChosenIndex, residualOf as coreResidualOf } from "../../packages/core/src/mbbe.ts";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import { offerPath, publicLedger } from "../../packages/core/src/sim.ts";
import {
  compiledMbbeReady,
  mbbeDescribeTitle,
} from "./mbbe-capability.ts";
import {
  bootDesk,
  expectCompactFailAny,
  fillAttack,
  paddedBook,
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

describe.skipIf(!mbbe)(mbbeDescribeTitle("ADVERSARIAL — residual reconstructed vs stale opening"), () => {
  it("reconstructed residual fills in Compact sim; the consumed opening cannot", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 1280n, minFillBase: 10n });
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const afterPartial = randomBytes32();
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
      nextStateNonce: afterPartial,
    });
    expect(publicLedger(sim).fills).toBe(1n);

    const residual = residualOf(offer, placed.offerRand, fb, fq);
    const fromCore = coreResidualOf(offer, placed.offerRand, fb, fq);
    expect(residual.offer.baseAmount).toBe(20n);
    expect(residual.offer.quoteAmount).toBe(640n);
    expect(Buffer.from(residual.rand).equals(Buffer.from(fromCore.rand))).toBe(true);
    expect(Buffer.from(residual.offer.payNonce).equals(Buffer.from(fromCore.offer.payNonce))).toBe(true);

    const afterResidual = randomBytes32();
    sim = fillAttack(sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining - fb,
      stateNonce: afterPartial,
      nowBound: NOW,
      book: paddedBook([liveSlot(residual.offer, residual.rand)]),
      chosenIndex: 0n,
      fillBase: residual.offer.baseAmount,
      fillQuote: residual.offer.quoteAmount,
      nextStateNonce: afterResidual,
    });
    expect(publicLedger(sim).fills).toBe(2n);

    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - fb - residual.offer.baseAmount,
          stateNonce: afterResidual,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
          fillBase: fb,
          fillQuote: fq,
        }),
      ["offer already used"],
    );
    expect(publicLedger(sim).fills).toBe(2n);
  });

  it("stale opening mixed with residual amounts is not a tree leaf (distinct replay vector)", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker, { baseAmount: 40n, quoteAmount: 1280n, minFillBase: 10n });
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const afterPartial = randomBytes32();
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
      nextStateNonce: afterPartial,
    });
    const residual = residualOf(offer, placed.offerRand, fb, fq);
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - fb,
          stateNonce: afterPartial,
          nowBound: NOW,
          book: paddedBook([liveSlot(residual.offer, placed.offerRand)]),
          chosenIndex: 0n,
          fillBase: residual.offer.baseAmount,
          fillQuote: residual.offer.quoteAmount,
        }),
      ["offer not in tree", "not in historic Merkle tree", "offer path mismatch"],
    );
    expect(publicLedger(sim).fills).toBe(1n);
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("ADVERSARIAL — padding copies live=false cannot win"), () => {
  it("a live=false copy of a strictly better offer cannot be selected and cannot dominate", () => {
    const desk = bootDesk();
    const better = sellOffer(desk.k.maker, { quoteAmount: 2000n });
    const worse = sellOffer(desk.k.maker, { quoteAmount: 1280n });
    let sim = desk.sim;
    const pBetter = placeQuoted(sim, desk.k.makerSk, better);
    sim = pBetter.sim;
    const pWorse = placeQuoted(sim, desk.k.makerSk, worse);
    sim = pWorse.sim;
    const book = paddedBook([
      liveSlot(better, pBetter.offerRand, false),
      liveSlot(worse, pWorse.offerRand, true),
    ]);
    expect(book[0]?.live).toBe(false);
    expect(pickChosenIndex(book, desk.mandate, NOW, desk.remaining)).toBe(1n);

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
      ["chosen slot is empty"],
    );
    expect(publicLedger(sim).fills).toBe(0n);

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

  it("agent never selects a live=false padding copy when a live sibling exists", () => {
    const desk = bootDesk();
    const better = sellOffer(desk.k.maker, { quoteAmount: 2000n });
    const worse = sellOffer(desk.k.maker, { quoteAmount: 1280n });
    const decision = decideFill({
      esk: desk.k.esk,
      mandate: desk.mandate,
      remaining: desk.remaining,
      nowBound: NOW,
      revoked: false,
      candidates: [
        { id: "pad-better", offer: better, remaining: desk.remaining, receivedAt: 1, rand: randomBytes32(), live: false },
        { id: "worse-live", offer: worse, remaining: desk.remaining, receivedAt: 2, rand: randomBytes32(), live: true },
      ],
      allowCounterparty: () => true,
    });
    expect(decision.action).toBe("fill");
    if (decision.action !== "fill") throw new Error("expected fill");
    expect(decision.id).toBe("worse-live");
    expect(decision.book[Number(decision.chosenIndex)]?.live).toBe(true);
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("ADVERSARIAL — duplicate candidate / fake padding"), () => {
  it("duplicate live copies of the same posted opening fill once; the second copy cannot settle", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const dup: AttackSlot[] = [
      liveSlot(offer, placed.offerRand, true),
      liveSlot(offer, placed.offerRand, true),
      liveSlot(offer, placed.offerRand, false),
    ];
    const nextStateNonce = randomBytes32();
    let sim = fillAttack(placed.sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book: dup,
      chosenIndex: 0n,
      nextStateNonce,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - offer.baseAmount,
          stateNonce: nextStateNonce,
          nowBound: NOW,
          book: dup,
          chosenIndex: 1n,
        }),
      ["offer already used"],
    );
    expect(publicLedger(sim).fills).toBe(1n);
  });

  it("fake padding (mutated opening + stolen path) hits Compact offer path mismatch", () => {
    const desk = bootDesk();
    const honest = sellOffer(desk.k.maker, { quoteAmount: 1280n });
    const placed = placeQuoted(desk.sim, desk.k.makerSk, honest);
    const stolen = offerPath(placed.sim, honest, placed.offerRand);
    const fakeBetter: Offer = { ...honest, quoteAmount: 50_000n };
    const book: AttackSlot[] = [
      { offer: honest, rand: placed.offerRand, live: true },
      { offer: fakeBetter, rand: placed.offerRand, live: true, pathOverride: stolen },
      { offer: honest, rand: placed.offerRand, live: false },
    ];
    expectCompactFailAny(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book,
          chosenIndex: 1n,
        }),
      ["offer path mismatch"],
    );
    expectCompactFailAny(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book,
          chosenIndex: 0n,
        }),
      ["offer path mismatch"],
    );
    expect(publicLedger(placed.sim).fills).toBe(0n);
  });

  it("an unposted fake better candidate is not a historic leaf", () => {
    const desk = bootDesk();
    const honest = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, honest);
    const ghost = sellOffer(desk.k.maker, { quoteAmount: 50_000n });
    expectCompactFailAny(
      () =>
        fillAttack(placed.sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining,
          stateNonce: desk.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(ghost, randomBytes32()), liveSlot(honest, placed.offerRand)]),
          chosenIndex: 0n,
        }),
      ["offer not in tree", "not in historic Merkle tree", "offer path mismatch"],
    );
    expect(publicLedger(placed.sim).fills).toBe(0n);
  });

  it("duplicate candidate ids still select a live slot, never the padding copy", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const rand = randomBytes32();
    const decision = decideFill({
      esk: desk.k.esk,
      mandate: desk.mandate,
      remaining: desk.remaining,
      nowBound: NOW,
      revoked: false,
      candidates: [
        { id: "same", offer, remaining: desk.remaining, receivedAt: 1, rand, live: true },
        { id: "same", offer, remaining: desk.remaining, receivedAt: 2, rand, live: true },
        { id: "pad", offer, remaining: desk.remaining, receivedAt: 3, rand, live: false },
      ],
      allowCounterparty: () => true,
    });
    expect(decision.action).toBe("fill");
    if (decision.action !== "fill") throw new Error("expected fill");
    expect(decision.id).toBe("same");
    expect(decision.book[Number(decision.chosenIndex)]?.live).toBe(true);
    expect(decision.chosenIndex).toBe(0n);
  });
});
