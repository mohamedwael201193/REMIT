import { openOfferBox, rfqPublicFromSecret } from "@remit/core";
import type { Mandate, Offer } from "@remit/contracts/pool";
import { decideFill, type ExecutorDecision } from "./executor.js";

export type BoxedCandidate = { id: string; boxed: string };

function offerFromJson(o: {
  side: string;
  baseAmount: string;
  quoteAmount: string;
  maker: number[];
  payNonce: number[];
}): Offer {
  return {
    side: BigInt(o.side),
    baseAmount: BigInt(o.baseAmount),
    quoteAmount: BigInt(o.quoteAmount),
    maker: Uint8Array.from(o.maker),
    payNonce: Uint8Array.from(o.payNonce),
  };
}

/**
 * Private mandate → encrypted RFQ → score → mandate validation.
 * Proof/submit/settlement happen in the Node circuit-call path, not here.
 * The agent may choose an offer. It cannot change the mandate.
 */
export function runEncryptedRfqTick(input: {
  rfqSecretHex: string;
  boxedOffers: BoxedCandidate[];
  esk: Uint8Array;
  mandate: Mandate;
  remaining: bigint;
  nowBound: bigint;
  revoked: boolean;
  allowCounterparty?: (maker: Uint8Array) => boolean;
  bypassLocalPrecheck?: boolean;
}): { opened: number; dropped: number; decision: ExecutorDecision } {
  const expectedPub = rfqPublicFromSecret(input.rfqSecretHex);
  const candidates: { id: string; offer: Offer; remaining: bigint; receivedAt: number }[] = [];
  let dropped = 0;
  for (const boxed of input.boxedOffers) {
    try {
      const opened = openOfferBox(input.rfqSecretHex, boxed.boxed, expectedPub);
      candidates.push({
        id: boxed.id,
        offer: offerFromJson(opened.offer),
        remaining: input.remaining,
        receivedAt: opened.expiresAt,
      });
    } catch {
      dropped += 1;
    }
  }
  const decision = decideFill({
    esk: input.esk,
    mandate: input.mandate,
    remaining: input.remaining,
    nowBound: input.nowBound,
    revoked: input.revoked,
    candidates,
    allowCounterparty: input.allowCounterparty ?? (() => true),
    bypassLocalPrecheck: input.bypassLocalPrecheck,
  });
  return { opened: candidates.length, dropped, decision };
}
