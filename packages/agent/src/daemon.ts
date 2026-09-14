import { openJson, withOfferDefaults, type InboxItem } from "@remit/core";
import type { Mandate, Offer } from "@remit/contracts/pool";
import { decideFill, type Candidate, type ExecutorDecision } from "./executor.js";

export type AgentReceipt = {
  at: number;
  candidateCount: number;
  eligibleCount: number;
  rejected: { id: string; reason: string }[];
  selectedId: string | null;
  chosenIndex: string | null;
  fillBase: string | null;
  fillQuote: string | null;
  rule: "mbbe-eligible-only";
  globalBest: false;
  mpc: false;
  status: "ranked" | "rejected";
};

export type PlannedFill = {
  opened: number;
  dropped: number;
  decision: ExecutorDecision;
  receipt: AgentReceipt;
  candidates: Candidate[];
};

function offerFromOpened(opened: {
  offer?: {
    side: string;
    baseAmount: string;
    quoteAmount: string;
    maker: number[];
    payNonce: number[];
    expiry?: string;
    minFillBase?: string;
  };
  offerRand?: number[];
}): { offer: Offer; rand?: Uint8Array } | undefined {
  if (!opened.offer) return undefined;
  const offer = withOfferDefaults({
    side: BigInt(opened.offer.side),
    baseAmount: BigInt(opened.offer.baseAmount),
    quoteAmount: BigInt(opened.offer.quoteAmount),
    maker: Uint8Array.from(opened.offer.maker),
    payNonce: Uint8Array.from(opened.offer.payNonce),
    expiry: opened.offer.expiry ? BigInt(opened.offer.expiry) : undefined,
    minFillBase: opened.offer.minFillBase ? BigInt(opened.offer.minFillBase) : undefined,
  });
  return {
    offer,
    rand: opened.offerRand ? Uint8Array.from(opened.offerRand) : undefined,
  };
}

/**
 * Deterministic agent tick: decrypt RFQ inbox → rank identical to Compact → receipt.
 * Proof/submit stay on the operator process (not this HTTP-safe planner).
 */
export function planFillFromInbox(input: {
  rfqSk: string;
  offers: InboxItem[];
  esk: Uint8Array;
  mandate: Mandate;
  remaining: bigint;
  nowBound: bigint;
  revoked?: boolean;
}): PlannedFill {
  const candidates: Candidate[] = [];
  let dropped = 0;
  for (const item of input.offers) {
    try {
      const opened = openJson<{
        kind?: string;
        offer?: Parameters<typeof offerFromOpened>[0]["offer"];
        offerRand?: number[];
      }>(input.rfqSk, item.boxed);
      if (opened.kind && opened.kind !== "offer") {
        dropped += 1;
        continue;
      }
      const parsed = offerFromOpened(opened);
      if (!parsed) {
        dropped += 1;
        continue;
      }
      candidates.push({
        id: item.id,
        offer: parsed.offer,
        remaining: input.remaining,
        receivedAt: item.receivedAt,
        rand: parsed.rand,
        live: true,
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
    revoked: input.revoked ?? false,
    candidates,
    allowCounterparty: () => true,
  });
  const ranked = decision.ranked;
  const eligibleCount = ranked.filter((r) => r.ok).length;
  const rejected = ranked.filter((r) => !r.ok).map((r) => ({ id: r.id, reason: r.reason }));
  const fill = decision.action === "fill";
  const receipt: AgentReceipt = {
    at: Date.now(),
    candidateCount: candidates.length,
    eligibleCount,
    rejected,
    selectedId: fill ? decision.id : null,
    chosenIndex: fill ? decision.chosenIndex.toString() : null,
    fillBase: fill ? decision.fillBase.toString() : null,
    fillQuote: fill ? decision.fillQuote.toString() : null,
    rule: "mbbe-eligible-only",
    globalBest: false,
    mpc: false,
    status: fill ? "ranked" : "rejected",
  };
  return { opened: candidates.length, dropped, decision, receipt, candidates };
}
