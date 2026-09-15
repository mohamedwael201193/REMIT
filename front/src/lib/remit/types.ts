/**
 * REMIT domain types.
 *
 * These types describe the product surface of the REMIT protocol: mandates,
 * private offers, constrained execution, proofs and selective audit.
 * They are deliberately transport-agnostic so a future REMIT SDK can bind
 * to them without touching the UI.
 */

export type Role = "principal" | "executor" | "auditor" | "maker";

/** Private terms with no public opening. Never format the absence as $0. */
export type PrivacyLabel = "sealed" | "not-disclosed";

export const PRIVACY_LABEL_COPY: Record<PrivacyLabel, string> = {
  sealed: "SEALED",
  "not-disclosed": "NOT DISCLOSED",
};

/** Product copy for amounts that have no public opening. Never format absence as $0 / TVL. */
export const PRIVATE_COPY = "PRIVATE";

export type Side = "buy" | "sell";

export type AssetClass =
  | "digital-commodity"
  | "stablecoin"
  | "tokenized-fund"
  | "commodity"
  | "network-native";

export interface AssetRef {
  /** Trading symbol used across the product, e.g. "tNIGHT". */
  symbol: string;
  name: string;
  assetClass: AssetClass;
  /** Display precision for fractional amounts. */
  precision: number;
  /** Unit label used for indicative pricing surfaces. */
  unit: string;
}

export type CounterpartyStatus = "verified" | "conditional" | "pending";

export interface Counterparty {
  id: string;
  name: string;
  desk: string;
  region: string;
  status: CounterpartyStatus;
  /** Lifetime settled fills with this counterparty. */
  settlements: number;
}

export interface Executor {
  id: string;
  name: string;
  /** Operating model of the execution engine. */
  model: "autonomous" | "semi-autonomous" | "deterministic";
  policyBound: boolean;
}

export type MandateStatus =
  | "active"
  | "sealed"
  | "expired"
  | "revoked"
  | "exhausted";

export interface Mandate {
  id: string;
  /** Human reference, e.g. "MD-e82dea". */
  reference: string;
  asset: string;
  side: Side;
  /** Hard ceiling for a single fill, in USD. Null when the opening is sealed. */
  maxFill: number | null;
  /** Worst acceptable price. Null when the opening is sealed. */
  limitPrice: number | null;
  totalBudget: number | null;
  spent: number | null;
  amountPrivacy?: PrivacyLabel;
  /** Counterparty classes admitted by this mandate. */
  counterpartyClasses: string[];
  counterpartyIds: string[];
  /** ISO timestamp after which no fill may settle. */
  expiry: string;
  executorId: string;
  status: MandateStatus;
  createdAt: string;
  settledFills: number;
  /** Short, product-facing intent line. */
  intent: string;
}

export type OfferState =
  | "new"
  | "evaluating"
  | "compatible"
  | "incompatible"
  | "executed"
  | "declined"
  | "expired";

export interface Offer {
  id: string;
  reference: string;
  mandateId: string;
  asset: string;
  side: Side;
  price: number | null;
  /** Offered size in USD. Null when the opening is sealed. */
  size: number | null;
  amountPrivacy?: PrivacyLabel;
  counterpartyId: string;
  /** 0–100 when ranked; null when the public ledger has no opening. */
  compatibility: number | null;
  /** 0–100 when ranked; null when not scored. Never a fake confidence. */
  executionScore: number | null;
  receivedAt: string;
  expiresAt: string;
  state: OfferState;
  /** Reasons the offer falls outside the mandate envelope, if any. */
  frictions: string[];
  /** Place-offer tx when the commitment is on the indexer. */
  txHash?: string;
  block?: number;
  /** Durable RFQ inbox id after POST /rfq/offer. */
  rfqId?: string;
}

export interface PolicyCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export type ExecutionStatus =
  | "offer-matched"
  | "mandate-verified"
  | "proof-pending"
  | "settled"
  | "rejected"
  | "expired";

export function isIndexerSettled(execution: {
  status: ExecutionStatus;
  txHash?: string;
  block?: number;
}): boolean {
  return execution.status === "settled" && Boolean(execution.txHash) && execution.block != null;
}

export interface ExecutionEvent {
  at: string;
  label: string;
}

export interface Execution {
  id: string;
  reference: string;
  mandateId: string;
  offerId?: string;
  asset: string;
  side: Side;
  /** Size the executor attempted, in USD. Null when the opening is sealed. */
  attemptedFill: number | null;
  /** Size that actually settled, in USD. Undefined when rejected. Null when sealed. */
  settledFill?: number | null;
  price: number | null;
  counterpartyId: string;
  status: ExecutionStatus;
  /** Human-readable reason when the attempt was refused. */
  refusalReason?: string;
  checks: PolicyCheck[];
  events: ExecutionEvent[];
  /** Commitment reference for the zero-knowledge proof. */
  proofRef?: string;
  auditRoot?: string;
  receipt?: {
    code: string;
    issuedAt: string;
  };
  executedAt: string;
  /** Indexer-confirmed transaction hash, when the action settled or was attempted on-chain. */
  txHash?: string;
  block?: number;
  explorerUrl?: string;
}

export type DisclosureFact =
  | "fill-amount"
  | "policy-compliance"
  | "counterparty-class"
  | "execution-timestamp"
  | "mandate-active";

/** Auditor desk states. Never collapse these into "verified" because a hash exists. */
export type AuditFlowState = "sealed" | "requested" | "revealed" | "verified";

export type DisclosureState = "sealed" | "requested" | "revealed" | "verified";

export interface Disclosure {
  id: string;
  fact: DisclosureFact;
  label: string;
  state: DisclosureState;
  /** Revealed value, present once a real opening is verified. */
  value?: string;
}

export interface AuditRecord {
  id: string;
  executionRef: string;
  asset: string;
  counterpartyClass: string;
  /** Set only after verifyDisclosure against an on-chain auditRoot. A tx hash is not enough. */
  proofStatus: "verified" | "pending";
  /** On-chain auditRoots head. Empty when not opened. Never a fill tx hash. */
  auditRoot: string;
  recordedAt: string;
  disclosures: Disclosure[];
}

export type ActivityKind =
  | "mandate"
  | "offer"
  | "proof"
  | "settlement"
  | "audit"
  | "revocation";

export interface ActivityItem {
  id: string;
  at: string;
  kind: ActivityKind;
  label: string;
  detail: string;
  /** True when the event is only visible inside the private workspace. */
  privateToWorkspace: boolean;
}

export interface PortfolioSnapshot {
  principalName: string;
  deskName: string;
  activeMandates: number;
  totalBudget: number | null;
  committedBudget: number | null;
  amountPrivacy?: PrivacyLabel;
  openOffers: number;
  settledNotional: number;
  /** Indexer fill count, not a fake proof-success percentage. Null when unknown. */
  verificationRate: number | null;
  auditReadyCount: number;
}

export type WalletProviderKind = "1am" | "lace";

export interface WalletState {
  provider: WalletProviderKind | null;
  /** Display address. Never a secret — public account reference only. */
  address: string | null;
  network: "Midnight";
  networkId?: string | null;
  /** Dust balance used for protocol fees. Header DUST is not spendable coins. */
  dust: number | null;
  dustHeader?: string;
  status: "disconnected" | "connecting" | "reconnecting" | "connected";
  lastError?: string | null;
  provingPath?: "1am-intab" | "lace-http";
  proofServerReady?: boolean | null;
  /** False when connect() resolved but wallet-backed methods failed or timed out. */
  methodsReady?: boolean | null;
}

export interface NewMandateInput {
  asset: string;
  side: Side;
  maxFill: number;
  limitPrice: number;
  totalBudget: number;
  counterpartyClasses: string[];
  counterpartyIds: string[];
  expiryDays: number;
  executorId: string;
  intent: string;
}

export interface NewOfferInput {
  side: Side;
  baseAmount: number;
  quoteAmount: number;
  minFillBase?: number;
  expiryDays?: number;
}

export interface FillAttemptInput {
  offerId: string;
  /** Override the attempted size; defaults to the offer size. */
  attemptedSize?: number;
}

/** Future boundary for the REMIT SDK. The UI only ever talks to this. */
export interface RemitProvider {
  getPortfolio(): Promise<PortfolioSnapshot>;
  getMandates(): Promise<Mandate[]>;
  getOffers(): Promise<Offer[]>;
  createMandate(input: NewMandateInput): Promise<Mandate>;
  placeOffer(input: NewOfferInput): Promise<Offer>;
  executeFill(input: FillAttemptInput): Promise<Execution>;
  getExecutions(): Promise<Execution[]>;
  getAudit(): Promise<AuditRecord[]>;
  revealFact(auditId: string, disclosureId: string): Promise<Disclosure>;
  probeForgedDisclosure(): Promise<{ ok: boolean; failed: string[]; auditRoot?: string }>;
  getActivity(): Promise<ActivityItem[]>;
  connectWallet(provider: WalletProviderKind): Promise<WalletState>;
  restoreWallet(): Promise<WalletState>;
  disconnectWallet(): Promise<WalletState>;
  revokeMandates(): Promise<void>;
  withdrawLeftover(): Promise<{ txHash?: string; block?: number }>;
}
