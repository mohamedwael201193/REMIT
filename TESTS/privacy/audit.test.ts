import { describe, it, expect } from "vitest";
import { randomBytes32, encodingsOfBytes, encodingsOfBigint, toHex } from "../../packages/core/src/bytes.ts";
import { makeDisclosure, verifyDisclosure } from "../../packages/core/src/audit.ts";
import { assertAbsent } from "../../packages/core/src/privacy.ts";
import { bootPool, createMandate, deposit, publicLedger, serializedPublicState } from "../../packages/core/src/sim.ts";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { withOfferDefaults } from "../../packages/core/src/mbbe.ts";
import { fillAttack, paddedBook, placeQuoted } from "../security/mbbe-harness.ts";

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
    const fillB = makeDisclosure(1, seed, values, [1]);
    expect(verifyDisclosure(pkg, root, { expectedFillIndex: 1 }).ok).toBe(false);
    expect(verifyDisclosure(fillB, Uint8Array.from(Buffer.from(fillB.auditRootHex, "hex")), { expectedFillIndex: 1 }).ok).toBe(true);
    expect(verifyDisclosure(pkg, root, { allowedFields: ["quoteAmount"] }).failed.some((f) => f.startsWith("unauthorized-"))).toBe(true);
    expect(verifyDisclosure(pkg, root, { allowedFields: ["baseAmount"] }).ok).toBe(true);
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
    const offer = withOfferDefaults({
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: pureCircuits.ownerKey(makerSk),
      payNonce: randomBytes32(),
    });
    const placed = placeQuoted(sim, makerSk, offer);
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
    sim = fillAttack(sim, {
      esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      nowBound: 1_800_000_000n,
      auditSeed,
      book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
      chosenIndex: 0n,
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

describe("POST /audit/verify checks a one-field package against a real auditRoot", () => {
  it("accepts the authorized field and rejects a forged value", async () => {
    const { buildApp } = await import("../../apps/api/src/app.ts");
    const { rfqKeyPair } = await import("../../packages/core/src/box.ts");
    const rec = rfqKeyPair();
    const { app } = await buildApp({
      cors: "*",
      admin: "admin",
      rfqSk: rec.secretHex,
      execSk: "ab".repeat(32),
      pool: "",
      quote: "",
      network: "preprod",
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
    });
    const seed = randomBytes32();
    const values = {
      side: 1n,
      baseAmount: 50n,
      quoteAmount: 2000n,
      principal: randomBytes32(),
      counterparty: randomBytes32(),
      mandateId: randomBytes32(),
    };
    const pkg = makeDisclosure(0, seed, values, [1]);
    const ok = await app.inject({
      method: "POST",
      url: "/audit/verify",
      payload: { package: pkg, rootHex: pkg.auditRootHex },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().ok).toBe(true);
    expect(ok.json().fields).toEqual(["baseAmount"]);
    expect(JSON.stringify(ok.json())).not.toMatch(/fillBase|chosenIndex|ownerSk/);
    const forged = { ...pkg, openings: pkg.openings.map((o) => ({ ...o, valueDec: "1" })) };
    const bad = await app.inject({
      method: "POST",
      url: "/audit/verify",
      payload: { package: forged, rootHex: pkg.auditRootHex },
    });
    expect(bad.json().ok).toBe(false);
    await app.close();
  });
});
