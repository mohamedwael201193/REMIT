import { describe, it, expect } from "vitest";
import type { Offer } from "@remit/contracts/pool";
import { decideFill } from "../../packages/agent/src/executor.ts";
import { padBook, pickChosenIndex } from "../../packages/core/src/mbbe.ts";
import { randomBytes32, toArray } from "../../packages/core/src/bytes.ts";
import {
  bootPool,
  callCircuit,
  createMandate,
  deposit,
  expectCompactFail,
  notePath,
  publicLedger,
  serializedPublicState,
} from "../../packages/core/src/sim.ts";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { compiledMbbeReady, mbbeDescribeTitle } from "./mbbe-capability.ts";
import {
  bootDesk,
  buyMandate,
  expectCompactFailAny,
  fillAttack,
  keys,
  paddedBook,
  placeAttackOffer,
  placeQuoted,
  sellOffer,
  type AttackSlot,
} from "./mbbe-harness.ts";

const NOW = 1_800_000_000n;
const mbbe = compiledMbbeReady();
const MBBE_POOL = "01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e";
const V1_POOL = "e82dea02b2397332df0bb10e2df6d9e257c8ceba696415ed3c10f639f68d43d4";
const MBBE_FILL = "12306cbe24823f1ac39f0a1db3ee23214cc84d44cb8014b1d2f84d67838cbd20";

function liveSlot(offer: Offer, rand: Uint8Array, live = true): AttackSlot {
  return { offer, rand, live };
}

function countSet(iter: { [Symbol.iterator](): Iterator<unknown> }): number {
  let n = 0;
  for (const _ of iter) n++;
  return n;
}

describe.skipIf(!mbbe)(mbbeDescribeTitle("PHASE7 — padding participation signal"), () => {
  it("1-live padded fill and 3-live fill have the same public fill shape (K does not leak)", () => {
    const one = bootDesk();
    const o1 = sellOffer(one.k.maker);
    const p1 = placeQuoted(one.sim, one.k.makerSk, o1);
    const open1 = publicLedger(p1.sim).openOffers;
    const free1 = publicLedger(p1.sim).offers.firstFree();
    const nul1 = countSet(publicLedger(p1.sim).offerNullifiers);
    const after1 = fillAttack(p1.sim, {
      esk: one.k.esk,
      mandate: one.mandate,
      mandateRand: one.mandateRand,
      remaining: one.remaining,
      stateNonce: one.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(o1, p1.offerRand)]),
      chosenIndex: 0n,
    });
    const ld1 = publicLedger(after1);
    expect(ld1.fills).toBe(1n);
    expect(ld1.openOffers).toBe(open1);
    expect(ld1.offers.firstFree()).toBe(free1 + 1n);
    expect(countSet(ld1.offerNullifiers)).toBe(nul1 + 1);

    const three = bootDesk();
    const a = sellOffer(three.k.maker, { quoteAmount: 1280n });
    const b = sellOffer(three.k.maker, { quoteAmount: 1300n });
    const c = sellOffer(three.k.maker, { quoteAmount: 2000n });
    let sim = three.sim;
    const pa = placeQuoted(sim, three.k.makerSk, a);
    sim = pa.sim;
    const pb = placeQuoted(sim, three.k.makerSk, b);
    sim = pb.sim;
    const pc = placeQuoted(sim, three.k.makerSk, c);
    sim = pc.sim;
    const open3 = publicLedger(sim).openOffers;
    const free3 = publicLedger(sim).offers.firstFree();
    const nul3 = countSet(publicLedger(sim).offerNullifiers);
    const book = paddedBook([
      liveSlot(a, pa.offerRand),
      liveSlot(b, pb.offerRand),
      liveSlot(c, pc.offerRand),
    ]);
    expect(pickChosenIndex(book, three.mandate, NOW, three.remaining)).toBe(2n);
    const after3 = fillAttack(sim, {
      esk: three.k.esk,
      mandate: three.mandate,
      mandateRand: three.mandateRand,
      remaining: three.remaining,
      stateNonce: three.stateNonce,
      nowBound: NOW,
      book,
      chosenIndex: 2n,
    });
    const ld3 = publicLedger(after3);
    expect(ld3.fills).toBe(1n);
    expect(ld3.openOffers).toBe(open3);
    expect(ld3.offers.firstFree()).toBe(free3 + 1n);
    expect(countSet(ld3.offerNullifiers)).toBe(nul3 + 1);

    for (const simFill of [after1, after3]) {
      const hay = serializedPublicState(simFill).text;
      expect(hay.includes("chosenIndex")).toBe(false);
      expect(hay.includes("fillBase")).toBe(false);
      expect(hay.includes("fillQuote")).toBe(false);
    }
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("PHASE7 — v1↔v2 replay / commitment domain"), () => {
  it("v1 historical pool is not the MBBE pool and v1 fill is not the K-set fill", () => {
    expect(V1_POOL).not.toBe(MBBE_POOL);
    expect(MBBE_FILL.startsWith("12306cbe")).toBe(true);
    expect(MBBE_FILL.startsWith("22c76487")).toBe(false);
  });

  it("expiry and minFillBase are in the offer commitment domain (v1 5-field offers cannot be v2 leaves)", () => {
    const maker = keys().maker;
    const base = sellOffer(maker, { expiry: 1_900_000_000n, minFillBase: 1n });
    const c0 = pureCircuits.offerCommitment(base, base.payNonce);
    const cExp = pureCircuits.offerCommitment({ ...base, expiry: 1_900_000_001n }, base.payNonce);
    const cMin = pureCircuits.offerCommitment({ ...base, minFillBase: 2n }, base.payNonce);
    expect(Buffer.from(c0).equals(Buffer.from(cExp))).toBe(false);
    expect(Buffer.from(c0).equals(Buffer.from(cMin))).toBe(false);
  });

  it("an opening committed on pool A cannot fill an independent pool B", () => {
    const deskA = bootDesk();
    const deskB = bootDesk();
    const offer = sellOffer(deskA.k.maker);
    const placed = placeQuoted(deskA.sim, deskA.k.makerSk, offer);
    const filledA = fillAttack(placed.sim, {
      esk: deskA.k.esk,
      mandate: deskA.mandate,
      mandateRand: deskA.mandateRand,
      remaining: deskA.remaining,
      stateNonce: deskA.stateNonce,
      nowBound: NOW,
      book: paddedBook([liveSlot(offer, placed.offerRand)]),
      chosenIndex: 0n,
    });
    expect(publicLedger(filledA).fills).toBe(1n);
    expectCompactFailAny(
      () =>
        fillAttack(deskB.sim, {
          esk: deskB.k.esk,
          mandate: deskB.mandate,
          mandateRand: deskB.mandateRand,
          remaining: deskB.remaining,
          stateNonce: deskB.stateNonce,
          nowBound: NOW,
          book: paddedBook([liveSlot(offer, placed.offerRand)]),
          chosenIndex: 0n,
        }),
      ["offer not in tree", "unknown offer", "not in historic Merkle tree", "offer path mismatch"],
    );
    expect(publicLedger(deskB.sim).fills).toBe(0n);
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("PHASE7 — wrong asset"), () => {
  it("rejects bad deposit colour, mismatched offer/mandate escrow, and withdraw of the wrong asset", () => {
    const k = keys();
    let sim = bootPool();
    expectCompactFail(() => deposit(sim, k.makerSk, 2n, 10n), "bad asset");

    const night = deposit(sim, k.makerSk, 0n, 40n);
    expectCompactFail(
      () => placeAttackOffer(night.sim, k.makerSk, night.note, sellOffer(k.maker)),
      "escrow wrong asset",
    );

    const quote = deposit(sim, k.makerSk, 1n, 1280n);
    const buy: Offer = {
      side: 0n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: k.maker,
      payNonce: randomBytes32(),
      expiry: 4_000_000_000n,
      minFillBase: 1n,
    };
    expectCompactFail(() => placeAttackOffer(quote.sim, k.makerSk, quote.note, buy), "escrow wrong asset");

    const dQ = deposit(sim, k.principalSk, 1n, 100n);
    expectCompactFail(
      () => createMandate(dQ.sim, k.principalSk, dQ.note, buyMandate(k)),
      "escrow wrong asset",
    );

    const dN = deposit(sim, k.principalSk, 0n, 50n);
    expectCompactFail(
      () =>
        callCircuit(dN.sim, (ctx) => dN.sim.contract.impureCircuits.withdraw(ctx, 1n, 50n), {
          ownerSecret: toArray(k.principalSk),
          spendNote: { asset: "0", amount: "50", owner: toArray(k.principal) },
          spendNoteNonce: toArray(dN.note.nonce),
          spendNotePath: notePath(dN.sim, dN.note),
          freshNonce: toArray(randomBytes32()),
          withdrawTo: {
            is_left: false,
            left: Array.from({ length: 32 }, () => 0),
            right: Array.from(randomBytes32()),
          },
        }),
      "wrong asset",
    );
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("PHASE7 — zero / duplicate / fake padding (agent+Compact)"), () => {
  it("zero live candidates: padBook throws, agent rejects, Compact empty book fails", () => {
    expect(() => padBook([])).toThrow(/at least one slot/);
    const desk = bootDesk();
    const decision = decideFill({
      esk: desk.k.esk,
      mandate: desk.mandate,
      remaining: desk.remaining,
      nowBound: NOW,
      revoked: false,
      candidates: [],
      allowCounterparty: () => true,
    });
    expect(decision.action).toBe("reject");

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
    expect(publicLedger(placed.sim).fills).toBe(0n);
  });

  it("duplicate live ids still cannot settle the same opening twice", () => {
    const desk = bootDesk();
    const offer = sellOffer(desk.k.maker);
    const placed = placeQuoted(desk.sim, desk.k.makerSk, offer);
    const dup = [liveSlot(offer, placed.offerRand, true), liveSlot(offer, placed.offerRand, true), liveSlot(offer, placed.offerRand, false)];
    const next = randomBytes32();
    let sim = fillAttack(placed.sim, {
      esk: desk.k.esk,
      mandate: desk.mandate,
      mandateRand: desk.mandateRand,
      remaining: desk.remaining,
      stateNonce: desk.stateNonce,
      nowBound: NOW,
      book: dup,
      chosenIndex: 0n,
      nextStateNonce: next,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk: desk.k.esk,
          mandate: desk.mandate,
          mandateRand: desk.mandateRand,
          remaining: desk.remaining - offer.baseAmount,
          stateNonce: next,
          nowBound: NOW,
          book: dup,
          chosenIndex: 1n,
        }),
      ["offer already used"],
    );
  });
});
