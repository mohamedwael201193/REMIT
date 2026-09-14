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
  const o = withOfferDefaults(s.offer);

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
  const oa = withOfferDefaults(a.offer);
  const ob = withOfferDefaults(b.offer);
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

export function pickBestIndex(
  slots: OfferSlot[],
  m: Mandate,
  nowBound: bigint,
  remaining: bigint,
): number | undefined {
  let bestI: number | undefined;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    if (!slotEligible(s, m, nowBound, remaining)) continue;
    if (bestI === undefined || strictlyBetter(s, slots[bestI]!, m, remaining)) bestI = i;
  }
  return bestI;
}

export function pickChosenIndex(
  slots: OfferSlot[],
  m: Mandate,
  nowBound: bigint,
  remaining: bigint,
): bigint | undefined {
  const i = pickBestIndex(slots, m, nowBound, remaining);
  return i === undefined ? undefined : BigInt(i);
}

export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** Smallest positive base step that keeps `fillQuote * base == fillBase * quote`. */
export function ratioStep(base: bigint, quote: bigint): bigint {
  if (base <= 0n) return 1n;
  const g = gcd(base, quote);
  return g === 0n ? base : base / g;
}

/**
 * Compact requires `fq * base == fb * quote` with no remainder.
 * Truncating `(fb * quote) / base` is not sound.
 */
export function sliceAmounts(o: Offer, fillBase: bigint): { fillBase: bigint; fillQuote: bigint } {
  if (fillBase === o.baseAmount) return { fillBase, fillQuote: o.quoteAmount };
  if (o.baseAmount === 0n) return { fillBase: 0n, fillQuote: 0n };
  if ((fillBase * o.quoteAmount) % o.baseAmount !== 0n) {
    throw new Error("sliceAmounts: fillBase does not preserve Compact fill ratio");
  }
  return { fillBase, fillQuote: (fillBase * o.quoteAmount) / o.baseAmount };
}

/**
 * Authorized residual opening after a fill. Compact inserts this commitment
 * unconditionally. Replay of the consumed opening must fail.
 */
export function residualOf(
  o: Offer,
  rand: Uint8Array,
  fillBase: bigint,
  fillQuote: bigint,
): { offer: Offer; rand: Uint8Array } {
  return {
    offer: {
      side: o.side,
      baseAmount: o.baseAmount - fillBase,
      quoteAmount: o.quoteAmount - fillQuote,
      maker: o.maker,
      payNonce: pureCircuits.residualPayNonceOf(o.payNonce),
      expiry: o.expiry,
      minFillBase: o.minFillBase,
    },
    rand: pureCircuits.residualRandOf(rand),
  };
}

/** Largest legal slice under cap/budget/minFill that Compact will accept. */
export function legalSlice(
  oIn: LooseOffer,
  m: Mandate,
  remaining: bigint,
): { fillBase: bigint; fillQuote: bigint } {
  const o = withOfferDefaults(oIn);
  const cap = pureCircuits.fillableBaseOf(o, m.maxFillBase, remaining, m.side);
  const tryFb = (fb: bigint): { fillBase: bigint; fillQuote: bigint } | undefined => {
    if (fb <= 0n || fb > o.baseAmount || fb > m.maxFillBase) return undefined;
    if (fb !== o.baseAmount && fb < o.minFillBase) return undefined;
    if ((fb * o.quoteAmount) % o.baseAmount !== 0n) return undefined;
    const fq = fb === o.baseAmount ? o.quoteAmount : (fb * o.quoteAmount) / o.baseAmount;
    const pays = m.side === 0n ? fb : fq;
    if (pays > remaining) return undefined;
    return { fillBase: fb, fillQuote: fq };
  };
  const full = tryFb(o.baseAmount);
  if (full && cap >= o.baseAmount) return full;
  const step = ratioStep(o.baseAmount, o.quoteAmount);
  let fb = cap - (cap % step);
  while (fb > 0n) {
    const hit = tryFb(fb);
    if (hit) return hit;
    if (fb < step) break;
    fb -= step;
  }
  throw new Error("legalSlice: no Compact-safe fill size");
}
