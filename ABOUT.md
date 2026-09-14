# REMIT

**Private mandate + private liquidity + constrained executor + ZK policy enforcement = verifiable execution.**

REMIT is a mandate-bound dark RFQ desk on Midnight. A principal seals trading rules the market never sees. Counterparties quote privately. A constrained executor may choose among eligible offers. Compact proves the fill obeyed the mandate before value moves. Selective audit can later open one authorized fact without opening the book.

This is Wave 1 of a three-wave product: Preprod protocol live today, Wave 2 hardening, Wave 3 Mainnet under a formal capability gate. Judges should treat explorer hashes as the settlement record.

## The problem

Delegated execution leaks the strategy. Limit price, size, budget, expiry, and admitted counterparties become signals the market can trade against. Trusting an agent or broker does not create a proof. REMIT inverts that: the agent is free inside a boundary, and cryptography, not goodwill, defines where it stops.

## The mechanism

1. **Mandate.** Asset, side, per-fill cap, limit price, remaining budget, counterparty root, executor key, expiry. Sealed. Public state stores commitments and nullifiers, not openings.
2. **Private liquidity.** Offers arrive as encrypted RFQ boxes (RMTB1). The public ledger never lists prices or identities.
3. **Constrained executor.** The agent ranks a K=3 private book with Compact-identical helpers. It cannot authorize settlement. LLM output is never settlement authority.
4. **ZK policy.** `fill` proves eligibility, unique best-among-K, residual insert, payouts, and `auditRoot`. `chosenIndex`, prices, and sizes are not public.
5. **Custody.** Native unshielded tNIGHT plus REMIT-Q, a testnet-only contract-minted quote token. REMIT-Q is not a stablecoin.
6. **Partial / residual.** A 50-of-80 fill committed a leftover opening. The leftover was consumed on-chain. Replays of spent openings are Compact-rejected.
7. **Selective audit.** One-field `baseAmount` verified against `auditRoots`. A forged value is rejected. Unauthorized fields stay sealed.

MBBE means: best eligible candidate among the K private slots in that witness. It is not global-book best execution. Matching is not MPC.

## Why privacy is central

Without private mandates, delegated execution is a leak. Midnight's dual ledger lets Compact enforce policy on witnesses the chain never stores in plaintext. Public counters (`fills`, `activeMandates`, `openOffers`, `auditRoots`) are enough to verify integrity without publishing the book.

## Wave 1 evidence (Preprod, protocolVersion 1000000)

Stack pin: Compact 0.31.1 / language 0.23 / midnight-js 4.1.1 / wallet-sdk 1.2.0 / connector 4.0.1 / proof-server 8.1.0 / indexer 4.3.3-hotfix / ledger 8. Do not bump.

| Artifact | Address / tx | Block |
|---|---|---|
| Quote REMIT-Q | `7559e386…` / `04800c4c…` | 2538374 |
| MBBE pool | `01bebd52…` / `55224e41…` | 2541620 |
| K=3 live fill | `12306cbe…` | 2542039 |
| RFQ fill 50/80 | `5a1200f5…` | 2549944 |
| Residual 30 | `5f1203cf…` | 2550168 |
| Operator withdraw | `999e2b5b…` | 2550510 |
| Chrome createMandate | `5172ab71…` | 2551299 |
| Chrome revokeMandate | `8ae27d7a…` | 2551669 |

`auditRoot` `1bbc1cc2…`. Hosted UI: https://remit-front.vercel.app. API: https://remit-api-node.onrender.com (`httpSubmit: false` by design). Persistence: Postgres ciphertext envelopes, RLS deny-all, no service role in the browser. Wallet reconnect uses connector `connect(networkId)` plus hashed tab vaults. Seven impure circuits. Local tests: 46 files.

Chrome leftover withdraw is not claimed: deposit `cdb04c15…` block 2551700 succeeded; the subsequent withdraw from that tab was not explorer-gated.

## Wave 2

Stronger best-compliant relations inside K, unlinkable discovery, multi-field purpose-bound audit, residual lifecycle, institutional policy templates, sandbox `judge:proof`, persistence drills, threat-model updates. Compact remains authoritative. See PLAN.md.

## Wave 3 / Mainnet

Wave 3 targets a real Mainnet deployment after an experimental compatibility gate: ledger, Compact 0.31.x vs later toolchains, midnight-js, wallet SDK, connector, proof-server, indexer, DUST, proving keys, and browser wallets. Production custody must separate testnet quote from Mainnet assets. Nothing ships to Mainnet on untested versions. Public observability will show solvency and receipts, never the private book.

## How to verify

Path A, no wallet: open https://remit-front.vercel.app and GET https://remit-api-node.onrender.com/health plus `/evidence` plus `/chain`. Expect `network=preprod`, `mpc=false`, `httpSubmit=false`, public hashes only.

Path B, local: Node 22, `npm install`, `npm run compile:skip-zk`, `npm test`, `npm run judge:proof`. Compact 0.31.1 on WSL for full zk. Proof-server: `npm run proof:up` (Docker image 8.1.0 on :6300). Do not share :6300 with a Preprod operator session.

Path C, Chrome Preprod: connect 1AM, seal a mandate, confirm indexer `activeMandates`, revoke in the same tab namespace. Header DUST is not spendable coins. Lace needs local proof-server 8.1.0.

## Stack

Node 22. Compact `remit_pool.compact` (seven impure circuits: deposit, withdraw, placeOffer, cancelOffer, createMandate, revokeMandate, fill) and `remit_quote.compact`. Fastify API. Next.js workspace. 1AM in-tab proving via `getProvingProvider`. Lace via local proof-server 8.1.0. Apache-2.0. The agent is constrained execution infrastructure: it may rank, it may not settle. LLM output is never settlement authority. Full architecture, diagrams, and explorer links: README.md. Roadmap: PLAN.md.
