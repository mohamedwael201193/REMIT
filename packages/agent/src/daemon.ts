import { openJson, publicLeakHits, withOfferDefaults, type InboxItem } from "@remit/core";
import type { Mandate, Offer } from "@remit/contracts/pool";
import { decideFill, type Candidate, type ExecutorDecision } from "./executor.js";

export type AgentReceipt = {
  at: number;
  candidateCount: number;
  eligibleCount: number;
  rejected: { id: string; reason: string }[];
  selectedId: string | null;
  rule: "mbbe-eligible-only";
  globalBest: false;
  mpc: false;
  status: "ranked" | "rejected";
};

/** HTTP `/agent/status` snapshot — never openings, fill sizes, or secrets. */
export type PublicAgentStatus = {
  at: number;
  candidateCount: number;
  eligibleCount: number;
  rejectedCount: number;
  selected: boolean;
  rule: "mbbe-eligible-only";
  globalBest: false;
  mpc: false;
};

/** HTTP `/agent/rank` body — ids and policy reasons only. Never fill sizes or chosenIndex. */
export type PublicAgentRank = {
  ranked: Array<{ id: string; ok: true } | { id: string; ok: false; reason: string }>;
  eligibleCount: number;
  rejected: { id: string; reason: string }[];
  selectedId: string | null;
  candidateCount: number;
  dropped: number;
  rule: "mbbe-eligible-only";
  mpc: false;
  globalBest: false;
  constructed: boolean;
  submitted: boolean;
  proving: boolean;
  txHash?: string;
  block?: number;
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
 * constructFillK binds the selected candidate. Proof/submit require a Node fill host.
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
    rule: "mbbe-eligible-only",
    globalBest: false,
    mpc: false,
    status: fill ? "ranked" : "rejected",
  };
  return { opened: candidates.length, dropped, decision, receipt, candidates };
}

export function mandateOpeningFromInbox(
  rfqSk: string,
  items: InboxItem[],
): {
  mandate: Mandate;
  mandateRand: Uint8Array;
  remaining: bigint;
  stateNonce: Uint8Array;
} | null {
  for (const item of items) {
    try {
      const opened = openJson<{
        kind?: string;
        mandate?: {
          principal: number[];
          executor: number[];
          side: string;
          maxFillBase: string;
          limitNum: string;
          limitDen: string;
          cpRoot: string;
          expiry: string;
          mandateId: number[];
        };
        mandateRand?: number[];
        remaining?: string;
        stateNonce?: number[];
      }>(rfqSk, item.boxed);
      if (opened.kind && opened.kind !== "mandate") continue;
      if (!opened.mandate || !opened.mandateRand || !opened.stateNonce) continue;
      return {
        mandate: {
          principal: Uint8Array.from(opened.mandate.principal),
          executor: Uint8Array.from(opened.mandate.executor),
          side: BigInt(opened.mandate.side),
          maxFillBase: BigInt(opened.mandate.maxFillBase),
          limitNum: BigInt(opened.mandate.limitNum),
          limitDen: BigInt(opened.mandate.limitDen),
          cpRoot: BigInt(opened.mandate.cpRoot),
          expiry: BigInt(opened.mandate.expiry),
          mandateId: Uint8Array.from(opened.mandate.mandateId),
        },
        mandateRand: Uint8Array.from(opened.mandateRand),
        remaining: BigInt(opened.remaining ?? opened.mandate.maxFillBase),
        stateNonce: Uint8Array.from(opened.stateNonce),
      };
    } catch {
      continue;
    }
  }
  return null;
}

export function publicAgentStatusView(receipt: AgentReceipt): PublicAgentStatus {
  return {
    at: receipt.at,
    candidateCount: receipt.candidateCount,
    eligibleCount: receipt.eligibleCount,
    rejectedCount: receipt.rejected.length,
    selected: receipt.selectedId !== null,
    rule: "mbbe-eligible-only",
    globalBest: false,
    mpc: false,
  };
}

export function publicAgentRankView(planned: PlannedFill): PublicAgentRank {
  return {
    ranked: planned.decision.ranked.map((r) =>
      r.ok ? { id: r.id, ok: true as const } : { id: r.id, ok: false as const, reason: r.reason },
    ),
    eligibleCount: planned.receipt.eligibleCount,
    rejected: planned.receipt.rejected,
    selectedId: planned.receipt.selectedId,
    candidateCount: planned.receipt.candidateCount,
    dropped: planned.dropped,
    rule: "mbbe-eligible-only",
    mpc: false,
    globalBest: false,
    constructed: false,
    submitted: false,
    proving: false,
  };
}

export function agentHttpHasLeakKeys(payload: unknown): string[] {
  return publicLeakHits(payload);
}
