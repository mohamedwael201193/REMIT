import { describe, it, expect } from "vitest";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";
import { encodingsOfBigint, randomBytes32, toHex } from "../../packages/core/src/bytes.ts";
import { assertAbsent } from "../../packages/core/src/privacy.ts";
import {
  bootPool,
  createMandate,
  deposit,
  publicLedger,
  serializedPublicState,
} from "../../packages/core/src/sim.ts";
import { fillPublicArgumentNames } from "../security/mbbe-capability.ts";
import {
  buyMandate,
  cancelAttackOffer,
  fillAttack,
  keys,
  paddedBook,
  placeAttackOffer,
  sellOffer,
} from "../security/mbbe-harness.ts";

const NOW = 1_800_000_000n;
const LIMIT_NUM = 30_000_041n;
const LIMIT_DEN = 1_000_000_007n;
const MANDATE_EXPIRY = 3_876_543_210n;
const OFFER_EXPIRY_A = 3_765_432_109n;
const OFFER_EXPIRY_B = 3_765_432_227n;
const BASE_A = 32_771n;
const QUOTE_A = 1_048_583n;
const BASE_B = 32_773n;
const QUOTE_B = 1_048_589n;
const MAX_FILL = 40_001n;
/** Oversized maker deposit so the public unshielded receive is not the offer size. */
const MAKER_DEPOSIT = 2_097_167n;
const PRINCIPAL_BUDGET = 90_011n;

/**
 * ACCEPT+document: `fills` is a public Counter (`fills.increment(1)` on fill).
 * After two fills the public value is `2`. That is the same distinguishability
 * as Senyap / today's pool and does **not** bind the counter to a maker key,
 * mandateId, chosenIndex, or size. Tests below still require that grouping
 * other public tags cannot prove the two fills share a maker or mandate.
 */
const FILLS_COUNTER_IS_PUBLIC = true;

function haystack(sim: ReturnType<typeof bootPool>): string {
  const pub = serializedPublicState(sim);
  return `${pub.text}\n${pub.hex}`;
}

function hexTagsOf(iter: { [Symbol.iterator](): Iterator<Uint8Array> } | undefined): Set<string> {
  const out = new Set<string>();
  if (!iter) return out;
  for (const x of iter) out.add(toHex(x).toLowerCase());
  return out;
}

function publicIdentityTags(sim: ReturnType<typeof bootPool>): Set<string> {
  const ld = publicLedger(sim) as {
    noteNullifiers: { [Symbol.iterator](): Iterator<Uint8Array> };
    offerNullifiers: { [Symbol.iterator](): Iterator<Uint8Array> };
    mandateRevoked: { [Symbol.iterator](): Iterator<Uint8Array> };
    auditRoots: { [Symbol.iterator](): Iterator<Uint8Array> };
    mandateStateNullifiers?: { [Symbol.iterator](): Iterator<Uint8Array> };
  };
  const tags = new Set<string>([
    ...hexTagsOf(ld.noteNullifiers),
    ...hexTagsOf(ld.offerNullifiers),
    ...hexTagsOf(ld.mandateRevoked),
    ...hexTagsOf(ld.auditRoots),
    ...hexTagsOf(ld.mandateStateNullifiers),
  ]);
  return tags;
}

function minus(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const x of a) if (!b.has(x)) out.add(x);
  return out;
}

function assertQuietPublicLedger(
  sim: ReturnType<typeof bootPool>,
  secrets: Array<Uint8Array | bigint>,
  label: string,
): void {
  const hay = haystack(sim);
  assertAbsent(hay, secrets, label);
  expect(hay.includes("chosenIndex"), `${label}: chosenIndex must not appear in public serialization`).toBe(false);
  expect(hay.includes("limitNum"), `${label}: limitNum must not appear as a public field`).toBe(false);
  expect(hay.includes("maxFillBase"), `${label}: maxFillBase must not appear as a public field`).toBe(false);
  expect(hay.toLowerCase().includes("mandateid"), `${label}: mandateId key must not appear`).toBe(false);
}

describe("DarkStake-style correlation tags on the public ledger", () => {
  it("place / fill / cancel dumps omit amounts, expiry, chosenIndex, and mandate terms", () => {
    const k = keys();
    let sim = bootPool();
    const dMaker = deposit(sim, k.makerSk, 1n, MAKER_DEPOSIT);
    sim = dMaker.sim;
    const offer = sellOffer(k.maker, {
      baseAmount: BASE_A,
      quoteAmount: QUOTE_A,
      expiry: OFFER_EXPIRY_A,
      minFillBase: 1n,
    });
    const placed = placeAttackOffer(sim, k.makerSk, dMaker.note, offer);
    sim = placed.sim;

    const afterPlace = [
      k.principalSk,
      k.makerSk,
      k.esk,
      k.maker,
      k.principal,
      offer.payNonce,
      placed.offerRand,
      BASE_A,
      QUOTE_A,
      OFFER_EXPIRY_A,
    ];
    assertQuietPublicLedger(sim, afterPlace, "after-place");

    const dP = deposit(sim, k.principalSk, 0n, PRINCIPAL_BUDGET);
    sim = dP.sim;
    const mandate = buyMandate(k, {
      maxFillBase: MAX_FILL,
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
      remaining: PRINCIPAL_BUDGET,
      stateNonce: created.stateNonce,
      nowBound: NOW,
      book: paddedBook([{ offer, rand: placed.offerRand, live: true }]),
      chosenIndex: 0n,
      fillBase: BASE_A,
      fillQuote: QUOTE_A,
      auditSeed,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    assertQuietPublicLedger(
      sim,
      [
        ...afterPlace,
        mandate.mandateId,
        created.mandateRand,
        created.stateNonce,
        auditSeed,
        LIMIT_NUM,
        LIMIT_DEN,
        MANDATE_EXPIRY,
        MAX_FILL,
      ],
      "after-fill",
    );
    expect(fillPublicArgumentNames()).toEqual(["nowBound"]);
    expect(fillPublicArgumentNames()).not.toContain("chosenIndex");

    const dMaker2 = deposit(sim, k.makerSk, 1n, MAKER_DEPOSIT);
    sim = dMaker2.sim;
    const offerB = sellOffer(k.maker, {
      baseAmount: BASE_B,
      quoteAmount: QUOTE_B,
      expiry: OFFER_EXPIRY_B,
      minFillBase: 1n,
    });
    const placedB = placeAttackOffer(sim, k.makerSk, dMaker2.note, offerB);
    sim = placedB.sim;
    sim = cancelAttackOffer(sim, k.makerSk, offerB, placedB.offerRand);
    assertQuietPublicLedger(
      sim,
      [...afterPlace, BASE_B, QUOTE_B, OFFER_EXPIRY_B, placedB.offerRand, offerB.payNonce],
      "after-cancel",
    );

    expect(FILLS_COUNTER_IS_PUBLIC).toBe(true);
    expect(publicLedger(sim).fills).toBe(1n);
    const fillEnc = encodingsOfBigint(1n).filter((e) => e.length >= 8);
    expect(fillEnc.length).toBeGreaterThan(0);
  });

  it("grouping public tags over two fills does not prove the same maker or mandate", () => {
    const k = keys();
    let sim = bootPool();
    const dP = deposit(sim, k.principalSk, 0n, PRINCIPAL_BUDGET);
    sim = dP.sim;
    const mandate = buyMandate(k, {
      maxFillBase: MAX_FILL,
      limitNum: LIMIT_NUM,
      limitDen: LIMIT_DEN,
      expiry: MANDATE_EXPIRY,
    });
    const created = createMandate(sim, k.principalSk, dP.note, mandate);
    sim = created.sim;

    const d1 = deposit(sim, k.makerSk, 1n, MAKER_DEPOSIT);
    sim = d1.sim;
    const offer1 = sellOffer(k.maker, {
      baseAmount: BASE_A,
      quoteAmount: QUOTE_A,
      expiry: OFFER_EXPIRY_A,
      minFillBase: 1n,
    });
    const p1 = placeAttackOffer(sim, k.makerSk, d1.note, offer1);
    sim = p1.sim;

    const tags0 = publicIdentityTags(sim);
    const nonce1 = randomBytes32();
    sim = fillAttack(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: PRINCIPAL_BUDGET,
      stateNonce: created.stateNonce,
      nowBound: NOW,
      book: paddedBook([{ offer: offer1, rand: p1.offerRand, live: true }]),
      chosenIndex: 0n,
      fillBase: BASE_A,
      fillQuote: QUOTE_A,
      nextStateNonce: nonce1,
    });
    expect(publicLedger(sim).fills).toBe(1n);
    const tags1 = publicIdentityTags(sim);
    const delta1 = minus(tags1, tags0);

    const d2 = deposit(sim, k.makerSk, 1n, MAKER_DEPOSIT);
    sim = d2.sim;
    const offer2 = sellOffer(k.maker, {
      baseAmount: BASE_B,
      quoteAmount: QUOTE_B,
      expiry: OFFER_EXPIRY_B,
      minFillBase: 1n,
    });
    const p2 = placeAttackOffer(sim, k.makerSk, d2.note, offer2);
    sim = p2.sim;
    const tagsMid = publicIdentityTags(sim);
    sim = fillAttack(sim, {
      esk: k.esk,
      mandate,
      mandateRand: created.mandateRand,
      remaining: PRINCIPAL_BUDGET - BASE_A,
      stateNonce: nonce1,
      nowBound: NOW,
      book: paddedBook([{ offer: offer2, rand: p2.offerRand, live: true }]),
      chosenIndex: 0n,
      fillBase: BASE_B,
      fillQuote: QUOTE_B,
    });
    expect(publicLedger(sim).fills).toBe(2n);
    const tags2 = publicIdentityTags(sim);
    const delta2 = minus(tags2, tagsMid);

    const identity = new Set(
      [k.maker, k.principal, k.executor, mandate.mandateId, k.makerSk, k.principalSk, k.esk].map((b) =>
        toHex(b).toLowerCase(),
      ),
    );
    for (const tag of [...delta1, ...delta2]) {
      expect(identity.has(tag), "public fill tag equals maker/mandate/sk").toBe(false);
    }
    const reused = [...delta1].filter((t) => delta2.has(t));
    expect(reused, "a public tag reused across two fills would correlate maker/mandate").toEqual([]);

    const commit1 = pureCircuits.offerCommitment(offer1, p1.offerRand);
    const commit2 = pureCircuits.offerCommitment(offer2, p2.offerRand);
    expect(Buffer.from(commit1).equals(Buffer.from(commit2))).toBe(false);
    expect(Buffer.from(commit1).equals(Buffer.from(k.maker))).toBe(false);

    const hay = haystack(sim);
    assertAbsent(
      hay,
      [
        k.maker,
        k.principal,
        mandate.mandateId,
        BASE_A,
        QUOTE_A,
        BASE_B,
        QUOTE_B,
        LIMIT_NUM,
        LIMIT_DEN,
        MANDATE_EXPIRY,
        OFFER_EXPIRY_A,
        OFFER_EXPIRY_B,
        MAX_FILL,
      ],
      "two-fill-terms",
    );

    // ACCEPT: public fills counter equals 2 after two fills; not an identity tag.
    expect(FILLS_COUNTER_IS_PUBLIC).toBe(true);
    expect(publicLedger(sim).fills).toBe(2n);
    expect(String(publicLedger(sim).fills)).toBe("2");
  });

  it("two mandates from the same principal do not share a public owner tag", () => {
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
    const hay = haystack(sim);
    assertAbsent(hay, [k.principal, k.principalSk, m1.mandateId, m2.mandateId, c1.mandateRand, c2.mandateRand], "mandate-owner-tag");
    const tags = publicIdentityTags(sim);
    expect(tags.has(toHex(k.principal).toLowerCase())).toBe(false);
    expect(tags.has(toHex(m1.mandateId).toLowerCase())).toBe(false);
    expect(tags.has(toHex(m2.mandateId).toLowerCase())).toBe(false);
  });
});
