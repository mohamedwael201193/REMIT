import { checkFillPolicy, padBook, pickChosenIndex, slotEligible, strictlyBetter, withOfferDefaults, type LooseOffer, type PolicyFail } from "@remit/core";
import type { Mandate, Offer, OfferSlot } from "@remit/contracts/pool";

export type Candidate = {
  id: string;
  offer: Offer;
  remaining: bigint;
  receivedAt: number;
  rand?: Uint8Array;
  live?: boolean;
};

export type Ranked =
  | { id: string; ok: true; score: bigint }
  | { id: string; ok: false; reason: PolicyFail };

export type RankArgs = {
  esk: Uint8Array;
  mandate: Mandate;
  remaining: bigint;
  nowBound: bigint;
  revoked: boolean;
  candidates: Candidate[];
  allowCounterparty: (maker: Uint8Array) => boolean;
};

export type KBook = {
  book: OfferSlot[];
  chosenIndex: bigint;
  selected: Candidate;
};

export function slotsOf(candidates: Candidate[]): OfferSlot[] {
  return candidates.map((c) => {
    const offer = withOfferDefaults(c.offer as LooseOffer);
    return {
      offer,
      rand: c.rand ?? offer.payNonce,
      live: c.live ?? true,
    };
  });
}

export function rankOffers(args: RankArgs): Ranked[] {
  return args.candidates.map((c) => {
    const r = checkFillPolicy({
      esk: args.esk,
      mandate: args.mandate,
      offer: c.offer,
      remaining: args.remaining,
      nowBound: args.nowBound,
      revoked: args.revoked,
      counterpartyAllowed: args.allowCounterparty(c.offer.maker),
    });
    if (!r.ok) return { id: c.id, ok: false, reason: r.reason };
    const slot = slotsOf([c])[0]!;
    if (!slotEligible(slot, args.mandate, args.nowBound, args.remaining)) {
      return { id: c.id, ok: false, reason: r.reason };
    }
    return { id: c.id, ok: true, score: 1n };
  });
}

/** Same as rankOffers — MBBE eligibility is checkFillPolicy + Compact slotEligible. */
export function rankOffersMbbe(args: RankArgs): Ranked[] {
  return rankOffers(args);
}

/**
 * K-set the circuit will see.
 * ≤3 candidates: preserve input order so chosenIndex matches the blotter.
 * >3: winner plus following others — Compact still only proves best-of-K, not global book.
 */
export function selectKBook(args: RankArgs): KBook | undefined {
  const live = args.candidates.filter((c) => c.live !== false);
  if (live.length === 0) return undefined;
  const policyOk = (c: Candidate) =>
    checkFillPolicy({
      esk: args.esk,
      mandate: args.mandate,
      offer: c.offer,
      remaining: args.remaining,
      nowBound: args.nowBound,
      revoked: args.revoked,
      counterpartyAllowed: args.allowCounterparty(c.offer.maker),
    }).ok;

  let source = live;
  if (live.length > 3) {
    let bestI: number | undefined;
    const slots = slotsOf(live);
    for (let i = 0; i < live.length; i++) {
      if (!policyOk(live[i]!)) continue;
      if (!slotEligible(slots[i]!, args.mandate, args.nowBound, args.remaining)) continue;
      if (bestI === undefined || strictlyBetter(slots[i]!, slots[bestI]!, args.mandate, args.remaining)) bestI = i;
    }
    if (bestI === undefined) return undefined;
    const winner = live[bestI]!;
    const rest = live.filter((_, i) => i !== bestI);
    source = [winner, ...rest].slice(0, 3);
  }

  const book = padBook(slotsOf(source));
  const idx = pickChosenIndex(book, args.mandate, args.nowBound, args.remaining);
  if (idx === undefined) return undefined;
  const selectedSlot = book[Number(idx)]!;
  const fromSource = Number(idx) < source.length ? source[Number(idx)]! : source[0]!;
  if (!policyOk({ ...fromSource, offer: selectedSlot.offer })) return undefined;
  return {
    book,
    chosenIndex: idx,
    selected: {
      ...fromSource,
      offer: selectedSlot.offer,
      rand: selectedSlot.rand,
      live: selectedSlot.live,
    },
  };
}

/** Unique best among candidates using Compact betterPrice / fillable / bytesLt. */
export function pickBest(ranked: Ranked[], args: RankArgs): string | undefined {
  const ok = new Set(ranked.filter((r) => r.ok).map((r) => r.id));
  if (ok.size === 0) return undefined;
  const k = selectKBook(args);
  if (!k || !ok.has(k.selected.id)) return undefined;
  return k.selected.id;
}
