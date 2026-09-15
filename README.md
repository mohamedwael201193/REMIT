# REMIT

Private execution where an agent can choose, but cannot exceed the mandate.

![REMIT: private mandate, private liquidity, constrained executor, ZK policy, verifiable execution](docs/remit-idea.png)

```
PRIVATE MANDATE
+
PRIVATE LIQUIDITY
+
CONSTRAINED EXECUTOR
+
ZK POLICY ENFORCEMENT
=
VERIFIABLE EXECUTION
```

## Contents

1. [What REMIT is](#what-remit-is)
2. [On-chain proofs](#on-chain-proofs)
3. [Why REMIT exists](#why-remit-exists)
4. [Core idea](#core-idea)
5. [Architecture](#system-architecture)
6. [Private vs public state](#private-vs-public-state)
7. [Compact contracts](#compact-contracts)
8. [MBBE](#mbbe-k3)
9. [RFQ](#rfq)
10. [Residual execution](#residual-lifecycle)
11. [Selective audit](#selective-audit)
12. [Wallet architecture](#wallet-architecture)
13. [Proof architecture](#proof-architecture)
14. [Preprod evidence](#preprod-evidence)
15. [Tests](#tests)
16. [Judge: run REMIT locally](#judge-run-remit-locally)
17. [Clean contract compile](#clean-contract-compile)
18. [Judge CLI](#one-command-judge-evidence)
19. [Security and privacy](#security-verification)
20. [Wave 1 / Wave 2 / Wave 3](#wave-1---proven-foundation)

## What REMIT is

REMIT is a mandate-bound dark RFQ desk on Midnight. A principal seals trading rules the public ledger never contains. Counterparties quote privately. A constrained executor may choose among the private candidates it is given. Compact proves the fill obeyed the mandate before value moves. Selective audit can later open one authorized fact without opening the book.

Wave 1 is live on Midnight Preprod (`protocolVersion` 1000000, ledger 8). Wave 2 hardens the same protocol. Wave 3 targets Mainnet after an explicit capability gate.

Pinned stack (do not bump for this pool): Compact **0.31.1** / language **0.23** / midnight-js **4.1.1** / wallet-sdk **1.2.0** / DApp Connector **4.0.1** / proof-server **8.1.0** / indexer **4.3.3-hotfix**.

Hosted UI: https://remit-front.vercel.app  
Hosted API: https://remit-api-node.onrender.com  
Source: this repository. License: Apache-2.0.

---

## On-chain proofs

Every claim below is a Compact transaction on Midnight Preprod (`protocolVersion` 1000000). Open a link. The explorer is the settlement record.

Pool `01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e` · Quote `7559e38693725dafef73486f2ee3aa30ee0b5b543e22d0aa5ad7303c37b55e3f` · `auditRoot` `1bbc1cc2aa2cd83de56cb8ea15ec5dfb8dd071cf2fb305980416ed726b81a694`

| What settled | Block | Explorer |
|---|---|---|
| Quote REMIT-Q deployed | 2538374 | [04800c4c…08008](https://preprod.midnightexplorer.com/transactions/0x04800c4ca43dd572d77ca1e5cf604702c609ff091ecb567f942ff15e17c08008) |
| MBBE K=3 pool deployed | 2541620 | [55224e41…61798a](https://preprod.midnightexplorer.com/transactions/0x55224e41e1b68f5cc65286f19e7269b199563158806fc5ae03fe9f536c61798a) |
| Padding cannot win | 2541757 | [8fac31ab…b92e55](https://preprod.midnightexplorer.com/transactions/0x8fac31ab4a7b76e91f8da95d8bfd0099f0a754daa4641d571dcdd45b59b92e55) |
| Live K=3 fill | 2542039 | [12306cbe…38cbd20](https://preprod.midnightexplorer.com/transactions/0x12306cbe24823f1ac39f0a1db3ee23214cc84d44cb8014b1d2f84d67838cbd20) |
| Mandate created | 2541972 | [308c7b2c…010749](https://preprod.midnightexplorer.com/transactions/0x308c7b2c57a8ab9aeefea4a1c243f5da056e6b5f4dbd4dc234cdb84aa1010749) |
| Private maker offer | 2548791 | [c303ec61…5265b2](https://preprod.midnightexplorer.com/transactions/0xc303ec61c09d406acfbec24915dd83c0546c1e833329a3e6a2f7de53b15265b2) |
| RFQ fill 50 of 80 | 2549944 | [5a1200f5…16f00a](https://preprod.midnightexplorer.com/transactions/0x5a1200f5869cb60c81f9ebcb649da45fb47c563bc245c362d36665597b16f00a) |
| Residual 30 consumed | 2550168 | [5f1203cf…12b99f](https://preprod.midnightexplorer.com/transactions/0x5f1203cf9cdde32192f4a2cdce275ff34529b19bbe24644f6014b1c24f12b99f) |
| Compact withdraw | 2550510 | [999e2b5b…490fce5](https://preprod.midnightexplorer.com/transactions/0x999e2b5b3a32c7537ebba3ecb9afd7bce77f8ff205f97e361c2be5e35490fce5) |
| Chrome createMandate | 2551299 | [5172ab71…36df8fa9](https://preprod.midnightexplorer.com/transactions/0x5172ab712e2cb39e5f455dd8cec609765d6fe2225ca0b0e97412cfc436df8fa9) |
| Chrome revokeMandate | 2551669 | [8ae27d7a…1882f49](https://preprod.midnightexplorer.com/transactions/0x8ae27d7a3930c284a410198234d97ad110f0668af29cf89c42091b3b51882f49) |
| Chrome deposit | 2551700 | [cdb04c15…05ff2d](https://preprod.midnightexplorer.com/transactions/0xcdb04c15462fad79bcd851ec39604bae32ef3b8f2463eb44aea7e7365c05ff2d) |

Public JSON (hashes only, no openings): [hosted `/evidence`](https://remit-api-node.onrender.com/evidence) · [hosted `/chain`](https://remit-api-node.onrender.com/chain) · committed copy `apps/api/preprod-evidence.json`.

> An agent can choose. It cannot exceed the mandate. These transactions are how you check.

---

## Why REMIT exists

Delegated execution leaks strategy. A limit price, a size, a remaining budget, an expiry, and an admitted counterparty set are signals. Anyone who can read them can trade against them. Asking an agent or a desk to "be careful" is not a proof.

REMIT makes the policy itself the object of cryptography:

- The **principal** authorizes an executor inside a private mandate.
- **Makers** quote private offers into an encrypted RFQ path.
- The **executor** may rank and select. Compact will not settle a fill that violates the mandate.
- The **public ledger** records commitments, nullifiers, counters, and an `auditRoot`. It does not store openings, prices, `chosenIndex`, or `fillBase`.

The agent is constrained execution infrastructure, not a chatbot and not settlement authority. Model output never authorizes a fill.

---

## Core idea

```mermaid
flowchart TD
  P[Principal] --> M[Private mandate]
  MK[Maker] --> O[Private offer]
  O --> RFQ[Encrypted RFQ box]
  M --> EX[Constrained executor]
  RFQ --> EX
  EX --> K[K=3 private candidate set]
  K --> ZK[Compact fill proof]
  ZK --> S[Settlement]
  S --> R[Residual opening]
  R --> S
  S --> A[Selective audit]
```

1. Principal seals a **Mandate** (asset, side, cap, limit, remaining, `cpRoot`, executor key, expiry).
2. Maker seals an **Offer** (side, size, price as base/quote, minFill, expiry) and optionally boxes it as RMTB1.
3. Executor receives openings it is given, ranks a **K=3** private book, and proves `fill(nowBound)`.
4. Compact consumes the selected offer, pays both sides as notes, inserts a residual offer if leftover size remains, writes `auditRoot`, increments `fills`.
5. Principal may **revoke**. Owner may **withdraw** leftover notes. Auditor may verify one authorized field against `auditRoot`.

---

## What Midnight protects

Midnight is a dual-ledger system. Compact circuits run locally over private witnesses and disclose a minimum public transcript plus a ZK proof.

```mermaid
flowchart LR
  subgraph private [Private]
    W[Wallet / tab vault]
    WIT[Witness: mandate, offer, openings, chosenIndex, fillBase]
  end
  subgraph prove [Prove]
    C[Compact circuit]
    PS[Proof server or 1AM WASM]
  end
  subgraph public [Public ledger]
    L[Commitments / nullifiers / counters / auditRoot]
    TX[Transaction hash / block]
  end
  W --> WIT --> C --> PS
  C --> L
  PS --> TX
```

Official Midnight guidance: the proof server sees witnesses in the clear. REMIT therefore proves user circuits in the wallet (1AM `getProvingProvider`) or on an operator-controlled local proof-server 8.1.0. Render does not receive fill witnesses.

---

## System architecture

```mermaid
flowchart TB
  B[Browser / Next.js]
  WAL[1AM or Lace]
  VAULT[Hashed tab vault]
  API[Render API]
  DB[(Supabase ciphertext envelopes)]
  AG[Agent ranker]
  OP[Operator Node]
  PS[Local proof-server 8.1.0]
  MN[Midnight Preprod]
  IX[Indexer]

  B --> WAL
  WAL --> VAULT
  B --> API
  API --> DB
  API --> AG
  AG --> OP
  OP --> PS
  WAL --> MN
  OP --> MN
  MN --> IX
  IX --> API
  IX --> B
```

Where plaintext exists:

| Location | Plaintext | Encrypted / committed |
|---|---|---|
| Browser tab vault | Mandate/offer openings after unlock | AES wrap; storage key is `SHA-256(network\|pool\|wallet)` |
| 1AM in-tab prove | Witness during prove | Proof only on the wire to Midnight |
| Operator Node + local proof-server | Fill witness during prove | Not on Render |
| Render API | Public hashes, ciphertext boxes | RMTB1 envelopes; no openings in JSON |
| Postgres | Ciphertext, owner binding | RLS deny-all; no service role in the browser |
| Ledger | Amounts at unshielded deposit/withdraw; commitments, nullifiers, counters | Openings never stored |

---

## Private vs public state

| Object | Private | Public | Boundary |
|---|---|---|---|
| Mandate | terms, `mandateData`, rand | `mandateCommitment`, revocation tag | openings never in JSON |
| Offer | price, size, maker, minFill | `offerCommitment`, offer nullifier | RFQ box is ciphertext |
| Fill | `chosenIndex`, `fillBase`, `fillQuote`, K-set | `fills++`, residual commit, `auditRoot` | Compact asserts; agent cannot override |
| Residual | leftover opening | new offer commitment | spent opening cannot replay |
| Audit | field openings | `auditRoot` | one-field verify; forged fails |
| Custody | note nonce, owner secret | unshielded amount at deposit/withdraw | amount is the unshielded boundary |
| Wallet | Bech32 address, wrap key | none in storage keys | hashed namespace |

---

## Protocol objects

- **Note** — private unshielded-backed pool note (`asset`, `amount`, `owner`).
- **Offer** — private quote (`side`, `baseAmount`, `quoteAmount`, `maker`, `payNonce`, `expiry`, `minFillBase`).
- **Mandate** — private policy (`principal`, `executor`, `side`, `maxFillBase`, limit, `cpRoot`, `expiry`, `mandateId`).
- **MandateState** — `{ mandateId, remaining }` committed separately so remaining can change without republishing the mandate.
- **Residual** — leftover offer after a partial fill (`baseAmount - fillBase`, derived `payNonce` / rand).
- **Nullifier** — spend tag for notes, offers, and mandate states.
- **AuditRoot** — `auditRootOf` over six field commitments (side, fillBase, fillQuote, principal, maker, mandateId).
- **Disclosure package** — one authorized field + salt + `auditRoot`; forged values fail `verifyDisclosure`.

---

## Compact contracts

`CONTRACT/src/remit_pool.compact` — pragma `>= 0.22 && <= 0.23`, toolchain **0.31.1**. Seven impure circuits. Do not add an eighth.

`CONTRACT/src/remit_quote.compact` — REMIT-Q faucet. Separate contract. No cross-contract calls.

### Pool circuits

| Circuit | Purpose | Private | Disclosed / public effect | Fails when |
|---|---|---|---|---|
| `deposit` | Mint a note from unshielded funds | owner secret, nonce | asset, amount (unshielded receive) | bad asset, zero amount |
| `withdraw` | Return note value to `withdrawTo()` | owner secret, note | asset, amount, recipient | wrong owner, insufficient note |
| `placeOffer` | Commit an offer, escrow size | `offerData`, rand, note | offer commitment, `openOffers++` | not maker, bad size, escrow too small |
| `cancelOffer` | Nullify unused offer, return escrow | offer, path | offer nullifier, `openOffers--` | not owner, already used |
| `createMandate` | Commit policy + remaining | `mandateData`, rand, note | mandate + state commitments, `activeMandates++` | not principal, empty escrow |
| `revokeMandate` | Kill mandate, return remaining | mandate + state openings | revocation tag, state nullifier, `activeMandates--` | not principal, already revoked |
| `fill` | Prove policy, settle, residual, audit | executor secret, mandate, K=3 book, `chosenIndex`, `fillBase` | offer nullifier, residual commit, notes, `auditRoot`, `fills++` | ineligible, dominated, replay, cap, price, budget, expiry, wrong executor |

### Quote circuits

| Circuit | Purpose |
|---|---|
| `quoteColor` | `tokenType("remit:quote", self)` |
| `claim` | Mint up to 1000 REMIT-Q per (caller, UTC-day). Not a stablecoin. |

---

## MBBE (K=3)

MBBE proves the best eligible candidate among the **K=3 private openings** supplied in the executor's witness (`book()`). This bounded witness-set semantics is deliberate.

```mermaid
sequenceDiagram
  participant E as Executor
  participant C as Compact fill
  participant L as Ledger
  E->>E: rank K=3 with Compact-identical helpers
  E->>C: witness: slots, chosenIndex, fillBase, mandate
  C->>C: bindSlot x3, slotEligible, notDominated
  alt selected unique best eligible
    C->>L: nullify offer, pay notes, residual, auditRoot, fills++
  else ineligible / dominated / padding / replay
    C-->>E: assert fails, no mutation
  end
```

Eligibility (simplified): live slot, opposite side, not expired, price inside limit, size inside cap and remaining, counterparty under `cpRoot` (or open), `minFill` respected unless filling the whole offer.

Padding: `live=false` cannot win. All-ineligible fails. A strictly worse eligible slot fails `notDominated`. The executor cannot prefer a dominated candidate without a failed proof.

Wave 2 investigates encoding still more of the ranking predicate in-circuit. Wave 2 does not claim a global order book.

---

## RFQ

```mermaid
sequenceDiagram
  participant M as Maker browser
  participant API as Render API
  participant DB as Postgres
  participant A as Agent
  participant N as Operator Node
  M->>API: POST ciphertext RMTB1 box
  API->>DB: envelope only
  A->>API: decrypt with RFQ secret after auth
  A->>A: rank K=3
  N->>N: prove fill on local proof-server
  N->>N: submit to Preprod
```

Public HTTP never lists openings. Admin `/inbox` is Bearer. Replay nonces reject duplicate boxes.

---

## Residual lifecycle

```mermaid
flowchart LR
  O[Offer 80] --> F[fill 50]
  F --> R[residual 30 committed]
  R --> C[consume 30]
  C --> X[opening closed]
  F -.-> P[replay of 80]
  C -.-> P2[replay of 30]
  P --> FAIL[Compact reject]
  P2 --> FAIL
```

Verified on Preprod: fill 50/80 `5a1200f5…` block 2549944, residual 30 `5f1203cf…` block 2550168.

---

## Selective audit

```mermaid
sequenceDiagram
  participant F as fill
  participant L as auditRoots
  participant A as Auditor
  F->>L: disclose auditRootOf(6 field commits)
  A->>A: authorized field + salt
  alt matches root
    A-->>A: VERIFIED
  else forged 999 / wrong root
    A-->>A: REJECTED
  end
```

Live head: `1bbc1cc2aa2cd83de56cb8ea15ec5dfb8dd071cf2fb305980416ed726b81a694`. Chrome auditor: fill amount 30 VERIFIED; forged 999 REJECTED.

---

## Wallet architecture

Connector: DApp Connector **4.0.1**. `connect(networkId)` must run in the click handler. Connected means `getConnectionStatus().status === "connected"` on Preprod. Private vault keys are `SHA-256(network|pool|wallet)`. A different wallet is a different vault.

### 1AM

- Discovery via `window.midnight`, then `connect(networkId)`.
- `getConnectionStatus()` must report `connected` before the UI says connected.
- In-browser proving via `getProvingProvider` for user circuits: createMandate, revokeMandate, placeOffer, deposit, withdraw.
- Preprod. Never asks for a seed.

### Lace

- Same connector connect path. Lace is **not** in-browser proving.
- Compact proofs go to local proof-server **8.1.0** at `http://localhost:6300` (`npm run proof:up`).
- Private witnesses stay on the operator/user machine. They are not uploaded to Render.
- Compact calls fail truthfully if the proof-server is down. Connection can still succeed.
- Lace Settings → Midnight → Local (`http://localhost:6300`).

Header DUST is a fee meter, not spendable coins.

```mermaid
stateDiagram-v2
  [*] --> Connect: connect(networkId)
  Connect --> Identified: connector status connected
  Identified --> Vault: hashed SHA-256(network|pool|wallet)
  Vault --> Reload: sessionStorage wrap
  Reload --> Identified: reconnect from real status
  Identified --> Isolated: different wallet, different vault
  Identified --> Disconnect: remit:manual-disconnect
  Disconnect --> [*]
```

---

## Proof architecture

```
SOURCE (.compact)
  → compact compile 0.31.1
  → managed/ (JS bindings, ZKIR, verifier keys, prover keys)
  → runtime (midnight-js 4.1.1)
  → proof (1AM in-tab, or Lace/operator proof-server 8.1.0)
  → wallet balance/sign
  → submitTransaction
  → indexer truth-gate
```

- **1AM user circuits:** `getProvingProvider` in the tab.
- **Lace user circuits:** `httpClientProofProvider(http://localhost:6300)`.
- **Executor `fill`:** operator Node + Docker `midnightntwrk/proof-server:8.1.0`.
- Render does not receive fill witnesses. That is the privacy boundary, not a missing feature.

Verifier keys and ZKIR are committed. Prover keys are gitignored (`CONTRACT/managed/**/keys/*.prover`) and hosted at `GET /keys`. Fetch with `npm run keys:fetch` if you need them locally.

---

## Verified Wave 1 capabilities

| Capability | What is proven | Evidence |
|---|---|---|
| 7 Compact circuits | Compile + managed artifacts, compiler 0.31.1 | `inspect-managed` |
| Private mandate | In-wallet create and revoke | [`5172ab71…`](https://preprod.midnightexplorer.com/transactions/0x5172ab712e2cb39e5f455dd8cec609765d6fe2225ca0b0e97412cfc436df8fa9) / [`8ae27d7a…`](https://preprod.midnightexplorer.com/transactions/0x8ae27d7a3930c284a410198234d97ad110f0668af29cf89c42091b3b51882f49) |
| Private liquidity | Maker offer + encrypted RFQ | [`c303ec61…`](https://preprod.midnightexplorer.com/transactions/0xc303ec61c09d406acfbec24915dd83c0546c1e833329a3e6a2f7de53b15265b2) |
| Constrained executor | K=3 policy execution | [`12306cbe…`](https://preprod.midnightexplorer.com/transactions/0x12306cbe24823f1ac39f0a1db3ee23214cc84d44cb8014b1d2f84d67838cbd20) |
| ZK policy enforcement | Compact accepts/rejects adversarial cases | `TESTS/security`, `TESTS/privacy` |
| Partial execution | 50/80 fill | [`5a1200f5…`](https://preprod.midnightexplorer.com/transactions/0x5a1200f5869cb60c81f9ebcb649da45fb47c563bc245c362d36665597b16f00a) |
| Residual lifecycle | leftover 30 consumed | [`5f1203cf…`](https://preprod.midnightexplorer.com/transactions/0x5f1203cf9cdde32192f4a2cdce275ff34529b19bbe24644f6014b1c24f12b99f) |
| Replay resistance | consumed openings rejected | Compact sim + operator |
| Selective audit | one-field verification | `auditRoot` `1bbc1cc2…` |
| Tamper rejection | forged disclosure rejected | `/audit/verify` `ok:false` |
| Real custody | deposit and withdraw | [`cdb04c15…`](https://preprod.midnightexplorer.com/transactions/0xcdb04c15462fad79bcd851ec39604bae32ef3b8f2463eb44aea7e7365c05ff2d) / [`999e2b5b…`](https://preprod.midnightexplorer.com/transactions/0x999e2b5b3a32c7537ebba3ecb9afd7bce77f8ff205f97e361c2be5e35490fce5) |
| Wallet reconnect | reload + connector status + hashed vault | Chrome + `TESTS/unit/wallet-reconnect.test.ts` |
| User isolation | wallet-scoped state | `TESTS/security/isolation.test.ts` |
| Persistent backend | ciphertext envelopes survive restart | Supabase `persist.backend=supabase` |
| Chrome end-to-end | real wallet + real Preprod mutations | createMandate, revokeMandate, deposit |
| CI | compile, test, security, docs gates | `.github/workflows/ci.yml` |

---

## Preprod evidence

The full clickable set is in **On-chain proofs** at the top of this README. Committed copy: `apps/api/preprod-evidence.json`. Explorer: `https://preprod.midnightexplorer.com/transactions/0x<hash>`. v1 pool `e82dea02…` is historical single-offer evidence. It is not the K=3 pool.

---

## Architectural boundaries

These are properties of the current architecture, not failed gates.

1. **MBBE is K=3.** Compact proves uniqueness among the three private slots in that witness, not over the global book. Wave 2 strengthens the in-circuit relation inside K.
2. **Executor proving is operator-local.** Private fill witnesses are not delegated to a third-party hosted prover. User circuits prove in the wallet (1AM) or on Lace's local proof-server.
3. **Unshielded custody discloses amount** at deposit and withdraw. Interior note accounting is committed.
4. **REMIT-Q is testnet-only.** Not a stablecoin. Mainnet quote asset is a Wave 3 gate item.
5. **Mainnet is Wave 3.** Compact 0.34 / ledger 9 is a different generation. This pool stays 0.31.1 / ledger 8 until the gate is experimentally green.
6. **Metadata and timing** are not magically eliminated. Ciphertext size, timestamps, and public counters remain. Wave 2 adds unlinkable discovery.
7. **Witness truthfulness is not provenance.** Compact proves the relation on the openings it is given. It does not prove the executor was handed every offer in the world.

A leftover note is spendable only from the namespaced vault that holds its opening. That is how Compact notes work.

---

## Tests

Latest verified full run: **47 files / 191 passed** (`vitest run`; Playwright hosted spec is separate and not the default suite).

Layout:

- `TESTS/unit` — Compact sim, API, wallet, durable persist, MBBE rank, circuit bundle
- `TESTS/security` — unauthorized revoke/cancel/withdraw, policy, isolation, MBBE adversarial
- `TESTS/privacy` — public dump leaks, correlation tags, API/log leak, audit verify, hosted evidence
- `TESTS/integration` — compact-runtime lifecycle
- `TESTS/e2e` — hosted honesty (read-only)

Adversarial coverage that actually exists in those files: over-cap, bad price, remaining budget, expiry, revoke, wrong executor, wrong counterparty, opposite side, replay, invalid padding, all-ineligible, dominated candidate, residual vs stale opening, forged disclosure, wrong audit binding, cross-principal isolation, plaintext leakage, public API leakage.

```bash
npm test
npm run test:unit
npm run test:security
npm run test:privacy
npm run test:integration
npm run secret-scan
```

---

## Judge: run REMIT locally

Node **22**, npm **10**, Docker (proof-server). Compact **0.31.1** on Linux/macOS, or WSL Ubuntu on Windows. Do not bump the pin.

### A. Contract compilation

Prerequisites: `compact compile --version` prints `0.31.1`.

```bash
npm install
npm run compile:skip-zk
node scripts/inspect-managed.mjs
```

Expected: pool + quote JS bindings present; compiler-version `0.31.1`; 7 pool verifier keys. Full ZK:

```bash
npm run compile
```

Windows without a native `compact`: the script uses WSL. Linux/macOS call `compact` on PATH.

Contract-only, no UI:

```bash
compact compile --skip-zk CONTRACT/src/remit_pool.compact CONTRACT/managed/remit_pool
compact compile --skip-zk CONTRACT/src/remit_quote.compact CONTRACT/managed/remit_quote
```

### B. Test suite

```bash
npm test
npm run test:unit
npm run test:security
npm run test:privacy
npm run test:integration
```

Expected: vitest green. Playwright hosted spec is separate (`npm run test:e2e`) and is not the default suite.

### C. Proof server

```bash
npm run proof:up
```

Expected: Docker `midnightntwrk/proof-server:8.1.0` listening on `http://localhost:6300`. Stop with `npm run proof:down`. Witnesses never go to Render.

### D. API

Gitignored `.env.preprod.local` (copy `.env.example`). No seeds in the shell history you paste to a judge.

```bash
npm run api
```

Expected: `GET /health` → `network=preprod`, `mpc=false`.

### E. Frontend

```bash
npm run front:env
cd front && npm install && npm run dev
```

Expected: local UI on the Next port. Public env is `NEXT_PUBLIC_*` only.

### F. Chrome wallet

**1AM:** Connect wallet → 1AM → authorize Preprod. UI connected only after `getConnectionStatus()`. Proving is in-browser.

**Lace:** Start proof-server first. Connect wallet → Lace → authorize Preprod. Proving is local proof-server 8.1.0, not in-tab WASM. Compact calls fail truthfully if `:6300` is down.

Reload reconnects from connector status + hashed vault. Switching wallets isolates private state.

### G. Preprod verification

Path without a wallet:

1. https://remit-front.vercel.app
2. https://remit-api-node.onrender.com/health
3. https://remit-api-node.onrender.com/evidence
4. https://remit-api-node.onrender.com/chain
5. Click hashes in [On-chain proofs](#on-chain-proofs)

---

## Clean contract compile

| Item | Value |
|---|---|
| Command | `npm run compile` or `npm run compile:skip-zk` |
| Directory | repository root |
| Compiler | Compact **0.31.1** (`compact compile --version`) |
| Language | pragma `>= 0.22 && <= 0.23` (this pool is **0.23**) |
| Sources | `CONTRACT/src/remit_pool.compact`, `CONTRACT/src/remit_quote.compact` |
| Output | `CONTRACT/managed/remit_pool`, `CONTRACT/managed/remit_quote` |
| Circuits | 7 impure pool circuits + quote faucet |
| Committed | JS bindings, ZKIR, `.verifier` keys |
| Gitignored | `CONTRACT/managed/**/keys/*.prover` (too large) |
| Hosted provers | `GET https://remit-api-node.onrender.com/keys` |

Inspect: `node scripts/inspect-managed.mjs` must print compiler-version `0.31.1` and 7 pool verifiers.

---

## One-command judge evidence

```bash
npm run judge:proof
```

Prints a Wave 1 verification report: compile artifacts, circuit inventory, tests, committed Preprod hashes with explorer URLs, indexer/hosted probes, privacy keys absent from public JSON. Labels evidence as **REPRODUCED LOCALLY**, **COMMITTED EVIDENCE**, **INDEXER-VERIFIED**, or **VERIFIED AGAINST PREPROD**. It does not recreate historic private proofs from a hash.

Never prints mnemonics, `DATABASE_URL`, service-role keys, or box plaintext.

Slide deck: [SLIDES.md](./SLIDES.md). Demo video is recorded separately and is not in this repository; this pass does not edit it.

---

## Security verification

```bash
npm run secret-scan
npm run runtime-tree
node scripts/inspect-managed.mjs
npm run docs:scan
npm run about:count
npm run test:security
npm run test:privacy
npm run build -w @remit/api
```

CI (`.github/workflows/ci.yml`): Compact 0.31.1 attempt, secret-scan, runtime-tree, unit/security/privacy/integration, inspect-managed, public-doc scan, API build, frontend typecheck, ABOUT character gate, `judge:proof`.

No `ownPublicKey()` authentication. No secrets in `VITE_` / `NEXT_PUBLIC_`. No fake settlement hashes in UI.

---

## Wave 1 - proven foundation

- Compact pool + quote on 0.31.1 (7 impure pool circuits).
- Encrypted RFQ, durable ciphertext inbox, hashed browser vaults, wallet reconnect from real connector status.
- MBBE K=3 fill, residual consume, replay reject, one-field audit, forged reject.
- Chrome createMandate, Chrome revokeMandate, Chrome deposit, Compact withdraw on Preprod.
- Hosted keys including `withdraw.prover`. Operator prove uses local proof-server 8.1.0.

```mermaid
flowchart LR
  W1[Wave 1 Preprod] --> W2[Wave 2 hardening]
  W2 --> W3[Wave 3 Mainnet gate]
  W3 --> MN[Mainnet deploy]
```

---

## Wave 2 - hardening and scale

See [PLAN.md](./PLAN.md). In short: stronger best-compliant K relation, unlinkable liquidity discovery, multi-executor delegation, purpose-bound selective audit, richer residual lifecycle, institutional policy templates, privacy metrics, security hardening, judge sandbox, production persistence drills.

---

## Wave 3 - Mainnet

Wave 3 **targets Mainnet**. Nothing is Mainnet-ready until an experimental gate is green for: ledger, Compact, midnight-js, wallet SDK, connector, proof-server, indexer, DUST, custody assets, proving-key lifecycle, browser wallets, and privacy validation. Compact 0.34 / ledger 9 is a different generation from this Preprod pool.
