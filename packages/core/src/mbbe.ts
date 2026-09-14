import { pureCircuits, type Mandate, type Offer, type OfferSlot } from "@remit/contracts/pool";

export const FAR_EXPIRY = 4_000_000_000n;

export type LooseOffer = Omit<Offer, "expiry" | "minFillBase"> & Partial<Pick<Offer, "expiry" | "minFillBase">>;

export function withOfferDefaults(o: LooseOffer): Offer {
  return {
    side: o.side,
    baseAmount: o.baseAmount,
    quoteAmount: o.quoteAmount,
    maker: o.maker,
    payNonce: o.payNonce,
    expiry: o.expiry ?? FAR_EXPIRY,
    minFillBase: o.minFillBase ?? 1n,
  };
}

export function padBook(live: OfferSlot[]): OfferSlot[] {
  if (live.length === 0) {
    throw new Error("MBBE book requires at least one slot to pad from");
  }
  const proto: OfferSlot = { offer: live[0]!.offer, rand: live[0]!.rand, live: false };
  const out = live.slice(0, 3);
  while (out.length < 3) out.push(proto);
  return out;
}

export function slotEligible(s: OfferSlot, m: Mandate, nowBound: bigint, remaining: bigint): boolean {
  const o = s.offer;
  if (!s.live) return false;
  if (o.baseAmount === 0n || o.quoteAmount === 0n) return false;
  if (o.side === m.side) return false;
  if (nowBound > o.expiry) return false;
  const priceOk =
    m.side === 0n
      ? pureCircuits.priceAtLeast(o.baseAmount, o.quoteAmount, m.limitNum, m.limitDen)
      : pureCircuits.priceAtMost(o.baseAmount, o.quoteAmount, m.limitNum, m.limitDen);
  if (!priceOk) return false;
  const cap = pureCircuits.minU64(o.baseAmount, m.maxFillBase);
  const fullBudget = m.side === 0n ? o.baseAmount <= remaining : o.quoteAmount <= remaining;
  const fullOk = cap === o.baseAmount && fullBudget;
  const minSlice = o.minFillBase;
  const sliceBudget =
    m.side === 0n ? minSlice <= remaining : minSlice * o.quoteAmount <= remaining * o.baseAmount;
  const sliceOk = minSlice > 0n && minSlice <= cap && sliceBudget;
  return fullOk || sliceOk;
}

export function strictlyBetter(a: OfferSlot, b: OfferSlot, m: Mandate, remaining: bigint): boolean {
  const oa = a.offer;
  const ob = b.offer;
  const fa = pureCircuits.fillableBaseOf(oa, m.maxFillBase, remaining, m.side);
  const fb = pureCircuits.fillableBaseOf(ob, m.maxFillBase, remaining, m.side);
  const ca = pureCircuits.offerCommitment(oa, a.rand);
  const cb = pureCircuits.offerCommitment(ob, b.rand);
  return (
    pureCircuits.betterPrice(oa, ob, m.side) ||
    (pureCircuits.samePrice(oa, ob) && fa > fb) ||
    (pureCircuits.samePrice(oa, ob) && fa === fb && pureCircuits.bytesLt(ca, cb))
  );
}

export function pickChosenIndex(
  slots: OfferSlot[],
  m: Mandate,
  nowBound: bigint,
  remaining: bigint,
): bigint | undefined {
  const eligible = slots.map((s, i) => ({ i, s, ok: slotEligible(s, m, nowBound, remaining) }));
  const ok = eligible.filter((x) => x.ok);
  if (ok.length === 0) return undefined;
  let best = ok[0]!;
  for (const cand of ok.slice(1)) {
    if (strictlyBetter(cand.s, best.s, m, remaining)) best = cand;
  }
  return BigInt(best.i);
}

export function sliceAmounts(o: Offer, fillBase: bigint): { fillBase: bigint; fillQuote: bigint } {
  if (fillBase === o.baseAmount) return { fillBase, fillQuote: o.quoteAmount };
  if (o.baseAmount === 0n) return { fillBase: 0n, fillQuote: 0n };
  const fillQuote = (fillBase * o.quoteAmount) / o.baseAmount;
  return { fillBase, fillQuote };
}
