import { describe, it, expect } from "vitest";
import { randomBytes32, encodingsOfBytes, encodingsOfBigint, toHex } from "../../packages/core/src/bytes.ts";
import { makeDisclosure, verifyDisclosure } from "../../packages/core/src/audit.ts";
import { assertAbsent } from "../../packages/core/src/privacy.ts";
import { bootPool, createMandate, deposit, fill, placeOffer, publicLedger, serializedPublicState } from "../../packages/core/src/sim.ts";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";

describe("selective audit", () => {
  it("verifies one field and rejects a wrong salt, value, or root", () => {
    const seed = randomBytes32();
    const values = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      principal: randomBytes32(),
      counterparty: randomBytes32(),
      mandateId: randomBytes32(),
    };
    const pkg = makeDisclosure(0, seed, values, [1]);
    const root = Uint8Array.from(Buffer.from(pkg.auditRootHex, "hex"));
    expect(verifyDisclosure(pkg, root).ok).toBe(true);
    const badSalt = { ...pkg, openings: pkg.openings.map((o) => ({ ...o, saltHex: toHex(randomBytes32()) })) };
    expect(verifyDisclosure(badSalt, root).ok).toBe(false);
    const badVal = { ...pkg, openings: pkg.openings.map((o) => ({ ...o, valueDec: "999" })) };
    expect(verifyDisclosure(badVal, root).ok).toBe(false);
    expect(verifyDisclosure(pkg, randomBytes32()).ok).toBe(false);
  });
});

describe("serialized public ledger privacy", () => {
  it("does not contain secrets, mandate limits, or offer openings after a valid fill", () => {
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
    const mandateId = randomBytes32();
    const mandate = {
      principal: pureCircuits.ownerKey(principalSk),
      executor: pureCircuits.executorKey(esk),
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 3_999_999_123n,
      mandateId,
    };
    const created = createMandate(sim, principalSk, dP.note, mandate);
    sim = created.sim;
    const auditSeed = randomBytes32();
    sim = fill(sim, {
      esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      offer,
      offerRand: placed.offerRand,
      nowBound: 1_800_000_000n,
      auditSeed,
    });
    const pub = serializedPublicState(sim);
    const hay = `${pub.text}\n${pub.hex}`;
    assertAbsent(hay, [principalSk, makerSk, esk, mandateId, created.mandateRand, placed.offerRand, offer.payNonce, auditSeed], "openings");
    assertAbsent(hay, [mandate.expiry], "expiry");
    const st = publicLedger(sim);
    expect(st.fills).toBe(1n);
    const a = encodingsOfBytes(principalSk);
    const b = encodingsOfBytes(makerSk);
    expect(a.filter((x) => x.length >= 16 && b.includes(x))).toEqual([]);
    expect(encodingsOfBigint(40n).some((x) => x.length >= 8)).toBe(true);
  });
});
