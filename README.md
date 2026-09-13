# REMIT

**A dark pool where the trader's rules are as private as the trade — and just as enforced.**

A principal gives an executor a private mandate. The chain proves every fill obeyed a mandate it never saw. Settlement uses **tNIGHT** (native unshielded) plus **REMIT-Q**, a contract-minted **testnet-only** quote token. REMIT-Q is **not a stablecoin** — Preprod has no official usable stablecoin.

Status: Wave 1 in progress. Operator DUST/deploy uses one WalletFacade plus a gitignored `serializeState` cache (`availableCoins >= 1`). The supplied `front/` tree is the product UI — it is wired to the public API, indexer evidence, and DApp connector v4 (1AM / Lace). Do not treat connector/header DUST as spendable.

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

Secrets live only in `.env.preprod.local` (gitignored). Copy `.env.example`. Never put secrets in `VITE_*`.

## Honest limits

The executor is a constrained broker: it sees mandate and offer openings it is given. Matching is not MPC. Deposit/withdraw amounts are public. `fill` is proven on the executor, not in the browser.
