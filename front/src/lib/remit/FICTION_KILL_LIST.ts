/**
 * Production-path fiction + overflow inventory (AGENT 3, product/frontend).
 * TypeScript so this is not markdown. Do not restyle from this list this shift.
 *
 * MASTER_EXECUTION_PLAN.md §33 (Chrome audit 2026-09-14) — captured, not fixed:
 *   1440×900  Overview overflow was 186px; badge wrap; right column not 769px rigid.
 *   1366×768  overflow was 260px.
 *   1280×800  overflow was 348px.
 *   1024×768  Overview overflow was 602px; Settings 230px; sidebar may appear at lg.
 *   768×1024  Navigation must work: non-zero-width buttons, hamburger → NavList,
 *             Overview/Mandates/Offers/Executions/Audit/Settings reachable.
 *   390       Settings address truncated; wallet chip no DUST; no page x-scroll; 44px targets.
 * Mandates/Offers/Executions/Audit did not overflow at 1440–1024 — do not restyle them into overflow.
 *
 * Visual/layout work waits on the K=3 Compact compile probe. Wallet connect not touched.
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
    file: "front/src/components/remit/landing/landing-hero.tsx:13",
    issue: "STATS private notional 2_400_000_000 ($2.4B). Fake TVL. Do not invent a replacement this shift.",
    status: "deferred-visual",
  },
  {
    id: "landing-proof-count-31918",
    file: "front/src/components/remit/landing/landing-hero.tsx:14",
    issue: "STATS 31,918 policy proofs verified. Fake proof count. Use indexer fills/openOffers/activeMandates later.",
    status: "deferred-visual",
  },
  {
    id: "landing-md-2901",
    file: "front/src/components/remit/landing/section-enforcement.tsx:38",
    issue: "Landing enforcement copy MD-2901 as if live (also :120).",
    status: "deferred-visual",
  },
  {
    id: "landing-usdc-n",
    file: "front/src/components/remit/landing/section-enforcement.tsx:127",
    issue: "Landing mandate plate Asset USDC.n · USD Coin.",
    status: "deferred-visual",
  },
  {
    id: "landing-corvus",
    file: "front/src/components/remit/landing/section-enforcement.tsx:132",
    issue: "Landing executor Corvus Execution Engine (also :161).",
    status: "deferred-visual",
  },
  {
    id: "landing-hero-flow-md-2901",
    file: "front/src/components/remit/landing/hero-flow.tsx:96",
    issue: "Hero flow diagram labels MD-2901 as the sealed mandate.",
    status: "deferred-visual",
  },
  {
    id: "catalog-usdc-n",
    file: "front/src/lib/remit/catalog.ts:62",
    issue: "Catalog ASSETS includes USDC.n. Lookups used by live views; arrays not fed to getRemitProvider.",
    status: "isolated",
  },
  {
    id: "catalog-corvus",
    file: "front/src/lib/remit/catalog.ts:189",
    issue: "Catalog EXECUTORS Corvus Execution Engine. Live executorId ex-remit falls back to Constrained broker.",
    status: "isolated",
  },
  {
    id: "catalog-md-2841",
    file: "front/src/lib/remit/catalog.ts:220",
    issue: "Catalog MANDATES / OFFERS / EXECUTIONS / AUDIT_RECORDS / ACTIVITY fixtures (MD-2841, USDC.n, fake audit roots). Not imported by live provider.",
    status: "isolated",
  },
  {
    id: "catalog-hardcoded-scores",
    file: "front/src/lib/remit/catalog.ts:326",
    issue: "Catalog offer executionScore/compatibility 92/96 etc. Isolated from getRemitProvider.",
    status: "isolated",
  },
  {
    id: "mapper-hardcoded-40-60-32",
    file: "front/src/lib/remit/public-client.ts:247",
    issue: "Evidence rail still invents attemptedFill 40/60 and price 32 as if openings. Kept as remaining mapper fiction (not a $0 map).",
    status: "open",
  },
  {
    id: "mapper-execution-scores",
    file: "front/src/lib/remit/public-client.ts:359",
    issue: "Offers mapped compatibility/executionScore 0 or 100 from friction length, not /agent/rank.",
    status: "open",
  },
  {
    id: "mapper-verification-rate",
    file: "front/src/lib/remit/public-client.ts:383",
    issue: "verificationRate 100 or 0 from fills>0, not a measured proof rate. settledNotional is fills counter (real) with a USD-ish name.",
    status: "open",
  },
  {
    id: "auditroot-is-txhash",
    file: "front/src/lib/remit/live-provider.ts:163",
    issue: "getAudit sets auditRoot to fill.txHash. Must be on-chain auditRoots head; tx is tx. revealFact still throws honestly.",
    status: "open",
  },
  {
    id: "audit-simulated-verified",
    file: "front/src/lib/remit/live-provider.ts:162",
    issue: "Audit record proofStatus verified whenever a settled fill and selective-audit activity exist, without verifyDisclosure.",
    status: "open",
  },
  {
    id: "role-switcher-not-authz",
    file: "front/src/components/remit/app/app-shell.tsx:57",
    issue: "Role switcher is a demo lens (setRole), not wallet/capability authz. Plan: label Demo lens. Not restyled this shift.",
    status: "open",
  },
  {
    id: "overview-corvus-banner",
    file: "front/src/components/remit/app/view-overview.tsx:486",
    issue: "ExecutorBanner hardcodes Corvus Execution Engine.",
    status: "open",
  },
  {
    id: "overview-rules-visible-only-to-you",
    file: "front/src/components/remit/app/view-overview.tsx:601",
    issue: "Badge Rules visible only to you is false for the executor. Copy fix later, not a restyle this shift.",
    status: "open",
  },
  {
    id: "executions-fallback-40-50-60",
    file: "front/src/components/remit/app/view-executions.tsx:248",
    issue: "EnforcementShowcase uses attempted||60, formatUsd(50), settled||40 when mapper amounts missing.",
    status: "open",
  },
  {
    id: "create-mandate-input-zeros",
    file: "front/src/components/remit/app/view-mandates.tsx:96",
    issue: "Seal form posts maxFill 50, limitPrice 0, totalBudget 0 as circuit input (not display $0). Left untouched (not mapper fiction).",
    status: "open",
  },
  {
    id: "settings-local-switches",
    file: "front/src/components/remit/app/view-settings.tsx:78",
    issue: "Privacy/notification switches are local React state, not chain. Toast pretends saved to this workspace.",
    status: "open",
  },
  {
    id: "catalog-lookups-on-live-views",
    file: "front/src/components/remit/app/view-overview.tsx:40",
    issue: "Live views still call assetBySymbol/executorById/counterpartyById. Unknown ids are honest fallbacks; USDC.n remains in ASSETS.",
    status: "open",
  },
];

export const OVERFLOW_NAV: FictionKillItem[] = [
  {
    id: "ov-1440-overview-grid",
    file: "front/src/components/remit/app/view-overview.tsx:647",
    issue: "§33 1440×900: Overview overflow 186px. Still lg:grid-cols-[1.4fr_1fr] (also skeleton :542) which rigidifies the right column (~769px offender). Badge wrap not applied.",
    status: "deferred-visual",
  },
  {
    id: "ov-1366",
    file: "front/src/components/remit/app/view-overview.tsx:647",
    issue: "§33 1366×768: overflow was 260px. Same Overview grid / min-w-0 gap. Do not restyle this shift.",
    status: "deferred-visual",
  },
  {
    id: "ov-1280",
    file: "front/src/components/remit/app/view-overview.tsx:647",
    issue: "§33 1280×800: overflow was 348px. Same offender.",
    status: "deferred-visual",
  },
  {
    id: "ov-1024-overview",
    file: "front/src/components/remit/app/view-overview.tsx:647",
    issue: "§33 1024×768: Overview overflow was 602px. Sidebar appears (lg:flex) but Overview grid still overflows without min-w-0 on hash/flex children.",
    status: "deferred-visual",
  },
  {
    id: "ov-1024-settings",
    file: "front/src/components/remit/app/view-settings.tsx:130",
    issue: "§33 1024×768: Settings overflow was 230px. Profile title is full wallet.address in font-display, not shortAddress. Data row at :174 already break-all.",
    status: "deferred-visual",
  },
  {
    id: "nav-768",
    file: "front/src/components/remit/app/app-shell.tsx:177",
    issue: "§33 768×1024: Navigation must work. Sidebar hidden until lg (1024). Hamburger is lg:hidden :217. Chrome audit: zero-width nav buttons / unreachable views. NavList buttons have no min 44px width (:110). RoleSwitcher hidden below sm (:257).",
    status: "deferred-visual",
  },
  {
    id: "nav-390-settings-wallet",
    file: "front/src/components/remit/app/view-settings.tsx:130",
    issue: "§33 390: Settings address not truncated in profile title. Wallet chip still h-9 with DUST in header (wallet-button.tsx:162–177). Not edited — wallet connect out of scope.",
    status: "deferred-visual",
  },
  {
    id: "nav-audit-full-hash",
    file: "front/src/components/remit/app/view-overview.tsx:443",
    issue: "§32/§33: Audit tiles concatenate asset · full auditRoot (and live-provider uses tx hash as auditRoot). Truncate+copy later; no CSS this shift.",
    status: "deferred-visual",
  },
];
