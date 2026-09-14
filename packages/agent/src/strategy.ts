import { checkFillPolicy, pickChosenIndex, type PolicyFail } from "@remit/core";
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

function slotsOf(candidates: Candidate[]): OfferSlot[] {
  return candidates.map((c) => ({
    offer: c.offer,
    rand: c.rand ?? c.offer.payNonce,
    live: c.live ?? true,
  }));
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
    return { id: c.id, ok: true, score: 1n };
  });
}

/** Same as rankOffers — MBBE eligibility is checkFillPolicy + Compact slotEligible. */
export function rankOffersMbbe(args: RankArgs): Ranked[] {
  return rankOffers(args);
}

/** Unique best among ranked-ok candidates using Compact betterPrice / fillable / bytesLt. */
export function pickBest(ranked: Ranked[], args: RankArgs): string | undefined {
  const ok = ranked.filter((r): r is Ranked & { ok: true } => r.ok);
  if (ok.length === 0) return undefined;
  const eligible = args.candidates.filter((c) => ok.some((r) => r.id === c.id));
  const idx = pickChosenIndex(slotsOf(eligible), args.mandate, args.nowBound, args.remaining);
  if (idx === undefined) return undefined;
  return eligible[Number(idx)]?.id;
}
