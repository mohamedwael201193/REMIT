/**
 * Browser-safe public API + indexer mapping.
 * No compact-runtime, no wallet-sdk, no secrets.
 */
import { contractsDeployed, fetchRemitHealth, type RemitPublicHealth } from "./health.js";

export { contractsDeployed, fetchRemitHealth };
export type { RemitPublicHealth };

export const PREPROD_EXPLORER_TX = "https://preprod.midnightexplorer.com/tx/";
export const PREPROD_INDEXER = "https://indexer.preprod.midnight.network/api/v4/graphql";

export type RemitPublicConfig = {
  ok: boolean;
  live: boolean;
  network: string;
  pool: string;
  quote: string;
  indexer: string;
  rfqPublic: string | null;
  executorKey?: string | null;
  mpc: false;
  dustGate: string;
  keysUrl: string;
  explorerTx: string;
  zkirUrl?: string;
  indexerWs?: string;
  visibility: string;
};

export type RemitChainContract = {
  address: string;
  txHash?: string;
  block?: number;
  fills?: number;
  openOffers?: number;
  activeMandates?: number;
};

export type RemitChainSnapshot = {
  live: boolean;
  network: string;
  protocolVersion?: number;
  pool?: RemitChainContract;
  quote?: RemitChainContract;
};

export type RemitEvidenceStep = {
  name: string;
  ok: boolean;
  txHash?: string;
  block?: number;
  detail?: string;
};

export type RemitPublicEvidence = {
  present: boolean;
  network?: string;
  pool?: { address: string; txHash?: string; block?: number };
  quote?: { address: string; txHash?: string; block?: number };
  steps: RemitEvidenceStep[];
  mpc: false;
};

export type MappedActivity = {
  id: string;
  at: string;
  kind: "mandate" | "offer" | "proof" | "settlement" | "audit" | "revocation";
  label: string;
  detail: string;
  privateToWorkspace: boolean;
};

/** Private openings are not on the public ledger. UI must not format these as $0. */
export type PrivacyLabel = "sealed" | "not-disclosed";

export type MappedExecution = {
  id: string;
  reference: string;
  mandateId: string;
  offerId?: string;
  asset: string;
  side: "buy" | "sell";
  attemptedFill: number | null;
  settledFill?: number | null;
  price: number | null;
  counterpartyId: string;
  status: "settled" | "rejected" | "proof-pending";
  refusalReason?: string;
  checks: { label: string; passed: boolean; detail: string }[];
  events: { at: string; label: string }[];
  proofRef?: string;
  auditRoot?: string;
  receipt?: { code: string; issuedAt: string };
  executedAt: string;
  txHash?: string;
  block?: number;
  explorerUrl?: string;
};

export type MappedMandate = {
  id: string;
  reference: string;
  asset: string;
  side: "buy";
  maxFill: number | null;
  limitPrice: number | null;
  totalBudget: number | null;
  spent: number | null;
  amountPrivacy: PrivacyLabel;
  counterpartyClasses: string[];
  counterpartyIds: string[];
  expiry: string;
  executorId: string;
  status: "active" | "revoked" | "exhausted";
  createdAt: string;
  settledFills: number;
  intent: string;
};

export type MappedOffer = {
  id: string;
  reference: string;
  mandateId: string;
  asset: string;
  side: "sell";
  price: number | null;
  size: number | null;
  amountPrivacy: PrivacyLabel;
  counterpartyId: string;
  compatibility: number | null;
  executionScore: number | null;
  receivedAt: string;
  expiresAt: string;
  state: "new" | "compatible" | "incompatible" | "executed" | "declined";
  frictions: string[];
  txHash?: string;
};

export type MappedWorkspace = {
  portfolio: {
    principalName: string;
    deskName: string;
    activeMandates: number;
    totalBudget: number | null;
    committedBudget: number | null;
    amountPrivacy: PrivacyLabel;
    openOffers: number;
    settledNotional: number;
    verificationRate: number | null;
    auditReadyCount: number;
  };
  mandates: MappedMandate[];
  offers: MappedOffer[];
  executions: MappedExecution[];
  activity: MappedActivity[];
};

function apiRoot(apiUrl: string): string {
  return apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
}

export function explorerTxUrl(hash?: string, base = PREPROD_EXPLORER_TX): string | undefined {
  if (!hash) return undefined;
  const h = hash.replace(/^0x/i, "");
  return `${base.replace(/\/$/, "")}/${h}`;
}

export async function fetchRemitConfig(apiUrl: string): Promise<RemitPublicConfig> {
  const res = await fetch(new URL("/config", apiRoot(apiUrl)));
  if (!res.ok) throw new Error(`config ${res.status}`);
  return (await res.json()) as RemitPublicConfig;
}

export async function fetchRemitChain(apiUrl: string): Promise<RemitChainSnapshot> {
  const res = await fetch(new URL("/chain", apiRoot(apiUrl)));
  if (!res.ok) throw new Error(`chain ${res.status}`);
  return (await res.json()) as RemitChainSnapshot;
}

export async function fetchRemitEvidence(apiUrl: string): Promise<RemitPublicEvidence> {
  const res = await fetch(new URL("/evidence", apiRoot(apiUrl)));
  if (!res.ok) throw new Error(`evidence ${res.status}`);
  return (await res.json()) as RemitPublicEvidence;
}

export type RemitAuditHead = {
  ok: boolean;
  auditRoot: string | null;
  fills?: string;
  openOffers?: string;
  txHashIsNotAuditRoot?: boolean;
};

export async function fetchRemitAuditHead(apiUrl: string): Promise<RemitAuditHead> {
  const res = await fetch(new URL("/audit/head", apiRoot(apiUrl)));
  if (!res.ok) throw new Error(`audit/head ${res.status}`);
  const body = (await res.json()) as Partial<RemitAuditHead>;
  const root = typeof body.auditRoot === "string" && /^[0-9a-f]{64}$/i.test(body.auditRoot) ? body.auditRoot.toLowerCase() : null;
  return {
    ok: Boolean(body.ok && root),
    auditRoot: root,
    fills: body.fills,
    openOffers: body.openOffers,
    txHashIsNotAuditRoot: true,
  };
}

export async function postRemitRfqOffer(apiUrl: string, boxed: string): Promise<{ id: string }> {
  const res = await fetch(new URL("/rfq/offer", apiRoot(apiUrl)), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ box: boxed }),
  });
  if (res.status === 409) throw new Error("RFQ nonce already delivered");
  if (!res.ok) throw new Error(`rfq/offer ${res.status}`);
  return (await res.json()) as { id: string };
}

const KIND_BY_STEP: Record<string, MappedActivity["kind"]> = {
  "pool-create-mandate": "mandate",
  "pool-place-offer": "offer",
  "pool-place-over-offer": "offer",
  "pool-place-price-offer": "offer",
  "overreach-compact": "proof",
  "price-violation-compact": "proof",
  "pool-fill": "settlement",
  "pool-k3-fill": "settlement",
  "mbbe-padded-fill-historical": "settlement",
  "pool-place-maker-a-ineligible": "offer",
  "pool-place-maker-b-eligible": "offer",
  "pool-place-maker-c-best-partial": "offer",
  "agent-rank": "proof",
  "selective-audit": "audit",
  "pool-revoke": "revocation",
  "pool-withdraw": "settlement",
  "pool-cancel-over-offer": "offer",
};

function stepKind(name: string): MappedActivity["kind"] {
  return KIND_BY_STEP[name] ?? "proof";
}

function isFillStep(name: string): boolean {
  return name === "pool-fill" || name === "pool-k3-fill" || name === "mbbe-padded-fill-historical";
}

/** Latest indexer tx is often a fill. Never label it as the mandate when evidence already named it. */
function nonMandateTxHashes(steps: RemitEvidenceStep[]): Set<string> {
  const out = new Set<string>();
  for (const s of steps) {
    if (!s.txHash || s.name === "pool-create-mandate") continue;
    out.add(s.txHash);
  }
  return out;
}

/** Indexer/evidence → workspace. Private openings stay null ("sealed"), never numeric 0. */
export function mapPublicWorkspace(args: {
  chain: RemitChainSnapshot;
  evidence: RemitPublicEvidence;
  principalName?: string;
}): MappedWorkspace {
  const fills = args.chain.pool?.fills ?? 0;
  const openOffers = args.chain.pool?.openOffers ?? 0;
  const activeMandates = args.chain.pool?.activeMandates ?? 0;
  const now = new Date().toISOString();
  const poolAddr = args.chain.pool?.address ?? args.evidence.pool?.address ?? "";
  const mandateId = poolAddr ? `mandate:${poolAddr}` : "mandate:pending";

  const liveTx = args.chain.pool?.txHash;
  const liveBlock = args.chain.pool?.block;
  const activity: MappedActivity[] = args.evidence.steps.map((s) => ({
    id: `step:${s.name}:${s.txHash ?? s.detail ?? "na"}`,
    at: now,
    kind: stepKind(s.name),
    label: s.name,
    detail: [s.ok ? "ok" : "fail", s.txHash, s.block != null ? `block ${s.block}` : undefined, s.detail]
      .filter(Boolean)
      .join(" · "),
    privateToWorkspace: false,
  }));
  if (liveTx && !activity.some((a) => a.detail.includes(liveTx))) {
    activity.unshift({
      id: `chain:pool:${liveTx}`,
      at: now,
      kind: "proof",
      label: "pool-contractAction",
      detail: ["ok", liveTx, liveBlock != null ? `block ${liveBlock}` : undefined, "indexer latest"]
        .filter(Boolean)
        .join(" · "),
      privateToWorkspace: false,
    });
  }

  const executions: MappedExecution[] = [];
  for (const s of args.evidence.steps) {
    if (isFillStep(s.name)) {
      executions.push({
        id: `fill:${s.txHash ?? "pending"}`,
        reference: s.txHash ? s.txHash.slice(0, 10) : "FILL",
        mandateId,
        offerId: "offer:compliant",
        asset: "tNIGHT",
        side: "buy",
        attemptedFill: null,
        settledFill: s.ok ? null : undefined,
        price: null,
        counterpartyId: "cp-onchain",
        status: s.ok ? "settled" : "rejected",
        refusalReason: s.ok ? undefined : s.detail,
        checks: [
          { label: "Indexer contractAction", passed: Boolean(s.txHash && s.block != null), detail: s.txHash ?? "" },
          { label: "Compact fill", passed: s.ok, detail: s.detail ?? "" },
        ],
        events: [{ at: now, label: s.ok ? "Indexer-confirmed fill" : "Fill did not settle" }],
        proofRef: s.txHash,
        receipt: s.ok && s.txHash ? { code: s.txHash.slice(0, 12), issuedAt: now } : undefined,
        executedAt: now,
        txHash: s.txHash,
        block: s.block,
        explorerUrl: explorerTxUrl(s.txHash),
      });
    }
    if (s.name === "overreach-compact") {
      executions.push({
        id: `overreach:${s.txHash ?? s.detail ?? "attempt"}`,
        reference: "OVER-CAP",
        mandateId,
        offerId: "offer:over",
        asset: "tNIGHT",
        side: "buy",
        attemptedFill: null,
        price: null,
        counterpartyId: "cp-onchain",
        status: "rejected",
        refusalReason: s.ok ? "Compact rejected X+20% fill" : s.detail,
        checks: [{ label: "Per-fill cap", passed: s.ok, detail: s.detail ?? "over-cap" }],
        events: [{ at: now, label: "Overreach attempt — no settlement" }],
        executedAt: now,
        txHash: s.txHash,
        block: s.block,
        explorerUrl: explorerTxUrl(s.txHash),
      });
    }
    if (s.name === "price-violation-compact") {
      executions.push({
        id: `price:${s.txHash ?? s.detail ?? "attempt"}`,
        reference: "PRICE",
        mandateId,
        offerId: "offer:price",
        asset: "tNIGHT",
        side: "buy",
        attemptedFill: null,
        price: null,
        counterpartyId: "cp-onchain",
        status: "rejected",
        refusalReason: s.ok ? "Compact rejected price-limit violation" : s.detail,
        checks: [{ label: "Price limit", passed: s.ok, detail: s.detail ?? "price" }],
        events: [{ at: now, label: "Price-violation attempt — no settlement" }],
        executedAt: now,
        txHash: s.txHash,
        block: s.block,
        explorerUrl: explorerTxUrl(s.txHash),
      });
    }
  }

  const mandates: MappedMandate[] = [];
  if (args.evidence.steps.some((s) => s.name === "pool-create-mandate" && s.ok) || activeMandates > 0) {
    const created = args.evidence.steps.find((s) => s.name === "pool-create-mandate");
    const revoked = args.evidence.steps.some((s) => s.name === "pool-revoke" && s.ok);
    const stolen = Boolean(liveTx && nonMandateTxHashes(args.evidence.steps).has(liveTx));
    const liveMandate = activeMandates > 0 && liveTx && !stolen;
    const mandateTx = liveMandate ? liveTx : created?.txHash ?? (activeMandates > 0 ? liveTx : undefined);
    const mandateBlock = liveMandate ? liveBlock : created?.block ?? (activeMandates > 0 ? liveBlock : undefined);
    mandates.push({
      id: mandateId,
      reference: poolAddr ? `MD-${poolAddr.slice(0, 6)}` : "MD-LIVE",
      asset: "tNIGHT",
      side: "buy",
      maxFill: null,
      limitPrice: null,
      totalBudget: null,
      spent: null,
      amountPrivacy: "sealed",
      counterpartyClasses: [],
      counterpartyIds: ["cp-onchain"],
      expiry: now,
      executorId: "ex-remit",
      status: activeMandates > 0 ? "active" : revoked ? "revoked" : "exhausted",
      createdAt: now,
      settledFills: fills,
      intent: mandateTx
        ? `On-chain mandate. Openings stay private. tx ${mandateTx}${mandateBlock != null ? ` · block ${mandateBlock}` : ""}`
        : "Indexer-backed mandate counter. Openings are not on the public ledger.",
    });
  }

  const offers: MappedOffer[] = [];
  const addOffer = (
    id: string,
    name: string,
    state: MappedOffer["state"],
    frictions: string[],
    stepName: string,
  ) => {
    const step = args.evidence.steps.find((s) => s.name === stepName);
    if (!step) return;
    offers.push({
      id,
      reference: name,
      mandateId,
      asset: "tNIGHT",
      side: "sell",
      price: null,
      size: null,
      amountPrivacy: "sealed",
      counterpartyId: "cp-onchain",
      compatibility: null,
      executionScore: null,
      receivedAt: now,
      expiresAt: now,
      state,
      frictions,
      txHash: step?.txHash,
    });
  };
  addOffer("offer:over", "OVER-CAP", "incompatible", ["Exceeds mandate max fill (X+20%)"], "pool-place-over-offer");
  addOffer("offer:price", "PRICE-LIMIT", "incompatible", ["Outside mandate price limit"], "pool-place-price-offer");
  const fillOk = args.evidence.steps.some((s) => isFillStep(s.name) && s.ok);
  addOffer(
    "offer:compliant",
    "COMPLIANT",
    fillOk ? "executed" : "compatible",
    [],
    "pool-place-offer",
  );
  addOffer(
    "offer:maker-a",
    "MAKER-A",
    "incompatible",
    ["Min-fill outside this mandate"],
    "pool-place-maker-a-ineligible",
  );
  addOffer("offer:maker-b", "MAKER-B", "compatible", [], "pool-place-maker-b-eligible");
  addOffer(
    "offer:maker-c",
    "MAKER-C",
    fillOk ? "executed" : "compatible",
    [],
    "pool-place-maker-c-best-partial",
  );

  return {
    portfolio: {
      principalName: args.principalName ?? "",
      deskName: args.chain.live ? "Midnight Preprod" : "",
      activeMandates,
      totalBudget: null,
      committedBudget: null,
      amountPrivacy: "sealed",
      openOffers,
      settledNotional: fills,
      verificationRate: null,
      auditReadyCount: args.evidence.steps.some((s) => s.name === "selective-audit" && s.ok) ? 1 : 0,
    },
    mandates,
    offers,
    executions,
    activity,
  };
}

export function assertNoProductionMock(label: string, value: string | undefined): void {
  const v = (value ?? "").toLowerCase();
  if (!v) return;
  if (v.includes("mock") || v.includes("fake") || v.includes("simulated") || v.includes("placeholder")) {
    throw new Error(`${label} looks like a mock value`);
  }
}
