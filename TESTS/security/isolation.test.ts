import { describe, it, expect } from "vitest";
import { decideFill } from "../../packages/agent/src/executor.ts";
import { pickChosenIndex } from "../../packages/core/src/mbbe.ts";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import { emptyPrivateState } from "../../packages/core/src/state.ts";
import { tabStorageKeys } from "../../packages/core/src/tab-seal.ts";
import { bootPool, createMandate, deposit, expectCompactFail, fill, publicLedger, withdraw } from "../../packages/core/src/sim.ts";
import {
  buyMandate,
  cancelAttackOffer,
  expectCompactFailAny,
  fillAttack,
  keys,
  paddedBook,
  placeQuoted,
  residualOf,
  sellOffer,
} from "./mbbe-harness.ts";

const NOW = 1_800_000_000n;

describe("multi-principal / wallet isolation", () => {
  it("tab private-state keys never collide across wallets, pools, or networks", () => {
    const a = tabStorageKeys("preprod", "pool-a", "wallet-a");
    const b = tabStorageKeys("preprod", "pool-a", "wallet-b");
    const c = tabStorageKeys("preprod", "pool-b", "wallet-a");
    const d = tabStorageKeys("undeployed", "pool-a", "wallet-a");
    const keysSet = new Set([a.blob, b.blob, c.blob, d.blob, a.wrap, b.wrap, c.wrap, d.wrap]);
    expect(keysSet.size).toBe(8);
    expect(emptyPrivateState("wallet-a").notes).not.toBe(emptyPrivateState("wallet-b").notes);
  });

  it("the same executor cannot fill principal B's mandate with principal A's remaining", () => {
    const a = keys();
    const b = keys();
    const esk = a.esk;
    const executor = a.executor;
    let sim = bootPool();
    const offer = sellOffer(a.maker, { quoteAmount: 1280n });
    const placed = placeQuoted(sim, a.makerSk, offer);
    sim = placed.sim;
    const dA = deposit(sim, a.principalSk, 0n, 100n);
    sim = dA.sim;
    const dB = deposit(sim, b.principalSk, 0n, 10n);
    sim = dB.sim;
    const mandateA = buyMandate(a, { executor });
    const mandateB = buyMandate(b, { executor });
    const createdA = createMandate(sim, a.principalSk, dA.note, mandateA);
    sim = createdA.sim;
    const createdB = createMandate(sim, b.principalSk, dB.note, mandateB);
    sim = createdB.sim;

    expectCompactFail(
      () =>
        fill(sim, {
          esk,
          mandate: mandateB,
          mandateRand: createdB.mandateRand,
          remaining: 100n,
          stateNonce: createdA.stateNonce,
          offer: placed.offer,
          offerRand: placed.offerRand,
          nowBound: 1_800_000_000n,
        }),
      "state",
    );
    expect(publicLedger(sim).fills).toBe(0n);
  });

  it("an opening from mandate A is not selected under mandate B's constraints", () => {
    const a = keys();
    const b = keys();
    const offerA = sellOffer(a.maker, { quoteAmount: 1600n, minFillBase: 40n });
    const decision = decideFill({
      esk: b.esk,
      mandate: buyMandate(b, { maxFillBase: 10n, limitNum: 30n, limitDen: 1000n }),
      remaining: 10n,
      nowBound: 1_800_000_000n,
      revoked: false,
      candidates: [{ id: "foreign", offer: offerA, remaining: 10n, receivedAt: 1, live: true }],
      allowCounterparty: () => true,
    });
    expect(decision.action).toBe("reject");
  });
});

describe("isolation — wrong executor, cancelled/expired K-set, padding, residual replay", () => {
  it("wrong executor is rejected locally and by Compact", () => {
    const a = keys();
    const stranger = keys();
    const offer = sellOffer(a.maker);
    const local = decideFill({
      esk: stranger.esk,
      mandate: buyMandate(a),
      remaining: 100n,
      nowBound: NOW,
      revoked: false,
      candidates: [{ id: "o", offer, remaining: 100n, receivedAt: 1, live: true }],
      allowCounterparty: () => true,
    });
    expect(local.action).toBe("reject");
    expect(local.ranked.some((r) => !r.ok && r.reason === "wrong-executor")).toBe(true);

    let sim = bootPool();
    const placed = placeQuoted(sim, a.makerSk, offer);
    sim = placed.sim;
    const dP = deposit(sim, a.principalSk, 0n, 100n);
    sim = dP.sim;
    const mandate = buyMandate(a);
    const created = createMandate(sim, a.principalSk, dP.note, mandate);
    expectCompactFail(
      () =>
        fillAttack(created.sim, {
          esk: stranger.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          nowBound: NOW,
          book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
          chosenIndex: 0n,
        }),
      "not the mandated executor",
    );
    expect(publicLedger(created.sim).fills).toBe(0n);
  });

  it("a cancelled candidate in the K-set is not selected; Compact rejects filling it", () => {
    const k = keys();
    const cancelled = sellOffer(k.maker, { quoteAmount: 2000n });
    const live = sellOffer(k.maker, { quoteAmount: 1280n });
    let sim = bootPool();
    const pC = placeQuoted(sim, k.makerSk, cancelled);
    sim = pC.sim;
    const pL = placeQuoted(sim, k.makerSk, live);
    sim = pL.sim;
    sim = cancelAttackOffer(sim, k.makerSk, cancelled, pC.offerRand);

    const decision = decideFill({
      esk: k.esk,
      mandate: buyMandate(k),
      remaining: 100n,
      nowBound: NOW,
      revoked: false,
      candidates: [
        { id: "cancelled", offer: cancelled, remaining: 100n, receivedAt: 1, rand: pC.offerRand, live: false },
        { id: "live", offer: live, remaining: 100n, receivedAt: 2, rand: pL.offerRand, live: true },
      ],
      allowCounterparty: () => true,
    });
    expect(decision.action).toBe("fill");
    if (decision.action === "fill") expect(decision.id).toBe("live");

    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const mandate = buyMandate(k);
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
          book: paddedBook([
            { offer: cancelled, rand: pC.offerRand, live: true },
            { offer: live, rand: pL.offerRand, live: true },
          ]),
          chosenIndex: 0n,
        }),
      "offer already used",
    );
    expect(publicLedger(created.sim).fills).toBe(0n);
  });

  it("an expired candidate is rejected locally and cannot be the Compact selection", () => {
    const k = keys();
    const expired = sellOffer(k.maker, { expiry: NOW - 5n, quoteAmount: 2000n });
    const live = sellOffer(k.maker, { quoteAmount: 1280n });
    const local = decideFill({
      esk: k.esk,
      mandate: buyMandate(k),
      remaining: 100n,
      nowBound: NOW,
      revoked: false,
      candidates: [
        { id: "expired", offer: expired, remaining: 100n, receivedAt: 1, live: true },
        { id: "live", offer: live, remaining: 100n, receivedAt: 2, live: true },
      ],
      allowCounterparty: () => true,
    });
    expect(local.action).toBe("fill");
    if (local.action === "fill") expect(local.id).toBe("live");

    let sim = bootPool();
    const pExp = placeQuoted(sim, k.makerSk, expired);
    sim = pExp.sim;
    const pLive = placeQuoted(sim, k.makerSk, live);
    sim = pLive.sim;
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const mandate = buyMandate(k);
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    expectCompactFailAny(
      () =>
        fillAttack(created.sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          nowBound: NOW,
          book: paddedBook([
            { offer: expired, rand: pExp.offerRand, live: true },
            { offer: live, rand: pLive.offerRand, live: true },
          ]),
          chosenIndex: 0n,
        }),
      ["offer expired", "selected slot is not eligible"],
    );
    expect(publicLedger(created.sim).fills).toBe(0n);
  });

  it("a padding slot (live:false copy of a live offer) is never selected", () => {
    const k = keys();
    const offer = sellOffer(k.maker);
    const book = paddedBook([{ offer, rand: randomBytes32(), live: true }]);
    expect(book).toHaveLength(3);
    expect(book[1]?.live).toBe(false);
    expect(book[2]?.live).toBe(false);
    const mandate = buyMandate(k);
    expect(pickChosenIndex(book, mandate, NOW, 100n)).toBe(0n);

    const decision = decideFill({
      esk: k.esk,
      mandate,
      remaining: 100n,
      nowBound: NOW,
      revoked: false,
      candidates: [{ id: "only", offer, remaining: 100n, receivedAt: 1, rand: book[0]!.rand, live: true }],
      allowCounterparty: () => true,
    });
    expect(decision.action).toBe("fill");
    if (decision.action === "fill") {
      expect(decision.chosenIndex).toBe(0n);
      expect(decision.book[1]?.live).toBe(false);
      expect(decision.book[2]?.live).toBe(false);
    }

    let sim = bootPool();
    const placed = placeQuoted(sim, k.makerSk, offer);
    sim = placed.sim;
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    const padded = paddedBook([{ offer, rand: placed.offerRand, live: true }]);
    expectCompactFail(
      () =>
        fillAttack(created.sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          nowBound: NOW,
          book: padded,
          chosenIndex: 2n,
        }),
      "chosen slot is empty",
    );
    expect(publicLedger(created.sim).fills).toBe(0n);
  });

  it("replaying the residual's old opening after a partial fill fails", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const mandate = buyMandate(k);
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    const offer = sellOffer(k.maker, { baseAmount: 40n, quoteAmount: 1280n, minFillBase: 10n });
    const placed = placeQuoted(sim, k.makerSk, offer);
    sim = placed.sim;
    const nextStateNonce = randomBytes32();
    const fb = 20n;
    const fq = 640n;
    sim = fillAttack(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      nowBound: NOW,
      book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
      chosenIndex: 0n,
      fillBase: fb,
      fillQuote: fq,
      nextStateNonce,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    const residual = residualOf(offer, placed.offerRand, fb, fq);
    expect(residual.offer.baseAmount).toBe(20n);
    expectCompactFail(
      () =>
        fillAttack(sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 80n,
          stateNonce: nextStateNonce,
          nowBound: NOW,
          book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
          chosenIndex: 0n,
          fillBase: fb,
          fillQuote: fq,
        }),
      "offer already used",
    );
    expect(publicLedger(sim).fills).toBe(1n);
  });

  it("witness remaining must match the committed mandate state (cross-mandate budget swap)", () => {
    const a = keys();
    const b = keys();
    const esk = a.esk;
    const executor = a.executor;
    let sim = bootPool();
    const offer = sellOffer(a.maker);
    const placed = placeQuoted(sim, a.makerSk, offer);
    sim = placed.sim;
    const dA = deposit(sim, a.principalSk, 0n, 100n);
    sim = dA.sim;
    const dB = deposit(sim, b.principalSk, 0n, 10n);
    sim = dB.sim;
    const mandateA = buyMandate(a, { executor });
    const mandateB = buyMandate(b, { executor });
    const createdA = createMandate(sim, a.principalSk, dA.note, mandateA);
    sim = createdA.sim;
    const createdB = createMandate(sim, b.principalSk, dB.note, mandateB);
    sim = createdB.sim;

    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk,
          mandate: mandateA,
          mandateRand: createdA.mandateRand,
          remaining: 10n,
          stateNonce: createdA.stateNonce,
          nowBound: NOW,
          book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
          chosenIndex: 0n,
        }),
      ["mandate-state not in historic Merkle tree", "state path mismatch", "unknown state"],
    );
    expectCompactFailAny(
      () =>
        fillAttack(sim, {
          esk,
          mandate: mandateB,
          mandateRand: createdB.mandateRand,
          remaining: 100n,
          stateNonce: createdA.stateNonce,
          nowBound: NOW,
          book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
          chosenIndex: 0n,
        }),
      ["state/mandate mismatch", "state path mismatch", "unknown state", "mandate-state not in historic Merkle tree"],
    );
    expect(publicLedger(sim).fills).toBe(0n);
  });

  it("wallet B cannot spend wallet A's note; A cannot cancel B's offer", () => {
    const a = keys();
    const b = keys();
    let sim = bootPool();
    const dA = deposit(sim, a.principalSk, 0n, 40n);
    sim = dA.sim;
    expectCompactFail(() => withdraw(sim, b.principalSk, dA.note, 40n), "not your note");

    const offerB = sellOffer(b.maker);
    const placedB = placeQuoted(sim, b.makerSk, offerB);
    expectCompactFail(() => cancelAttackOffer(placedB.sim, a.makerSk, offerB, placedB.offerRand), "not your offer");
    expect(publicLedger(placedB.sim).fills).toBe(0n);
  });
});

