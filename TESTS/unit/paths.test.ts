import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ContractState,
  createConstructorContext,
  dummyContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { randomBytes32, toHex } from "../../packages/core/src/bytes.ts";
import { emptyPrivateState } from "../../packages/core/src/state.ts";
import { witnesses } from "../../packages/core/src/witnesses.ts";
import { poolLedgerFromStateHex, requireLeafPath, noteLeaf } from "../../packages/core/src/paths.ts";
import { pendingFill } from "../../packages/core/src/pending.ts";
import { bootPool, createMandate, deposit, placeOffer, publicLedger } from "../../packages/core/src/sim.ts";
import { constructFill } from "../../packages/agent/src/fill-circuit.ts";

describe("contract security source gate", () => {
  it("does not authenticate with ownPublicKey", () => {
    const src = readFileSync(resolve("CONTRACT/src/remit_pool.compact"), "utf8");
    expect(src).not.toMatch(/ownPublicKey\s*\(/);
    expect(src).toMatch(/ownerKey\(sk\)/);
    expect(src).toMatch(/executorKey\(esk\)/);
    expect(src).toMatch(/disclose\(nowBound\)/);
  });
});

describe("indexer ContractState round-trip", () => {
  it("deserializes constructor state and finds a note after deposit via sim ledger", () => {
    const quoteColor = randomBytes32();
    const contract = new Contract(witnesses);
    const ctor = createConstructorContext(emptyPrivateState("paths"), "11".repeat(32));
    const built = contract.initialState(ctor, quoteColor);
    expect(dummyContractAddress()).toBeTruthy();
    expect(built.currentContractState).toBeInstanceOf(ContractState);
    const hex = toHex(built.currentContractState.serialize());
    const ld = poolLedgerFromStateHex(hex);
    expect(Buffer.from(ld.quoteColor)).toEqual(Buffer.from(quoteColor));
    expect(ld.fills).toBe(0n);

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
    const pub = publicLedger(sim);
    expect(requireLeafPath(pub.notes, noteLeaf(dP.note, dP.note.nonce), "note").leaf).toHaveLength(32);
    const pending = pendingFill(pub, {
      esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 100n,
      stateNonce: created.stateNonce,
      offer,
      offerRand: placed.offerRand,
      auditSeed: randomBytes32(),
      getNonce: randomBytes32(),
      nextStateNonce: randomBytes32(),
    });
    expect(pending.executorSecret).toHaveLength(32);
    expect(pending.mandatePath?.path.length).toBeGreaterThan(0);

    expect(() =>
      constructFill({
        ledger: pub,
        esk,
        mandate,
        remaining: 100n,
        nowBound: 1_800_000_000n,
        revoked: false,
        offer: { ...offer, baseAmount: 60n, quoteAmount: 1920n, minFillBase: 60n },
        mandateRand: created.mandateRand,
        stateNonce: created.stateNonce,
        offerRand: placed.offerRand,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
      }),
    ).toThrow(/local pre-check rejected fill/);
  });
});
