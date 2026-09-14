import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Offer } from "@remit/contracts/pool";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { encodingsOfBytes, randomBytes32 } from "../../packages/core/src/bytes.ts";
import { assertAbsent } from "../../packages/core/src/privacy.ts";
import { bootPool, createMandate, deposit, publicLedger, serializedPublicState } from "../../packages/core/src/sim.ts";
import {
  compiledMbbeReady,
  fillPublicArgumentNames,
  hasResidualHelpers,
  impureCircuitNames,
  managedPoolDts,
  managedPoolJs,
  mbbeDescribeTitle,
} from "../security/mbbe-capability.ts";
import {
  buyMandate,
  FAR_EXPIRY,
  fillAttack,
  keys,
  paddedBook,
  placeQuoted,
  sellOffer,
} from "../security/mbbe-harness.ts";

const NOW = 1_800_000_000n;
const mbbe = compiledMbbeReady();

const LIMIT_NUM = 30_000_041n;
const LIMIT_DEN = 1_000_000_007n;
const MANDATE_EXPIRY = 3_876_543_210n;
const OFFER_EXPIRY = 3_765_432_109n;
const BASE = 32_771n;
const QUOTE = 1_048_583n;

function functionSource(src: string, name: string): string {
  const start = src.search(new RegExp(`function\\s+${name}\\b`));
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = src.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed function ${name}`);
}

describe("managed artifacts must not disclose MBBE secrets", () => {
  it("fill public arguments are only nowBound — not fillBase, fillQuote, chosenIndex, or o.expiry", () => {
    const args = fillPublicArgumentNames();
    expect(args).toEqual(["nowBound"]);
    expect(args).not.toContain("fillBase");
    expect(args).not.toContain("fillQuote");
    expect(args).not.toContain("chosenIndex");
    expect(args).not.toContain("limitNum");
    expect(args).not.toContain("limitDen");
    expect(args).not.toContain("expiry");
  });

  it("managed JS / d.ts have no lastFillPrice and do not take fillBase as a fill circuit argument", () => {
    const js = managedPoolJs();
    const dts = managedPoolDts();
    const compact = readFileSync(resolve("CONTRACT/src/remit_pool.compact"), "utf8");
    expect(js).not.toMatch(/lastFillPrice/);
    expect(dts).not.toMatch(/lastFillPrice/);
    expect(compact).not.toMatch(/lastFillPrice/);
    expect(impureCircuitNames()).not.toContain("fillBest");
    expect(js).toMatch(/fill: \(\.\.\.args_1\) => \{\s*if \(args_1\.length !== 2\)/);
  });

  it("compact source does not disclose fillBase, fillQuote, chosenIndex, or o.expiry", () => {
    const compact = readFileSync(resolve("CONTRACT/src/remit_pool.compact"), "utf8");
    expect(compact).not.toMatch(/disclose\s*\(\s*fillBase\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*fillQuote\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*chosenIndex\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*idx\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*fb\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*fq\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*o\.expiry\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*m\.limitNum\s*\)/);
    expect(compact).not.toMatch(/disclose\s*\(\s*m\.limitDen\s*\)/);
  });

  it("managed index.js fill wrapper does not serialize fillBase/fillQuote/chosenIndex into public input", () => {
    const js = managedPoolJs();
    const start = js.indexOf("fill: (...args_1) => {");
    expect(start).toBeGreaterThan(0);
    const chunk = js.slice(start, start + 1800);
    expect(chunk).toMatch(/args_1\.length !== 2/);
    expect(chunk).toMatch(/nowBound_0/);
    expect(chunk).not.toMatch(/fillBase/);
    expect(chunk).not.toMatch(/fillQuote/);
    expect(chunk).not.toMatch(/chosenIndex/);
  });
});

describe("writeTabPrivate must not persist secrets as plaintext JSON", () => {
  it("fails if ownerSk or mandate openings are stored as plaintext JSON in writeTabPrivate", () => {
    const src = readFileSync(resolve("packages/sdk/src/browser-circuits.ts"), "utf8");
    const write = functionSource(src, "writeTabPrivate");
    const plaintext =
      /JSON\.stringify\(\s*ps\s*\)/.test(write) ||
      /setItem\([^)]*JSON\.stringify/.test(write);
    expect(
      plaintext,
      "P1-PS: writeTabPrivate persists RemitPrivateState (ownerSk + mandate openings) as plaintext JSON in sessionStorage",
    ).toBe(false);
  });
});

describe("DARKSTAKE owner-tag", () => {
  /**
   * ownerKey(sk) is deterministic. Two notes from the same sk share `owner` in
   * private openings — ACCEPTED (Compact asserts note.owner == ownerKey(sk)).
   * MUST-FIX if the public ledger dump contains ownerKey(sk) or sk as a
   * correlating tag (DarkStake v1 owner-tag class).
   */
  it("two notes from the same sk share owner in openings; public ledger only has commits", () => {
    const sk = randomBytes32();
    let sim = bootPool();
    const a = deposit(sim, sk, 0n, 11n);
    sim = a.sim;
    const b = deposit(sim, sk, 0n, 17n);
    sim = b.sim;
    const owner = pureCircuits.ownerKey(sk);
    expect(Buffer.from(a.note.owner).equals(Buffer.from(b.note.owner))).toBe(true);
    expect(Buffer.from(a.note.owner).equals(Buffer.from(owner))).toBe(true);
    expect(Buffer.from(a.note.nonce).equals(Buffer.from(b.note.nonce))).toBe(false);
    const commitA = pureCircuits.noteCommitment(
      { asset: a.note.asset, amount: a.note.amount, owner: a.note.owner },
      a.note.nonce,
    );
    const commitB = pureCircuits.noteCommitment(
      { asset: b.note.asset, amount: b.note.amount, owner: b.note.owner },
      b.note.nonce,
    );
    expect(Buffer.from(commitA).equals(Buffer.from(commitB))).toBe(false);
    const pub = serializedPublicState(sim);
    const hay = `${pub.text}\n${pub.hex}`;
    assertAbsent(hay, [sk, owner, a.note.nonce, b.note.nonce], "owner-tag");
    const ld = publicLedger(sim);
    expect(ld.notes.findPathForLeaf(commitA)).toBeTruthy();
    expect(ld.notes.findPathForLeaf(commitB)).toBeTruthy();
  });

  it("two mandates from the same principal have distinct commits (fresh rand)", () => {
    const k = keys();
    let sim = bootPool();
    const d1 = deposit(sim, k.principalSk, 0n, 40n);
    sim = d1.sim;
    const d2 = deposit(sim, k.principalSk, 0n, 40n);
    sim = d2.sim;
    const m1 = buyMandate(k);
    const m2 = buyMandate(k, { mandateId: randomBytes32() });
    const c1 = createMandate(sim, k.principalSk, d1.note, m1);
    sim = c1.sim;
    const c2 = createMandate(sim, k.principalSk, d2.note, m2);
    sim = c2.sim;
    const commit1 = pureCircuits.mandateCommitment(m1, c1.mandateRand);
    const commit2 = pureCircuits.mandateCommitment(m2, c2.mandateRand);
    expect(Buffer.from(commit1).equals(Buffer.from(commit2))).toBe(false);
    const pub = serializedPublicState(sim);
    assertAbsent(`${pub.text}\n${pub.hex}`, [k.principalSk, m1.mandateId, m2.mandateId, c1.mandateRand, c2.mandateRand], "mandate-openings");
  });
});

describe.skipIf(!mbbe)(mbbeDescribeTitle("serialized ledger must not contain mandate/offer openings"), () => {
  it("public outputs omit limitNum/limitDen, offer amounts, chosenIndex, offer expiry encodings", () => {
    expect(hasResidualHelpers()).toBe(true);
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, 50_000n);
    sim = dP.sim;
    const offer: Offer = sellOffer(k.maker, {
      baseAmount: BASE,
      quoteAmount: QUOTE,
      expiry: OFFER_EXPIRY,
      minFillBase: 1n,
    });
    const placed = placeQuoted(sim, k.makerSk, offer);
    sim = placed.sim;
    const mandate = buyMandate(k, {
      maxFillBase: 40_001n,
      limitNum: LIMIT_NUM,
      limitDen: LIMIT_DEN,
      expiry: MANDATE_EXPIRY,
    });
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;
    const auditSeed = randomBytes32();
    sim = fillAttack(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: 50_000n,
      stateNonce: created.stateNonce,
      nowBound: NOW,
      book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
      chosenIndex: 0n,
      fillBase: BASE,
      fillQuote: QUOTE,
      auditSeed,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    const pub = serializedPublicState(sim);
    const hay = `${pub.text}\n${pub.hex}`;
    assertAbsent(
      hay,
      [
        k.principalSk,
        k.makerSk,
        k.esk,
        mandate.mandateId,
        created.mandateRand,
        placed.offerRand,
        offer.payNonce,
        auditSeed,
      ],
      "openings",
    );
    assertAbsent(hay, [LIMIT_NUM, LIMIT_DEN, MANDATE_EXPIRY, OFFER_EXPIRY, BASE, QUOTE], "mandate-offer-terms");
    expect(fillPublicArgumentNames()).not.toContain("chosenIndex");
  });
});

describe("ownerKey encodings are not a trivial public alias of sk", () => {
  it("ownerKey(sk) is not equal to sk and not a raw substring identity", () => {
    const sk = randomBytes32();
    const pk = pureCircuits.ownerKey(sk);
    expect(Buffer.from(pk).equals(Buffer.from(sk))).toBe(false);
    const skEnc = encodingsOfBytes(sk).filter((e) => e.length >= 16);
    const pkHex = Buffer.from(pk).toString("hex");
    expect(skEnc.some((e) => pkHex.includes(e.toLowerCase()))).toBe(false);
  });
});
