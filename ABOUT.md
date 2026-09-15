# REMIT

**Private execution where an agent can choose, but cannot exceed the mandate.**

Private mandate + private liquidity + constrained executor + ZK policy enforcement = verifiable execution.

REMIT is a mandate-bound dark RFQ desk on Midnight. A principal seals trading rules the market never sees. Counterparties quote privately. A constrained executor may rank eligible offers. Compact proves the fill obeyed the mandate before value moves. Selective audit can later open one authorized fact without opening the book.

Wave 1 is live on Midnight Preprod. Wave 2 hardens the same protocol. Wave 3 targets Mainnet after an explicit capability gate. Explorer hashes are the settlement record. Judges can verify without a wallet via the hosted UI and public API.

## The problem

Delegated execution leaks strategy. Limit price, size, remaining budget, expiry, and admitted counterparties become signals the market can trade against. Trusting an agent does not create a proof. REMIT inverts that: the agent is free inside a boundary, and Compact, not goodwill, defines where it stops.

## The mechanism

1. **Mandate.** Asset, side, per-fill cap, limit price, remaining budget, counterparty root, executor key, expiry. Sealed. Public state stores commitments and nullifiers, not openings.
2. **Private liquidity.** Offers arrive as encrypted RFQ boxes (RMTB1). The public ledger never lists prices or identities.
3. **Constrained executor.** The agent ranks a K=3 private candidate set with Compact-identical helpers. It cannot authorize settlement. Model output is never settlement authority.
4. **ZK policy.** `fill` proves eligibility, unique best-among-K, residual insert, payouts, and `auditRoot`. `chosenIndex`, prices, and sizes stay private.
5. **Custody.** Native unshielded tNIGHT plus REMIT-Q, a testnet-only contract-minted quote token. REMIT-Q is not a stablecoin.
6. **Partial / residual.** A 50-of-80 fill committed a leftover opening. That leftover was consumed on-chain. Spent openings are Compact-rejected.
7. **Selective audit.** One-field `baseAmount` verified against `auditRoots`. A forged value is rejected. Unauthorized fields stay sealed.

MBBE proves the best eligible candidate among the K=3 private openings supplied to the executor. That bounded witness-set relation is deliberate. Matching is not MPC.

## Why privacy is the product

Without private mandates, delegated execution is a leak. Midnight's dual ledger lets Compact enforce policy on witnesses the chain never stores in plaintext. Public counters (`fills`, `activeMandates`, `openOffers`, `auditRoots`) verify integrity without publishing the book.

## Wave 1 evidence (Preprod, protocolVersion 1000000)

Stack pin: Compact 0.31.1 / language 0.23 / midnight-js 4.1.1 / wallet-sdk 1.2.0 / connector 4.0.1 / proof-server 8.1.0 / indexer 4.3.3-hotfix / ledger 8.

| Artifact | Address / tx | Block |
|---|---|---|
| Quote REMIT-Q | `7559e386…` / `04800c4c…` | 2538374 |
| MBBE pool | `01bebd52…` / `55224e41…` | 2541620 |
| K=3 live fill | `12306cbe…` | 2542039 |
| RFQ fill 50/80 | `5a1200f5…` | 2549944 |
| Residual 30 | `5f1203cf…` | 2550168 |
| Withdraw | `999e2b5b…` | 2550510 |
| Chrome createMandate | `5172ab71…` | 2551299 |
| Chrome revokeMandate | `8ae27d7a…` | 2551669 |

`auditRoot` `1bbc1cc2…`. UI: https://remit-front.vercel.app. API: https://remit-api-node.onrender.com. Persistence: Postgres ciphertext envelopes, RLS deny-all, no service role in the browser. Wallet reconnect uses connector `connect(networkId)` plus hashed tab vaults. Seven impure circuits. Local tests: 48 files / 200 passed. `npm run judge:proof` reprints committed hashes with explorer URLs.

In-browser Compact circuits (1AM `getProvingProvider`): createMandate, revokeMandate, deposit, withdraw. Executor `fill` proving stays on operator-controlled proof infrastructure so private witnesses are not sent to a third-party hosted prover. Compact remains the settlement authority.

## Wave 2

Stronger best-compliant relations inside K, unlinkable discovery, multi-field purpose-bound audit, residual lifecycle, institutional policy templates, sandbox `judge:proof`, persistence drills, threat-model updates. Compact remains authoritative. See PLAN.md.

## Wave 3 / Mainnet

Wave 3 targets a real Mainnet deployment after an experimental compatibility gate: ledger, Compact, midnight-js, wallet SDK, connector, proof-server, indexer, DUST, proving keys, custody assets, and browser wallets. Production custody must separate testnet quote from Mainnet assets. Nothing ships to Mainnet on untested versions. Public observability will show solvency and receipts, never the private book.

## How to verify

Path A, no wallet: open https://remit-front.vercel.app and GET https://remit-api-node.onrender.com/health plus `/evidence` plus `/chain`. Expect `network=preprod`, `mpc=false`, public hashes only.

Path B, local: Node 22, `npm install`, `npm run compile:skip-zk`, `npm test`, `npm run judge:proof`. Compact 0.31.1 on WSL for full zk. Proof-server: `npm run proof:up` (Docker 8.1.0 on :6300).

Path C, Chrome Preprod: connect 1AM, seal a mandate, confirm indexer `activeMandates`, revoke in the same tab namespace. Lace uses local proof-server 8.1.0.

## Stack

Node 22. Compact `remit_pool.compact` (deposit, withdraw, placeOffer, cancelOffer, createMandate, revokeMandate, fill) and `remit_quote.compact`. Fastify API. Next.js workspace. Apache-2.0. The agent is constrained execution infrastructure: it may rank, it may not settle. Full architecture, diagrams, explorer links, and the judge demo script: README.md. Roadmap: PLAN.md.
