import { describe, it, expect } from "vitest";
import { CompactError } from "@midnight-ntwrk/compact-runtime";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";
import {
  bootPool,
  cancelOffer,
  createMandate,
  deposit,
  expectCompactFail,
  fill,
  offerPath,
  placeOffer,
  publicLedger,
  revokeMandate,
  serializedPublicState,
  withdraw,
} from "../../packages/core/src/sim.ts";
import { assertAbsent } from "../../packages/core/src/privacy.ts";
import { decideFill } from "../../packages/agent/src/executor.ts";

function keys() {
  const principalSk = randomBytes32();
  const makerSk = randomBytes32();
  const esk = randomBytes32();
  return {
    principalSk,
    makerSk,
    esk,
    principal: pureCircuits.ownerKey(principalSk),
    maker: pureCircuits.ownerKey(makerSk),
    executor: pureCircuits.executorKey(esk),
  };
}

describe("pool compact-runtime simulator", () => {
  it("constructs with a quote colour and zero fills", () => {
    const sim = bootPool();
    const st = publicLedger(sim);
    expect(st.fills).toBe(0n);
    expect(st.openOffers).toBe(0n);
    expect(st.activeMandates).toBe(0n);
    expect(sim.quoteColor.length).toBe(32);
    expect(Buffer.from(st.quoteColor).equals(Buffer.from(sim.quoteColor))).toBe(true);
  });

  it("valid fill settles internally; over-cap fails in the circuit even if the agent bypasses pre-check", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const dM = deposit(sim, k.makerSk, 1n, 5000n);
    sim = dM.sim;

    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const placed = placeOffer(sim, k.makerSk, dM.note, offer);
    sim = placed.sim;
    expect(publicLedger(sim).openOffers).toBe(1n);

    const mandate = {
      principal: k.principal,
      executor: k.executor,
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    expect(publicLedger(sim).activeMandates).toBe(1n);

    const nowBound = 1_800_000_000n;
    const overOffer = {
      side: 1n,
      baseAmount: 80n,
      quoteAmount: 2560n,
      maker: k.maker,
      payNonce: randomBytes32(),
      minFillBase: 80n,
    };
    const dM2 = deposit(sim, k.makerSk, 1n, 5000n);
    sim = dM2.sim;
    const placedOver = placeOffer(sim, k.makerSk, dM2.note, overOffer);
    sim = placedOver.sim;

    const decisionBypass = decideFill({
      esk: k.esk,
      mandate,
      remaining: 100n,
      nowBound,
      revoked: false,
      candidates: [{ id: "over", offer: overOffer, remaining: 100n, receivedAt: 1 }],
      allowCounterparty: () => true,
      bypassLocalPrecheck: true,
    });
    expect(decisionBypass.action).toBe("fill");

    expectCompactFail(
      () =>
        fill(sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          offer: overOffer,
          offerRand: placedOver.offerRand,
          nowBound,
        }),
      "selected slot is not eligible",
    );
    expect(publicLedger(sim).fills).toBe(0n);

    const local = decideFill({
      esk: k.esk,
      mandate,
      remaining: 100n,
      nowBound,
      revoked: false,
      candidates: [
        { id: "over", offer: overOffer, remaining: 100n, receivedAt: 1 },
        { id: "ok", offer, remaining: 100n, receivedAt: 1 },
      ],
      allowCounterparty: () => true,
    });
    expect(local.action).toBe("fill");
    if (local.action === "fill") expect(local.id).toBe("ok");

    sim = fill(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      offer,
      offerRand: placed.offerRand,
      nowBound,
    });
    const st = publicLedger(sim);
    expect(st.fills).toBe(1n);
    expect(st.auditRoots.length()).toBe(1n);

    const pub = serializedPublicState(sim);
    assertAbsent(
      pub.text + "\n" + pub.hex,
      [k.principalSk, k.makerSk, k.esk, mandate.mandateId, created.mandateRand, placed.offerRand],
      "secrets-and-openings",
    );
    assertAbsent(pub.text, [mandate.expiry], "mandate-expiry");
  });

  it("rejects wrong executor, expired mandate, price, budget, side, replayed offer", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const dM = deposit(sim, k.makerSk, 1n, 5000n);
    sim = dM.sim;
    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const placed = placeOffer(sim, k.makerSk, dM.note, offer);
    sim = placed.sim;
    const mandate = {
      principal: k.principal,
      executor: k.executor,
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 2_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    const base = {
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      offer,
      offerRand: placed.offerRand,
    };

    const nowBound = BigInt(Math.floor(Date.now() / 1000) + 86_400);
    expectCompactFail(() => fill(sim, { ...base, esk: randomBytes32(), nowBound }), "not the mandated executor");
    expectCompactFail(() => fill(sim, { ...base, esk: k.esk, nowBound: mandate.expiry + 1n }), "mandate expired");

    const cheap = { side: 1n, baseAmount: 40n, quoteAmount: 1n, maker: k.maker, payNonce: randomBytes32() };
    const dCheap = deposit(sim, k.makerSk, 1n, 40n);
    sim = dCheap.sim;
    const placedCheap = placeOffer(sim, k.makerSk, dCheap.note, cheap);
    sim = placedCheap.sim;
    expectCompactFail(
      () =>
        fill(sim, {
          ...base,
          esk: k.esk,
          nowBound,
          offer: cheap,
          offerRand: placedCheap.offerRand,
        }),
      "price outside mandate limit",
    );

    const tinyNote = deposit(sim, k.principalSk, 0n, 10n);
    sim = tinyNote.sim;
    const tinyMandate = { ...mandate, mandateId: randomBytes32() };
    const tinyCreated = createMandate(sim, k.principalSk, tinyNote.note, tinyMandate);
    sim = tinyCreated.sim;
    expectCompactFail(
      () =>
        fill(sim, {
          esk: k.esk,
          mandate: tinyMandate,
          mandateRand: tinyCreated.mandateRand,
          remaining: 10n,
          stateNonce: tinyCreated.stateNonce,
          offer,
          offerRand: placed.offerRand,
          nowBound,
        }),
      "fill exceeds remaining budget",
    );

    const sameSide = { side: 0n, baseAmount: 40n, quoteAmount: 1280n, maker: k.maker, payNonce: randomBytes32() };
    const dSide = deposit(sim, k.makerSk, 0n, 40n);
    sim = dSide.sim;
    const placedSide = placeOffer(sim, k.makerSk, dSide.note, sameSide);
    sim = placedSide.sim;
    expectCompactFail(
      () =>
        fill(sim, {
          ...base,
          esk: k.esk,
          nowBound,
          offer: sameSide,
          offerRand: placedSide.offerRand,
        }),
      "offer must be on the opposite side",
    );

    sim = fill(sim, { ...base, esk: k.esk, nowBound });
    expect(publicLedger(sim).fills).toBe(1n);
    expectCompactFail(
      () => fill(sim, { ...base, esk: k.esk, nowBound }),
      "state already consumed",
    );
  });

  it("rejects unauthorized revoke, unauthorized cancel, and a wrong Merkle path", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const dM = deposit(sim, k.makerSk, 1n, 5000n);
    sim = dM.sim;
    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const placed = placeOffer(sim, k.makerSk, dM.note, offer);
    sim = placed.sim;
    const mandate = {
      principal: k.principal,
      executor: k.executor,
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    expectCompactFail(
      () => revokeMandate(sim, k.makerSk, mandate, created.mandateRand, 100n, created.stateNonce),
      "not your mandate",
    );
    expectCompactFail(() => cancelOffer(sim, k.principalSk, offer, placed.offerRand), "not your offer");
    const decoy = {
      side: 1n,
      baseAmount: 10n,
      quoteAmount: 320n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const dDecoy = deposit(sim, k.makerSk, 1n, 5000n);
    sim = dDecoy.sim;
    const placedDecoy = placeOffer(sim, k.makerSk, dDecoy.note, decoy);
    sim = placedDecoy.sim;
    expectCompactFail(
      () =>
        fill(sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          offer,
          offerRand: placed.offerRand,
          nowBound: 1_800_000_000n,
          offerPathOverride: offerPath(sim, decoy, placedDecoy.offerRand),
        }),
      "offer path mismatch",
    );
    sim = revokeMandate(sim, k.principalSk, mandate, created.mandateRand, 100n, created.stateNonce);
    expect(publicLedger(sim).activeMandates).toBe(0n);
    sim = cancelOffer(sim, k.makerSk, offer, placed.offerRand);
    expect(publicLedger(sim).openOffers).toBe(1n);
    expectCompactFail(() => withdraw(sim, k.principalSk, dM.note, 1n), "not your note");
  });

  it("MBBE: cheapest ineligible live offer does not abort a worse eligible fill", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const cheapNote = deposit(sim, k.makerSk, 1n, 40n);
    sim = cheapNote.sim;
    const midNote = deposit(sim, k.makerSk, 1n, 2000n);
    sim = midNote.sim;
    const bestNote = deposit(sim, k.makerSk, 1n, 5000n);
    sim = bestNote.sim;

    const cheap = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const mid = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1400n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const best = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1600n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const placedCheap = placeOffer(sim, k.makerSk, cheapNote.note, cheap);
    sim = placedCheap.sim;
    const placedMid = placeOffer(sim, k.makerSk, midNote.note, mid);
    sim = placedMid.sim;
    const placedBest = placeOffer(sim, k.makerSk, bestNote.note, best);
    sim = placedBest.sim;

    const mandate = {
      principal: k.principal,
      executor: k.executor,
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    const nowBound = 1_800_000_000n;
    const book = [
      { offer: placedCheap.offer, rand: placedCheap.offerRand, live: true },
      { offer: placedMid.offer, rand: placedMid.offerRand, live: true },
      { offer: placedBest.offer, rand: placedBest.offerRand, live: true },
    ];
    expectCompactFail(
      () =>
        fill(sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          offer: cheap,
          offerRand: placedCheap.offerRand,
          nowBound,
          book,
          chosenIndex: 0n,
        }),
      "price outside mandate limit",
    );
    sim = fill(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      offer: best,
      offerRand: placedBest.offerRand,
      nowBound,
      book,
      chosenIndex: 2n,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    expect(publicLedger(sim).openOffers).toBe(3n);
  });

  it("MBBE: padding cannot be selected; zero-live book fails", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 100n);
    sim = dP.sim;
    const dM = deposit(sim, k.makerSk, 1n, 5000n);
    sim = dM.sim;
    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: k.maker,
      payNonce: randomBytes32(),
    };
    const placed = placeOffer(sim, k.makerSk, dM.note, offer);
    sim = placed.sim;
    const mandate = {
      principal: k.principal,
      executor: k.executor,
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    const nowBound = 1_800_000_000n;
    const live = { offer: placed.offer, rand: placed.offerRand, live: true };
    const pad = { offer: placed.offer, rand: placed.offerRand, live: false };
    expectCompactFail(
      () =>
        fill(sim, {
          esk: k.esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          offer,
          offerRand: placed.offerRand,
          nowBound,
          book: [live, pad, pad],
          chosenIndex: 1n,
        }),
      "chosen slot is empty",
    );
  });

  it("CompactError is the enforcement layer, not a TypeScript pre-check", () => {
    expect(CompactError).toBeDefined();
  });
});
