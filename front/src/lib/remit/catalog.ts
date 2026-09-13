/**
 * Display catalog for the supplied visual system.
 *
 * Wave 1 live data comes from the provider (indexer + API evidence).
 * Lookup helpers never fall back to a fictional asset or desk.
 * The arrays below remain for landing copy only and are not a production ledger.
 */

import type {
  ActivityItem,
  AssetRef,
  AuditRecord,
  Counterparty,
  Execution,
  Executor,
  Mandate,
  Offer,
} from "./types";

/* ── time helpers (dataset is anchored to session time) ──────────── */

const now = () => Date.now();
const minutes = (n: number) => n * 60_000;
const hours = (n: number) => n * 3_600_000;
const days = (n: number) => n * 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const ago = (ms: number) => iso(now() - ms);
const ahead = (ms: number) => iso(now() + ms);

/* ── assets ───────────────────────────────────────────────────────── */

export const ASSETS: AssetRef[] = [
  {
    symbol: "tNIGHT",
    name: "Preprod tNIGHT",
    assetClass: "network-native",
    precision: 6,
    unit: "tNIGHT",
  },
  {
    symbol: "REMIT-Q",
    name: "REMIT-Q testnet quote token",
    assetClass: "network-native",
    precision: 0,
    unit: "REMIT-Q",
  },
  {
    symbol: "wBTC.n",
    name: "Wrapped Bitcoin",
    assetClass: "digital-commodity",
    precision: 4,
    unit: "wBTC.n",
  },
  {
    symbol: "wETH.n",
    name: "Wrapped Ether",
    assetClass: "digital-commodity",
    precision: 3,
    unit: "wETH.n",
  },
  {
    symbol: "USDC.n",
    name: "USD Coin",
    assetClass: "stablecoin",
    precision: 2,
    unit: "USDC.n",
  },
  {
    symbol: "DUST",
    name: "Network Dust",
    assetClass: "network-native",
    precision: 2,
    unit: "DUST",
  },
  {
    symbol: "XAU.n",
    name: "Tokenized Gold",
    assetClass: "commodity",
    precision: 2,
    unit: "oz",
  },
  {
    symbol: "TGF-NAV",
    name: "Tokenized Growth Fund",
    assetClass: "tokenized-fund",
    precision: 4,
    unit: "units",
  },
  {
    symbol: "MMLF",
    name: "Midnight Liquidity Fund",
    assetClass: "tokenized-fund",
    precision: 2,
    unit: "units",
  },
];

export const assetBySymbol = (symbol: string): AssetRef =>
  ASSETS.find((a) => a.symbol === symbol) ?? {
    symbol,
    name: symbol,
    assetClass: "network-native",
    precision: 2,
    unit: symbol,
  };

/* ── counterparties ───────────────────────────────────────────────── */

export const COUNTERPARTIES: Counterparty[] = [
  {
    id: "cp-northline",
    name: "Northline Capital",
    desk: "Tier-1 OTC",
    region: "Zürich",
    status: "verified",
    settlements: 1_284,
  },
  {
    id: "cp-meridian",
    name: "Meridian Liquidity",
    desk: "Principal desk",
    region: "London",
    status: "verified",
    settlements: 977,
  },
  {
    id: "cp-harbour",
    name: "Harbour & Slate",
    desk: "Boutique desk",
    region: "New York",
    status: "verified",
    settlements: 512,
  },
  {
    id: "cp-kestrel",
    name: "Kestrel Markets",
    desk: "Agency",
    region: "Singapore",
    status: "conditional",
    settlements: 208,
  },
  {
    id: "cp-ardent",
    name: "Ardent Desk",
    desk: "OTC",
    region: "Dubai",
    status: "verified",
    settlements: 743,
  },
  {
    id: "cp-ironwood",
    name: "Ironwood OTC",
    desk: "Tier-1 OTC",
    region: "Toronto",
    status: "verified",
    settlements: 1_102,
  },
  {
    id: "cp-solace",
    name: "Solace Trading",
    desk: "Principal desk",
    region: "Hong Kong",
    status: "pending",
    settlements: 41,
  },
];

export const counterpartyById = (id: string): Counterparty =>
  COUNTERPARTIES.find((c) => c.id === id) ?? {
    id,
    name: id,
    desk: "On-chain",
    region: "Preprod",
    status: "pending",
    settlements: 0,
  };

export const COUNTERPARTY_CLASSES = [
  "Tier-1 OTC desks",
  "Regulated agencies",
  "Boutique desks",
] as const;

/* ── executors ────────────────────────────────────────────────────── */

export const EXECUTORS: Executor[] = [
  {
    id: "ex-corvus",
    name: "Corvus Execution Engine",
    model: "autonomous",
    policyBound: true,
  },
  {
    id: "ex-halcyon",
    name: "Halcyon Agent",
    model: "semi-autonomous",
    policyBound: true,
  },
  {
    id: "ex-ledgerline",
    name: "Ledgerline Autonomy",
    model: "deterministic",
    policyBound: true,
  },
];

export const executorById = (id: string): Executor =>
  EXECUTORS.find((e) => e.id === id) ?? {
    id,
    name: "Constrained broker",
    model: "deterministic",
    policyBound: true,
  };

/* ── mandates ─────────────────────────────────────────────────────── */

export const MANDATES: Mandate[] = [
  {
    id: "md-2841",
    reference: "MD-2841",
    asset: "wBTC.n",
    side: "buy",
    maxFill: 250_000,
    limitPrice: 64_800,
    totalBudget: 2_500_000,
    spent: 660_000,
    counterpartyClasses: ["Tier-1 OTC desks", "Regulated agencies"],
    counterpartyIds: ["cp-northline", "cp-meridian", "cp-ironwood"],
    expiry: ahead(days(26)),
    executorId: "ex-corvus",
    status: "active",
    createdAt: ago(days(34)),
    settledFills: 3,
    intent: "Accumulate core digital-commodity exposure quietly.",
  },
  {
    id: "md-2796",
    reference: "MD-2796",
    asset: "XAU.n",
    side: "buy",
    maxFill: 100_000,
    limitPrice: 2_415,
    totalBudget: 750_000,
    spent: 412_500,
    counterpartyClasses: ["Tier-1 OTC desks", "Boutique desks"],
    counterpartyIds: ["cp-harbour", "cp-ironwood", "cp-ardent"],
    expiry: ahead(days(11)),
    executorId: "ex-halcyon",
    status: "active",
    createdAt: ago(days(19)),
    settledFills: 5,
    intent: "Hedge duration with tokenized gold, capped per fill.",
  },
  {
    id: "md-2867",
    reference: "MD-2867",
    asset: "USDC.n",
    side: "buy",
    maxFill: 10_000,
    limitPrice: 1.0002,
    totalBudget: 50_000,
    spent: 0,
    counterpartyClasses: ["Tier-1 OTC desks"],
    counterpartyIds: ["cp-northline", "cp-meridian"],
    expiry: ahead(days(40)),
    executorId: "ex-corvus",
    status: "active",
    createdAt: ago(days(2)),
    settledFills: 0,
    intent: "First-run mandate — verify the enforcement boundary.",
  },
  {
    id: "md-2751",
    reference: "MD-2751",
    asset: "wETH.n",
    side: "sell",
    maxFill: 150_000,
    limitPrice: 3_115,
    totalBudget: 450_000,
    spent: 450_000,
    counterpartyClasses: ["Tier-1 OTC desks"],
    counterpartyIds: ["cp-northline", "cp-ironwood"],
    expiry: ago(days(3)),
    executorId: "ex-ledgerline",
    status: "expired",
    createdAt: ago(days(60)),
    settledFills: 4,
    intent: "Programmatic reduction above the reserve price.",
  },
  {
    id: "md-2688",
    reference: "MD-2688",
    asset: "TGF-NAV",
    side: "buy",
    maxFill: 80_000,
    limitPrice: 11.4,
    totalBudget: 240_000,
    spent: 0,
    counterpartyClasses: ["Regulated agencies"],
    counterpartyIds: ["cp-kestrel"],
    expiry: ahead(days(52)),
    executorId: "ex-halcyon",
    status: "revoked",
    createdAt: ago(days(45)),
    settledFills: 0,
    intent: "Fund allocation — authorization withdrawn before first fill.",
  },
];

export const mandateById = (id: string): Mandate | undefined =>
  MANDATES.find((m) => m.id === id);

/* ── offers (private RFQ responses) ───────────────────────────────── */

export const OFFERS: Offer[] = [
  {
    id: "of-9214",
    reference: "OF-9214",
    mandateId: "md-2841",
    asset: "wBTC.n",
    side: "buy",
    price: 64_120,
    size: 180_000,
    counterpartyId: "cp-northline",
    compatibility: 96,
    executionScore: 92,
    receivedAt: ago(minutes(14)),
    expiresAt: ahead(minutes(47)),
    state: "compatible",
    frictions: [],
  },
  {
    id: "of-9213",
    reference: "OF-9213",
    mandateId: "md-2841",
    asset: "wBTC.n",
    side: "buy",
    price: 64_910,
    size: 120_000,
    counterpartyId: "cp-meridian",
    compatibility: 64,
    executionScore: 58,
    receivedAt: ago(minutes(38)),
    expiresAt: ahead(minutes(22)),
    state: "incompatible",
    frictions: ["Price exceeds mandate limit"],
  },
  {
    id: "of-9208",
    reference: "OF-9208",
    mandateId: "md-2796",
    asset: "XAU.n",
    side: "buy",
    price: 2_398.4,
    size: 95_000,
    counterpartyId: "cp-harbour",
    compatibility: 93,
    executionScore: 88,
    receivedAt: ago(hours(2)),
    expiresAt: ahead(hours(3)),
    state: "compatible",
    frictions: [],
  },
  {
    id: "of-9202",
    reference: "OF-9202",
    mandateId: "md-2867",
    asset: "USDC.n",
    side: "buy",
    price: 1.0001,
    size: 8_000,
    counterpartyId: "cp-northline",
    compatibility: 98,
    executionScore: 95,
    receivedAt: ago(minutes(9)),
    expiresAt: ahead(hours(1)),
    state: "compatible",
    frictions: [],
  },
  {
    id: "of-9197",
    reference: "OF-9197",
    mandateId: "md-2841",
    asset: "wBTC.n",
    side: "buy",
    price: 64_480,
    size: 500_000,
    counterpartyId: "cp-kestrel",
    compatibility: 41,
    executionScore: 37,
    receivedAt: ago(hours(5)),
    expiresAt: ahead(hours(2)),
    state: "incompatible",
    frictions: [
      "Size exceeds per-fill cap",
      "Counterparty outside admitted set",
    ],
  },
  {
    id: "of-9188",
    reference: "OF-9188",
    mandateId: "md-2796",
    asset: "XAU.n",
    side: "buy",
    price: 2_411,
    size: 40_000,
    counterpartyId: "cp-ironwood",
    compatibility: 87,
    executionScore: 81,
    receivedAt: ago(hours(7)),
    expiresAt: ahead(minutes(90)),
    state: "compatible",
    frictions: [],
  },
  {
    id: "of-9176",
    reference: "OF-9176",
    mandateId: "md-2688",
    asset: "TGF-NAV",
    side: "buy",
    price: 11.32,
    size: 60_000,
    counterpartyId: "cp-kestrel",
    compatibility: 79,
    executionScore: 74,
    receivedAt: ago(days(2)),
    expiresAt: ago(hours(20)),
    state: "expired",
    frictions: ["Mandate authorization revoked"],
  },
];

export const offerById = (id: string): Offer | undefined =>
  OFFERS.find((o) => o.id === id);

/* ── executions ───────────────────────────────────────────────────── */

const checksFor = (all: [string, boolean, string][]) =>
  all.map(([label, passed, detail]) => ({ label, passed, detail }));

export const EXECUTIONS: Execution[] = [
  {
    id: "ex-4471",
    reference: "EX-4471",
    mandateId: "md-2841",
    offerId: "of-9214",
    asset: "wBTC.n",
    side: "buy",
    attemptedFill: 180_000,
    settledFill: 180_000,
    price: 64_120,
    counterpartyId: "cp-northline",
    status: "settled",
    checks: checksFor([
      ["Within price limit", true, "$64,120 ≤ $64,800 limit"],
      ["Within size limit", true, "$180,000 ≤ $250,000 per-fill cap"],
      ["Counterparty allowed", true, "Northline Capital · Tier-1 OTC"],
      ["Mandate active", true, "MD-2841 · expires in 26 days"],
      ["Budget available", true, "$1,840,000 remaining of $2,500,000"],
    ]),
    events: [
      { at: ago(minutes(14)), label: "Offer matched privately" },
      { at: ago(minutes(13)), label: "Mandate verified against offer" },
      { at: ago(minutes(12)), label: "Proof generated" },
      { at: ago(minutes(11)), label: "Proof accepted on Midnight" },
      { at: ago(minutes(10)), label: "Settlement executed" },
      { at: ago(minutes(10)), label: "Receipt issued" },
    ],
    proofRef: "prf_7c1d…a90e",
    auditRoot: "ar_44f2…c711",
    receipt: { code: "RCP-2261", issuedAt: ago(minutes(10)) },
    executedAt: ago(minutes(10)),
  },
  {
    id: "ex-4468",
    reference: "EX-4468",
    mandateId: "md-2867",
    asset: "USDC.n",
    side: "buy",
    attemptedFill: 12_000,
    price: 1.0001,
    counterpartyId: "cp-northline",
    status: "rejected",
    refusalReason: "Fill exceeds per-fill mandate cap.",
    checks: checksFor([
      ["Within price limit", true, "$1.0001 ≤ $1.0002 limit"],
      ["Within size limit", false, "$12,000 > $10,000 per-fill cap"],
      ["Counterparty allowed", true, "Northline Capital · Tier-1 OTC"],
      ["Mandate active", true, "MD-2867 · expires in 40 days"],
      ["Budget available", true, "$50,000 remaining of $50,000"],
    ]),
    events: [
      { at: ago(hours(3)), label: "Offer matched privately" },
      { at: ago(hours(3)), label: "Policy check failed before settlement" },
      { at: ago(hours(3)), label: "Rejected — no value moved" },
    ],
    executedAt: ago(hours(3)),
  },
  {
    id: "ex-4462",
    reference: "EX-4462",
    mandateId: "md-2796",
    offerId: "of-9208",
    asset: "XAU.n",
    side: "buy",
    attemptedFill: 95_000,
    settledFill: 95_000,
    price: 2_398.4,
    counterpartyId: "cp-harbour",
    status: "settled",
    checks: checksFor([
      ["Within price limit", true, "$2,398.40 ≤ $2,415 limit"],
      ["Within size limit", true, "$95,000 ≤ $100,000 per-fill cap"],
      ["Counterparty allowed", true, "Harbour & Slate · Boutique desk"],
      ["Mandate active", true, "MD-2796 · expires in 11 days"],
      ["Budget available", true, "$337,500 remaining of $750,000"],
    ]),
    events: [
      { at: ago(hours(26)), label: "Offer matched privately" },
      { at: ago(hours(26)), label: "Mandate verified against offer" },
      { at: ago(hours(25)), label: "Proof generated" },
      { at: ago(hours(25)), label: "Proof accepted on Midnight" },
      { at: ago(hours(25)), label: "Settlement executed" },
      { at: ago(hours(25)), label: "Receipt issued" },
    ],
    proofRef: "prf_2e8b…41dc",
    auditRoot: "ar_9103…88fa",
    receipt: { code: "RCP-2254", issuedAt: ago(hours(25)) },
    executedAt: ago(hours(25)),
  },
  {
    id: "ex-4455",
    reference: "EX-4455",
    mandateId: "md-2841",
    asset: "wBTC.n",
    side: "buy",
    attemptedFill: 60_000,
    price: 64_055,
    counterpartyId: "cp-ironwood",
    status: "proof-pending",
    checks: checksFor([
      ["Within price limit", true, "$64,055 ≤ $64,800 limit"],
      ["Within size limit", true, "$60,000 ≤ $250,000 per-fill cap"],
      ["Counterparty allowed", true, "Ironwood OTC · Tier-1 OTC"],
      ["Mandate active", true, "MD-2841 · expires in 26 days"],
      ["Budget available", true, "$1,840,000 remaining of $2,500,000"],
    ]),
    events: [
      { at: ago(minutes(4)), label: "Offer matched privately" },
      { at: ago(minutes(3)), label: "Mandate verified against offer" },
      { at: ago(minutes(2)), label: "Proof generation in progress" },
    ],
    executedAt: ago(minutes(4)),
  },
  {
    id: "ex-4441",
    reference: "EX-4441",
    mandateId: "md-2841",
    asset: "wBTC.n",
    side: "buy",
    attemptedFill: 220_000,
    settledFill: 220_000,
    price: 64_310,
    counterpartyId: "cp-meridian",
    status: "settled",
    checks: checksFor([
      ["Within price limit", true, "$64,310 ≤ $64,800 limit"],
      ["Within size limit", true, "$220,000 ≤ $250,000 per-fill cap"],
      ["Counterparty allowed", true, "Meridian Liquidity · Principal desk"],
      ["Mandate active", true, "MD-2841 · was active at execution"],
      ["Budget available", true, "Budget available at execution"],
    ]),
    events: [
      { at: ago(days(6)), label: "Offer matched privately" },
      { at: ago(days(6)), label: "Mandate verified against offer" },
      { at: ago(days(6)), label: "Proof generated" },
      { at: ago(days(6)), label: "Proof accepted on Midnight" },
      { at: ago(days(6)), label: "Settlement executed" },
      { at: ago(days(6)), label: "Receipt issued" },
    ],
    proofRef: "prf_55d0…77bc",
    auditRoot: "ar_2210…4e19",
    receipt: { code: "RCP-2219", issuedAt: ago(days(6)) },
    executedAt: ago(days(6)),
  },
  {
    id: "ex-4417",
    reference: "EX-4417",
    mandateId: "md-2751",
    asset: "wETH.n",
    side: "sell",
    attemptedFill: 90_000,
    price: 3_108,
    counterpartyId: "cp-northline",
    status: "expired",
    refusalReason: "Mandate expired before settlement.",
    checks: checksFor([
      ["Within price limit", true, "$3,108 ≥ $3,115 reserve — not met"],
      ["Within size limit", true, "$90,000 ≤ $150,000 per-fill cap"],
      ["Counterparty allowed", true, "Northline Capital · Tier-1 OTC"],
      ["Mandate active", false, "MD-2751 expired 3 days ago"],
      ["Budget available", true, "Fully committed at expiry"],
    ]),
    events: [
      { at: ago(days(3)), label: "Offer matched privately" },
      { at: ago(days(3)), label: "Expiry check failed" },
      { at: ago(days(3)), label: "Lapsed — no value moved" },
    ],
    executedAt: ago(days(3)),
  },
];

/* ── audit records ────────────────────────────────────────────────── */

export const AUDIT_RECORDS: AuditRecord[] = [
  {
    id: "au-881",
    executionRef: "EX-4471",
    asset: "wBTC.n",
    counterpartyClass: "Tier-1 OTC",
    proofStatus: "verified",
    auditRoot: "ar_44f2…c711",
    verifiedAt: ago(minutes(11)),
    disclosures: [
      {
        id: "au-881-f1",
        fact: "fill-amount",
        label: "Fill amount",
        state: "sealed",
      },
      {
        id: "au-881-f2",
        fact: "policy-compliance",
        label: "Policy compliance",
        state: "disclosed",
        value: "Compliant — all mandate bounds satisfied",
      },
      {
        id: "au-881-f3",
        fact: "counterparty-class",
        label: "Counterparty class",
        state: "sealed",
      },
      {
        id: "au-881-f4",
        fact: "execution-timestamp",
        label: "Execution timestamp",
        state: "sealed",
      },
    ],
  },
  {
    id: "au-878",
    executionRef: "EX-4462",
    asset: "XAU.n",
    counterpartyClass: "Boutique desk",
    proofStatus: "verified",
    auditRoot: "ar_9103…88fa",
    verifiedAt: ago(hours(25)),
    disclosures: [
      {
        id: "au-878-f1",
        fact: "fill-amount",
        label: "Fill amount",
        state: "sealed",
      },
      {
        id: "au-878-f2",
        fact: "policy-compliance",
        label: "Policy compliance",
        state: "sealed",
      },
      {
        id: "au-878-f3",
        fact: "counterparty-class",
        label: "Counterparty class",
        state: "sealed",
      },
      {
        id: "au-878-f4",
        fact: "execution-timestamp",
        label: "Execution timestamp",
        state: "sealed",
      },
    ],
  },
  {
    id: "au-874",
    executionRef: "EX-4441",
    asset: "wBTC.n",
    counterpartyClass: "Principal desk",
    proofStatus: "verified",
    auditRoot: "ar_2210…4e19",
    verifiedAt: ago(days(6)),
    disclosures: [
      {
        id: "au-874-f1",
        fact: "fill-amount",
        label: "Fill amount",
        state: "sealed",
      },
      {
        id: "au-874-f2",
        fact: "policy-compliance",
        label: "Policy compliance",
        state: "sealed",
      },
      {
        id: "au-874-f3",
        fact: "counterparty-class",
        label: "Counterparty class",
        state: "sealed",
      },
      {
        id: "au-874-f4",
        fact: "execution-timestamp",
        label: "Execution timestamp",
        state: "sealed",
      },
    ],
  },
  {
    id: "au-870",
    executionRef: "EX-4468",
    asset: "USDC.n",
    counterpartyClass: "Tier-1 OTC",
    proofStatus: "verified",
    auditRoot: "ar_7712…03bd",
    verifiedAt: ago(hours(3)),
    disclosures: [
      {
        id: "au-870-f1",
        fact: "fill-amount",
        label: "Fill amount",
        state: "sealed",
      },
      {
        id: "au-870-f2",
        fact: "policy-compliance",
        label: "Policy compliance",
        state: "sealed",
      },
      {
        id: "au-870-f3",
        fact: "counterparty-class",
        label: "Counterparty class",
        state: "sealed",
      },
      {
        id: "au-870-f4",
        fact: "execution-timestamp",
        label: "Execution timestamp",
        state: "sealed",
      },
    ],
  },
];

/* ── activity ─────────────────────────────────────────────────────── */

export const ACTIVITY: ActivityItem[] = [
  {
    id: "ac-01",
    at: ago(minutes(9)),
    kind: "offer",
    label: "Private offer received",
    detail: "OF-9202 · USDC.n · Northline Capital",
    privateToWorkspace: true,
  },
  {
    id: "ac-02",
    at: ago(minutes(11)),
    kind: "settlement",
    label: "Settlement completed",
    detail: "EX-4471 · receipt RCP-2261 issued",
    privateToWorkspace: true,
  },
  {
    id: "ac-03",
    at: ago(minutes(12)),
    kind: "proof",
    label: "Proof verified",
    detail: "Mandate compliance proven without disclosure",
    privateToWorkspace: false,
  },
  {
    id: "ac-04",
    at: ago(hours(3)),
    kind: "proof",
    label: "Attempt refused before settlement",
    detail: "EX-4468 · per-fill cap exceeded",
    privateToWorkspace: false,
  },
  {
    id: "ac-05",
    at: ago(days(2)),
    kind: "mandate",
    label: "Mandate sealed",
    detail: "MD-2867 · rules visible only to you",
    privateToWorkspace: true,
  },
  {
    id: "ac-06",
    at: ago(days(2)),
    kind: "audit",
    label: "Disclosure granted",
    detail: "Policy compliance revealed for EX-4471",
    privateToWorkspace: true,
  },
  {
    id: "ac-07",
    at: ago(days(19)),
    kind: "mandate",
    label: "Mandate sealed",
    detail: "MD-2796 · tokenized gold program",
    privateToWorkspace: true,
  },
  {
    id: "ac-08",
    at: ago(days(34)),
    kind: "mandate",
    label: "Executor authorized",
    detail: "Corvus Execution Engine bound to MD-2841",
    privateToWorkspace: true,
  },
];

/* ── principal identity ───────────────────────────────────────────── */

/** Landing-copy placeholder only. Workspace profile uses the connected wallet address. */
export const PRINCIPAL = {
  name: "",
  deskName: "",
  auditorName: "",
};
