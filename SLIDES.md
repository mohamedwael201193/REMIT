# REMIT — slide deck

Factual Wave 1 board. No third-party product names. No video. Explorer links are Preprod.

## 1. Title

**REMIT** — private execution where an agent can choose, but cannot exceed the mandate.

Midnight Preprod · protocolVersion 1000000 · ledger 8 · Compact 0.31.1

Hosted UI: https://remit-front.vercel.app  
Hosted API: https://remit-api-node.onrender.com

## 2. Core idea

PRIVATE MANDATE + PRIVATE LIQUIDITY + CONSTRAINED EXECUTOR + ZK POLICY ENFORCEMENT = VERIFIABLE EXECUTION

## 3. Private mandate

A principal seals asset, side, per-fill cap, limit price, remaining budget, counterparty root, executor key, and expiry. Public state stores commitments and nullifiers, not openings.

## 4. Private liquidity

Makers quote into encrypted RFQ boxes (RMTB1). The public ledger never lists prices or identities.

## 5. Constrained executor

The agent may rank a K=3 private candidate set. Model output is never settlement authority. Compact `fill` is.

## 6. Compact enforcement

Seven impure pool circuits: deposit, withdraw, placeOffer, cancelOffer, createMandate, revokeMandate, fill. Quote REMIT-Q is testnet-only, not a stablecoin.

## 7. MBBE K=3

MBBE proves the best eligible candidate among the three private openings in the executor witness. It is not a global order book and not MPC.

## 8. Residual execution

A 50-of-80 fill committed leftover 30. The leftover was consumed on-chain. Spent openings are Compact-rejected.

- Fill: https://preprod.midnightexplorer.com/transactions/0x5a1200f5869cb60c81f9ebcb649da45fb47c563bc245c362d36665597b16f00a
- Residual: https://preprod.midnightexplorer.com/transactions/0x5f1203cf9cdde32192f4a2cdce275ff34529b19bbe24644f6014b1c24f12b99f

## 9. Selective audit

One authorized field verifies against `auditRoot`. A forged value is rejected. Unauthorized fields stay sealed. Live head `1bbc1cc2…`.

## 10. Preprod proof

MBBE pool `01bebd52…` · Chrome createMandate / revokeMandate / deposit · Compact withdraw `999e2b5b…`. Full table: README On-chain proofs.

## 11. Wallets

**1AM:** connector v4, in-browser proving on Preprod.  
**Lace:** connector v4, local proof-server 8.1.0 at localhost:6300. Witnesses are not sent to Render.

## 12. Roadmap

Wave 1 is live on Preprod. Wave 2 hardens the same protocol (stronger in-circuit K relation, unlinkable discovery, purpose-bound audit). Wave 3 targets Mainnet after an explicit capability gate. Compact 0.34 / ledger 9 is a different generation; this pool stays 0.31.1 / ledger 8 until that gate is green.
