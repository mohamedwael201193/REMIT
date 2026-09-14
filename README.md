# REMIT

**A dark pool where the trader's rules are as private as the trade — and just as enforced.**

A principal gives an executor a private mandate. The chain proves every fill obeyed a mandate it never saw. Settlement uses **tNIGHT** (native unshielded) plus **REMIT-Q**, a contract-minted **testnet-only** quote token. REMIT-Q is **not a stablecoin** — Preprod has no official usable stablecoin.

Status: Wave 1 live on Preprod. 1AM in-tab `createMandate` is indexer-confirmed (`activeMandates = 1`). Operator DUST/deploy uses one WalletFacade plus a gitignored `serializeState` cache (`availableCoins >= 1`). The supplied `front/` tree is the product UI — it is wired to the public API, indexer evidence, and DApp connector v4 (1AM / Lace). 1AM proves in-tab via `getProvingProvider`; Lace uses local proof-server 8.1.0. Do not treat connector/header DUST as spendable.

Local iteration uses official `midnight-local-dev` (`npm run local:up` prints the clone command; `npm run local:health` probes :9944/:8088/:6300). Do not start that stack while Preprod deploy holds proof-server `:6300`.

## Stack pin (Preprod)

Compact **0.31.1** / language 0.23 · midnight-js **4.1.1** · wallet-sdk **1.2.0** · connector **4.0.1** · proof-server **8.1.0** · ledger **8**

## Contracts

- `CONTRACT/src/remit_pool.compact` — 7 circuits: deposit, withdraw, placeOffer, cancelOffer, createMandate, revokeMandate, fill
- `CONTRACT/src/remit_quote.compact` — REMIT-Q faucet (`claim`, `quoteColor`)

## Quickstart

```bash
npm install
npm run compile:skip-zk
npm test
npm run proof:up          # Docker proof-server :6300
npm run api               # Fastify :8787
```

Compact compile runs in WSL Ubuntu on Windows (`compact compile --version` must be 0.31.1).

Backend image is the repo-root `Dockerfile` (Render looks for `./Dockerfile`).

Public API (Preprod health/stats only; no private state): https://remit-api-node.onrender.com/health

Hosted UI: https://remit-front.vercel.app — no-wallet workspace reads indexer-backed `/evidence`. 1AM proves createMandate/revoke in-tab; Lace needs proof-server 8.1.0 at `http://localhost:6300`.

Secrets live only in `.env.preprod.local` (gitignored). Copy `.env.example`. Never put secrets in `VITE_*`.

## Judge path (live Preprod)

1. Open https://remit-front.vercel.app — Overview should show live mandate/fill/reject evidence without connecting a wallet.
2. GET https://remit-api-node.onrender.com/health — `network=preprod`, `mpc=false`, `dustGate=availableCoins>=1`, pool+quote addresses set, `circuit=true` after the API build.
3. GET https://remit-api-node.onrender.com/evidence — public tx hashes only. Explorer: `https://preprod.midnightexplorer.com/tx/<hash>`.
4. Compact: `CONTRACT/src/remit_pool.compact` and `remit_quote.compact` compile on **0.31.1**. `npm test` is the QA gate.
5. Connect **1AM** (connector v4, Preprod) and **Seal a mandate**. GET `/chain` must show `activeMandates >= 1`. Header DUST is **not** spendable coins. Lace needs proof-server 8.1.0 at `http://localhost:6300`.

Live contracts (Preprod, ledger 8):

| artifact | address | tx | block |
|---|---|---|---|
| quote REMIT-Q (reused) | `7559e38693725dafef73486f2ee3aa30ee0b5b543e22d0aa5ad7303c37b55e3f` | `04800c4ca43dd572d77ca1e5cf604702c609ff091ecb567f942ff15e17c08008` | 2538374 |
| pool **v1** (historical single-offer fill) | `e82dea02b2397332df0bb10e2df6d9e257c8ceba696415ed3c10f639f68d43d4` | `f8b9b32446234af794a6d9fe33c27cd12e0815593c8e18816caa4b549418ba2c` | 2538382 |
| pool **MBBE K=3** (new immutable address) | `01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e` | `55224e41e1b68f5cc65286f19e7269b199563158806fc5ae03fe9f536c61798a` | 2541620 |
| MBBE K=3 fill (padded book, not global-book) | | `8fac31ab4a7b76e91f8da95d8bfd0099f0a754daa4641d571dcdd45b59b92e55` | 2541757 |
| 1AM createMandate (v1 pool, Chrome) | | `e860c49a915837f17e39a2da46989e0a6e37eb42bbc105d3b6d283e214f5156b` | 2539639 |

MBBE pool deploy reused the existing REMIT-Q faucet and the same operator wallet. A 3-maker fill on this address is not yet indexer-confirmed. Do not treat v1 fill `22c76487…` as K-set best-compliant evidence.

Over-cap and price-limit fills are **rejected in Compact** (no settlement tx). Executor visibility is a constrained broker, not MPC.

The live Preprod **MBBE K=3** pool is `01bebd52…` (tx `55224e41…`, block 2541620). The v1 pool `e82dea02…` remains historical single-offer evidence. Compact `fill` in this repo proves best-of-K, not global-book best execution.

## Honest limits

The executor is a constrained broker: it sees mandate and offer openings it is given. Matching is not MPC and is **not** global-book best execution. Compact `fill` proves the selected candidate is the unique best *eligible* opening among the K=3 private slots supplied in that transaction. Padding copies are `live=false` and cannot win. Deposit/withdraw amounts are public. `fill` is proven on the executor (proof-server 8.1.0), not in the browser. `/agent/rank` returns a `selectedId` without openings; it does not prove or submit.
