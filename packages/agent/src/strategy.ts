import { checkFillPolicy, scoreCompliantOffer, type PolicyFail } from "@remit/core";
import type { Mandate, Offer } from "@remit/contracts/pool";

export type Candidate = {
  id: string;
  offer: Offer;
  remaining: bigint;
  receivedAt: number;
};

export type Ranked =
  | { id: string; ok: true; score: bigint }
  | { id: string; ok: false; reason: PolicyFail };

export function rankOffers(args: {
  esk: Uint8Array;
  mandate: Mandate;
  remaining: bigint;
  nowBound: bigint;
  revoked: boolean;
  candidates: Candidate[];
  allowCounterparty: (maker: Uint8Array) => boolean;
}): Ranked[] {
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
    return { id: c.id, ok: true, score: scoreCompliantOffer(c.offer, args.mandate) };
  });
}

export function pickBest(ranked: Ranked[]): string | undefined {
  const ok = ranked.filter((r): r is Ranked & { ok: true } => r.ok);
  if (ok.length === 0) return undefined;
  ok.sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : 0));
  return ok[0].id;
}
