import { describe, it, expect } from "vitest";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import {
  padBook,
  pickChosenIndex,
  slotEligible,
  strictlyBetter,
  withOfferDefaults,
} from "../../packages/core/src/mbbe.ts";

describe("MBBE TypeScript ranking matches Compact pure helpers", () => {
  const maker = pureCircuits.ownerKey(randomBytes32());
  const mandate = {
    principal: pureCircuits.ownerKey(randomBytes32()),
    executor: pureCircuits.executorKey(randomBytes32()),
    side: 0n,
    maxFillBase: 50n,
    limitNum: 30n,
    limitDen: 1000n,
    cpRoot: 0n,
    expiry: 4_000_000_000n,
    mandateId: randomBytes32(),
  };
  const nowBound = 1_800_000_000n;

  it("pads to K=3 from a single live slot", () => {
    const offer = withOfferDefaults({
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker,
      payNonce: randomBytes32(),
    });
    const live = { offer, rand: randomBytes32(), live: true };
    const book = padBook([live]);
    expect(book).toHaveLength(3);
    expect(book[0]?.live).toBe(true);
    expect(book[1]?.live).toBe(false);
    expect(book[2]?.live).toBe(false);
    expect(book[1]?.rand).toEqual(live.rand);
  });

  it("pads from the first live slot and refuses an empty book", () => {
    const dead = {
      offer: withOfferDefaults({
        side: 1n,
        baseAmount: 40n,
        quoteAmount: 2000n,
        maker,
        payNonce: randomBytes32(),
      }),
      rand: randomBytes32(),
      live: false,
    };
    const live = {
      offer: withOfferDefaults({
        side: 1n,
        baseAmount: 40n,
        quoteAmount: 1280n,
        maker,
        payNonce: randomBytes32(),
      }),
      rand: randomBytes32(),
      live: true,
    };
    const book = padBook([dead, live]);
    expect(book).toHaveLength(3);
    expect(book[2]?.live).toBe(false);
    expect(Buffer.from(book[2]!.rand).equals(Buffer.from(live.rand))).toBe(true);
    expect(() => padBook([])).toThrow(/at least one slot/);
  });

  it("picks the better eligible quote and ignores a cheaper ineligible live slot", () => {
    const cheap = {
      offer: withOfferDefaults({
        side: 1n,
        baseAmount: 40n,
        quoteAmount: 1n,
        maker,
        payNonce: randomBytes32(),
      }),
      rand: randomBytes32(),
      live: true,
    };
    const mid = {
      offer: withOfferDefaults({
        side: 1n,
        baseAmount: 40n,
        quoteAmount: 1400n,
        maker,
        payNonce: randomBytes32(),
      }),
      rand: randomBytes32(),
      live: true,
    };
    const best = {
      offer: withOfferDefaults({
        side: 1n,
        baseAmount: 40n,
        quoteAmount: 1600n,
        maker,
        payNonce: randomBytes32(),
      }),
      rand: randomBytes32(),
      live: true,
    };
    expect(slotEligible(cheap, mandate, nowBound, 100n)).toBe(false);
    expect(slotEligible(mid, mandate, nowBound, 100n)).toBe(true);
    expect(slotEligible(best, mandate, nowBound, 100n)).toBe(true);
    expect(strictlyBetter(best, mid, mandate, 100n)).toBe(true);
    expect(pureCircuits.betterPrice(best.offer, mid.offer, 0n)).toBe(true);
    const idx = pickChosenIndex([cheap, mid, best], mandate, nowBound, 100n);
    expect(idx).toBe(2n);
  });
});
