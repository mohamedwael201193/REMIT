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
  placeOffer,
  publicLedger,
  revokeMandate,
  serializedPublicState,
  withdraw,
} from "../../packages/core/src/sim.ts";
import { assertAbsent } from "../../packages/core/src/privacy.ts";
import { decideFill } from "../../packages/agent/src/executor.ts";

describe("local compact-runtime lifecycle (not a Midnight node, not a mock of Preprod)", () => {
  it("deposit → offer → mandate → fill → leftover revoke/withdraw under Compact asserts", () => {
    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = randomBytes32();
    const principal = pureCircuits.ownerKey(principalSk);
    const maker = pureCircuits.ownerKey(makerSk);
    const executor = pureCircuits.executorKey(esk);

    let sim = bootPool();
    const dP = deposit(sim, principalSk, 0n, 100n);
    sim = dP.sim;
    const dM = deposit(sim, makerSk, 1n, 5000n);
    sim = dM.sim;
    const leftover = deposit(sim, principalSk, 0n, 25n);
    sim = leftover.sim;

    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker,
      payNonce: randomBytes32(),
    };
    const placed = placeOffer(sim, makerSk, dM.note, offer);
    sim = placed.sim;

    const mandate = {
      principal,
      executor,
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const created = createMandate(sim, principalSk, dP.note, mandate);
    sim = created.sim;

    const over = {
      side: 1n,
      baseAmount: 80n,
      quoteAmount: 2560n,
      maker,
      payNonce: randomBytes32(),
    };
    const dOver = deposit(sim, makerSk, 1n, 5000n);
    sim = dOver.sim;
    const placedOver = placeOffer(sim, makerSk, dOver.note, over);
    sim = placedOver.sim;

    const bypass = decideFill({
      esk,
      mandate,
      remaining: 100n,
      nowBound: 1_800_000_000n,
      revoked: false,
      candidates: [{ id: "over", offer: over, remaining: 100n, receivedAt: 0 }],
      allowCounterparty: () => true,
      bypassLocalPrecheck: true,
    });
    expect(bypass.action).toBe("fill");
    expectCompactFail(
      () =>
        fill(sim, {
          esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          offer: over,
          offerRand: placedOver.offerRand,
          nowBound: 1_800_000_000n,
        }),
      "fill exceeds per-fill cap",
    );

    sim = fill(sim, {
      esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      offer,
      offerRand: placed.offerRand,
      nowBound: 1_800_000_000n,
    });
    expect(publicLedger(sim).fills).toBe(1n);

    sim = cancelOffer(sim, makerSk, over, placedOver.offerRand);
    expect(publicLedger(sim).openOffers).toBe(0n);

    sim = withdraw(sim, principalSk, leftover.note, 10n);
    const pub = serializedPublicState(sim);
    assertAbsent(pub.text + "\n" + pub.hex, [principalSk, makerSk, esk, created.mandateRand, placed.offerRand], "lifecycle-openings");
    expect(CompactError).toBeDefined();
  });

  it("revoked mandate cannot fill", () => {
    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = randomBytes32();
    let sim = bootPool();
    const dP = deposit(sim, principalSk, 0n, 100n);
    sim = dP.sim;
    const dM = deposit(sim, makerSk, 1n, 5000n);
    sim = dM.sim;
    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: pureCircuits.ownerKey(makerSk),
      payNonce: randomBytes32(),
    };
    const placed = placeOffer(sim, makerSk, dM.note, offer);
    sim = placed.sim;
    const mandate = {
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
    const created = createMandate(sim, principalSk, dP.note, mandate);
    sim = created.sim;
    sim = revokeMandate(sim, principalSk, mandate, created.mandateRand, 100n, created.stateNonce);
    expectCompactFail(
      () =>
        fill(sim, {
          esk,
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          offer,
          offerRand: placed.offerRand,
          nowBound: 1_800_000_000n,
        }),
      "mandate revoked",
    );
  });

  it("wrong executor secret cannot fill", () => {
    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = randomBytes32();
    let sim = bootPool();
    const dP = deposit(sim, principalSk, 0n, 100n);
    sim = dP.sim;
    const dM = deposit(sim, makerSk, 1n, 5000n);
    sim = dM.sim;
    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: pureCircuits.ownerKey(makerSk),
      payNonce: randomBytes32(),
    };
    const placed = placeOffer(sim, makerSk, dM.note, offer);
    sim = placed.sim;
    const mandate = {
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
    const created = createMandate(sim, principalSk, dP.note, mandate);
    sim = created.sim;
    expectCompactFail(
      () =>
        fill(sim, {
          esk: randomBytes32(),
          mandate,
          mandateRand: created.mandateRand,
          remaining: 100n,
          stateNonce: created.stateNonce,
          offer,
          offerRand: placed.offerRand,
          nowBound: 1_800_000_000n,
        }),
      "not the mandated executor",
    );
  });
});
