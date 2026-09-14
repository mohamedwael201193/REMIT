/**
 * Production-path fiction + overflow inventory (AGENT 3, product/frontend).
 *
 * Status reflects this shift's kills. Isolated arrays in catalog.ts remain
 * for non-live copy and must not be imported by live-provider.
 */

export type FictionKillStatus =
  | "killed-this-shift"
  | "open"
  | "isolated"
  | "deferred-visual";

export type FictionKillItem = {
  id: string;
  file: string;
  issue: string;
  status: FictionKillStatus;
};

export const FICTIONS: FictionKillItem[] = [
  {
    id: "ignore-build-errors",
    file: "front/next.config.ts",
    issue: "Removed typescript.ignoreBuildErrors. Typecheck excludes unused examples/prisma/db and unused shadcn offenders.",
    status: "killed-this-shift",
  },
  {
    id: "hello-world-api",
    file: "front/src/app/api/route.ts:1",
    issue: "Next GET /api returned Hello, world!; unused. File deleted this shift.",
    status: "killed-this-shift",
  },
  {
    id: "mapper-mandate-zeros",
    file: "front/src/lib/remit/public-client.ts:321",
    issue: "Public mapper used maxFill/limitPrice/totalBudget/spent 0 (UI printed $0). Now null + amountPrivacy sealed.",
    status: "killed-this-shift",
  },
  {
    id: "mapper-offer-zeros",
    file: "front/src/lib/remit/public-client.ts:355",
    issue: "Public mapper used offer price/size 0. Now null + amountPrivacy sealed.",
    status: "killed-this-shift",
  },
  {
    id: "mapper-portfolio-zeros",
    file: "front/src/lib/remit/public-client.ts:378",
    issue: "Public mapper used totalBudget/committedBudget 0 (Remaining budget CountUp $0). Now null + sealed/Not disclosed. No fake TVL invented.",
    status: "killed-this-shift",
  },
  {
    id: "mapper-price-violation-zero",
    file: "front/src/lib/remit/public-client.ts:296",
    issue: "PRICE evidence mapped price: 0. Now null (sealed), not $0.",
    status: "killed-this-shift",
  },
  {
    id: "sdk-mapper-zeros",
    file: "packages/sdk/src/public.ts:327",
    issue: "Canonical mapPublicWorkspace kept in sync: private amounts null + amountPrivacy sealed only.",
    status: "killed-this-shift",
  },
  {
    id: "empty-provider-budget-zero",
    file: "front/src/lib/remit/local-provider.ts:35",
    issue: "HonestEmptyProvider portfolio totalBudget/committedBudget were 0. Now null/sealed.",
    status: "killed-this-shift",
  },
  {
    id: "landing-tvl-2-4b",
    file: "front/src/components/remit/landing/landing-hero.tsx:11",
    issue: "STATS private notional 2_400_000_000 ($2.4B) replaced with qualitative FACTS. Do not invent TVL.",
    status: "killed-this-shift",
  },
  {
    id: "landing-proof-count-31918",
    file: "front/src/components/remit/landing/landing-hero.tsx:11",
    issue: "STATS 31,918 policy proofs replaced with qualitative FACTS.",
    status: "killed-this-shift",
  },
  {
    id: "landing-md-2901",
    file: "front/src/components/remit/landing/section-enforcement.tsx:38",
    issue: "Landing enforcement still uses a $10k illustration cap (teaching widget, not live lookup).",
    status: "deferred-visual",
  },
  {
    id: "landing-usdc-n",
    file: "front/src/components/remit/landing/section-enforcement.tsx",
    issue: "Landing illustration no longer claims USDC.n; teaching cap $10k remains.",
    status: "killed-this-shift",
  },
  {
    id: "landing-corvus",
    file: "front/src/components/remit/landing/section-enforcement.tsx",
    issue: "Landing executor Corvus copy removed prior shift.",
    status: "killed-this-shift",
  },
  {
    id: "landing-hero-flow-md-2901",
    file: "front/src/components/remit/landing/hero-flow.tsx:96",
    issue: "Hero flow now says Sealed mandate — no MD-2901.",
    status: "killed-this-shift",
  },
  {
    id: "catalog-usdc-n",
    file: "front/src/lib/remit/catalog.ts",
    issue: "Deleted USDC.n / wBTC.n / wETH.n / XAU.n / TGF-NAV / MMLF. LIVE_ASSETS is tNIGHT, REMIT-Q, DUST only.",
    status: "killed-this-shift",
  },
  {
    id: "catalog-corvus",
    file: "front/src/lib/remit/catalog.ts",
    issue: "Deleted EXECUTORS Corvus/Halcyon/Ledgerline arrays. executorById still maps ex-remit → Constrained broker.",
    status: "killed-this-shift",
  },
  {
    id: "catalog-md-2841",
    file: "front/src/lib/remit/catalog.ts",
    issue: "Deleted MANDATES / OFFERS / EXECUTIONS / AUDIT_RECORDS / ACTIVITY / COUNTERPARTIES / PRINCIPAL fixtures.",
    status: "killed-this-shift",
  },
  {
    id: "catalog-hardcoded-scores",
    file: "front/src/lib/remit/catalog.ts",
    issue: "Deleted catalog executionScore/compatibility fixtures. Offer cards never render a score bar.",
    status: "killed-this-shift",
  },
  {
    id: "mapper-hardcoded-40-60-32",
    file: "front/src/lib/remit/public-client.ts:247",
    issue: "Evidence rail attemptedFill/price now null (sealed). No 40/60/32 openings invented.",
    status: "killed-this-shift",
  },
  {
    id: "mapper-execution-scores",
    file: "front/src/lib/remit/public-client.ts:359",
    issue: "Offers map compatibility/executionScore null. Agent blotter does not invent AI confidence.",
    status: "killed-this-shift",
  },
  {
    id: "mapper-verification-rate",
    file: "front/src/lib/remit/public-client.ts:383",
    issue: "verificationRate null. Overview KPI is indexer fills, not a fake proof rate.",
    status: "killed-this-shift",
  },
  {
    id: "auditroot-is-txhash",
    file: "front/src/lib/remit/live-provider.ts:163",
    issue: "getAudit auditRoot is empty (not txHash). UI chips 'auditRoot not opened'. revealFact still throws honestly.",
    status: "killed-this-shift",
  },
  {
    id: "audit-simulated-verified",
    file: "front/src/lib/remit/live-provider.ts:162",
    issue: "Audit record proofStatus pending. No simulated verified without verifyDisclosure.",
    status: "killed-this-shift",
  },
  {
    id: "role-switcher-not-authz",
    file: "front/src/components/remit/app/app-shell.tsx:57",
    issue: "Role switcher labeled Demo lens · not authorization. Maker added as a fourth lens.",
    status: "killed-this-shift",
  },
  {
    id: "overview-corvus-banner",
    file: "front/src/components/remit/app/view-overview.tsx",
    issue: "ExecutorBanner is Constrained executor. MakerBanner copy: never see the principal's mandate.",
    status: "killed-this-shift",
  },
  {
    id: "overview-rules-visible-only-to-you",
    file: "front/src/components/remit/app/view-overview.tsx",
    issue: "Badge is role-honest (principal/maker/executor/auditor). Paper copy: openings not on the public ledger.",
    status: "killed-this-shift",
  },
  {
    id: "executions-fallback-40-50-60",
    file: "front/src/components/remit/app/view-executions.tsx",
    issue: "EnforcementShowcase uses formatUsd(null)/sealed amounts. Agent blotter fetches public GET /agent/status (rank, httpSubmit, k, globalBest) without inventing AI confidence.",
    status: "killed-this-shift",
  },
  {
    id: "create-mandate-input-zeros",
    file: "front/src/components/remit/app/view-mandates.tsx",
    issue: "Seal form is WHO/WHAT/HOW MUCH/PRICE/WHOM/UNTIL then SEAL. Circuit units (default 50/0) are principal-entered, not displayed as $0 TVL. totalBudget still 0 as circuit input.",
    status: "open",
  },
  {
    id: "settings-local-switches",
    file: "front/src/components/remit/app/view-settings.tsx:78",
    issue: "Privacy/notification switches are local React state. Toast now says saved in this browser only — not on-chain.",
    status: "open",
  },
  {
    id: "catalog-lookups-on-live-views",
    file: "front/src/lib/remit/catalog.ts:103",
    issue: "assetBySymbol uses LIVE_ASSETS. counterpartyById/executorById never invent Northline/Corvus desks.",
    status: "killed-this-shift",
  },
  {
    id: "overview-story-rail",
    file: "front/src/components/remit/app/view-overview.tsx",
    issue: "Overview desk story is PRIVATE LIQUIDITY → AGENT DECISION → PROOF → SETTLEMENT from indexer openOffers, GET /agent/status last counts, and settled fills. No fake TVL or proof counts.",
    status: "killed-this-shift",
  },
  {
    id: "audit-four-states",
    file: "front/src/components/remit/app/view-audit.tsx",
    issue: "Auditor desk distinguishes SEALED / REQUESTED / REVEALED / VERIFIED. Tx hash is never auditRoot. Verified only after verifyDisclosure.",
    status: "killed-this-shift",
  },
  {
    id: "landing-fake-receipts",
    file: "front/src/components/remit/landing/hero-flow.tsx",
    issue: "Removed RCP-2262 / OF-9231 / infinite pulse. Illustration copy only.",
    status: "killed-this-shift",
  },
  {
    id: "landing-audit-180k",
    file: "front/src/components/remit/landing/section-audit.tsx",
    issue: "Removed $180,000 / EX-4471 / fake audit root / Tier-1 OTC. Illustration stays SEALED.",
    status: "killed-this-shift",
  },
];

export const OVERFLOW_NAV: FictionKillItem[] = [
  {
    id: "ov-1440-overview-grid",
    file: "front/src/components/remit/app/view-overview.tsx",
    issue: "Overview is lg:grid-cols-2 with min-w-0 children, wrapping privacy pill, HashChip on hashes. Chrome matrix not re-measured this agent.",
    status: "killed-this-shift",
  },
  {
    id: "ov-1366",
    file: "front/src/components/remit/app/view-overview.tsx",
    issue: "Same Overview grid / min-w-0 / hash chips.",
    status: "killed-this-shift",
  },
  {
    id: "ov-1280",
    file: "front/src/components/remit/app/view-overview.tsx",
    issue: "Same Overview grid / min-w-0 / hash chips.",
    status: "killed-this-shift",
  },
  {
    id: "ov-1024-overview",
    file: "front/src/components/remit/app/view-overview.tsx",
    issue: "min-w-0 on flex children; hashes truncated+copy; no overflow-x:hidden page fix.",
    status: "killed-this-shift",
  },
  {
    id: "ov-1024-settings",
    file: "front/src/components/remit/app/view-settings.tsx",
    issue: "Profile title shortAddress; wallet HashChip; preference rows wrap on narrow; revoke button stacks. Chrome matrix not re-measured this agent.",
    status: "killed-this-shift",
  },
  {
    id: "nav-768",
    file: "front/src/components/remit/app/app-shell.tsx",
    issue: "Sidebar hidden until lg. Hamburger h-11 + Sheet NavList min-h-11. Demo lens in drawer.",
    status: "killed-this-shift",
  },
  {
    id: "nav-390-settings-wallet",
    file: "front/src/components/remit/wallet/wallet-button.tsx",
    issue: "Wallet chip min-h-11, truncates address, DUST only at lg (also in menu). Header cluster wraps — not max-width compressed. HashChip copy is min-h-11.",
    status: "killed-this-shift",
  },
  {
    id: "nav-audit-full-hash",
    file: "front/src/components/remit/primitives.tsx",
    issue: "HashChip used on Overview audit tiles, activity lines, Agent blotter, Audit cards, Settings address.",
    status: "killed-this-shift",
  },
];
