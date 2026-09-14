# PLAN.md

# REMIT Wave 2 + Wave 3

Unified roadmap after Wave 1 on Midnight Preprod.

Wave 1 shipped a compiling Compact pool, live Preprod MBBE fills, residual consume, selective audit, Chrome createMandate and revoke, operator withdraw, ciphertext persistence, and hashed wallet reconnect. This file does not reopen Wave 1 product scope. It sequences what changes next, why, which privacy property improves, which Midnight capability enables it, what must be recompiled, how it is tested, how it rolls back, and what is not claimed.

Pinned stack until a Wave 3 capability gate says otherwise:

- Compact toolchain 0.31.1 / language 0.23
- midnight-js 4.1.1
- wallet-sdk 1.2.0
- DApp Connector 4.0.1
- proof-server 8.1.0
- indexer 4.3.3-hotfix
- ledger 8 / protocolVersion 1000000

Official Midnight docs currently also publish Compact 0.34 and ledger 9. Those are **not** this pool. Wave 3 Mainnet uses whatever matrix is experimentally verified for production at that time. Do not bump versions in this repository to chase release notes.

---

## Operating rules

1. Compact policy remains settlement authority. Ranking code, agents, and models may advise. They may not authorize.
2. MBBE stays honest: best eligible candidate among the K private slots in the fill witness. Never "global best execution."
3. REMIT-Q stays a testnet-only contract-minted quote token. It is not a stablecoin.
4. Hosted Render does not run proof-server 8.1.0. `httpSubmit` stays false until a dedicated prove path exists.
5. Ciphertext-only persistence. No plaintext mandate, price, size, or key in Postgres, logs, or public JSON.
6. Every milestone has an acceptance test, a rollback, and an explicit non-claim.

---

## Wave 2 — Product + protocol hardening

Horizon: post-Wave-1 judging through the next build window. Target: stronger privacy properties on the same ledger-8 pool where possible; a new pool address only when Compact witnesses change.

### W2.1 Provable best-compliant execution (still K-scoped)

**What changes.** Tighten the relation Compact already proves: the selected live slot is the unique eligible maximum under `betterPrice` / `samePrice` among the K=3 openings in `book()`. Investigate encoding more of the ranking predicate in-circuit so TypeScript ranking cannot diverge.

**Why.** Wave 1 already rejects ineligible and dominated slots. Drift between `packages/agent` ranking and Compact helpers is the residual honesty risk.

**Privacy.** No new public fields. `chosenIndex` stays private.

**Midnight capability.** Compact witnesses + impure `fill`. Same HistoricMerkleTree note/offer/mandate ledgers.

**Possible.** Stronger assurance that a malicious executor cannot prefer a worse eligible slot without a failed proof.

**Recompile.** Yes if the `fill` circuit changes. New proving keys. New pool address (immutable contract).

**Tests.** Existing MBBE ranking vs Compact helpers; adversarial selected-worse-eligible; padding `live=false` cannot win; all-ineligible fails.

**Acceptance.** A fill with a strictly worse eligible candidate in the K-set fails Compact. Public ledger shape of `fill` unchanged (nullifiers, residual commit, payouts, `auditRoot`, `fills++` only).

**Rollback.** Keep current pool `01bebd52…` live. Deploy a parallel pool only after skip-zk + full-zk + a Preprod canary fill.

**Not claimed.** Global-book best execution. Best of offers the executor was never given.

### W2.2 Unlinkable liquidity discovery

**What changes.** Rotating participation identifiers, fresh blinds per epoch, and bounded candidate selection so repeated RFQs from the same maker are harder to correlate from public metadata.

**Why.** Encrypted boxes already hide price/size. Timestamps, sizes of ciphertext, and stable ids can still correlate.

**Privacy.** Reduces linkability of makers across epochs.

**Midnight capability.** Off-chain sealed boxes + on-chain offer commitments/nullifiers. No contract-to-contract calls.

**Recompile.** Only if offer commitment domain separators change.

**Tests.** Correlation-tag scan (existing privacy suite); two sequential offers from one maker do not share a public stable tag.

**Acceptance.** Public HTTP and ledger dumps contain no reusable maker id. Epoch rotation documented.

**Rollback.** Disable epoch ids; keep RMTB1 boxes.

**Not claimed.** Traffic-analysis immunity.

### W2.3 Principal to executor authorization

**What changes.** Multiple executor policies per principal: delegated scopes, per-venue mandate domains, emergency revoke already exists (`revokeMandate`), expiry rotation without rewriting the whole mandate tree if Compact allows a successor state.

**Why.** Wave 1 is one executor key per mandate. Institutions need bounded authority and faster revoke.

**Privacy.** Successor mandates must not leak the previous opening.

**Midnight capability.** Existing `revokeMandate` + `createMandate`. Additional circuits only if state transition needs a new impure circuit (hard cap: do not casually add an 8th).

**Recompile.** If a new impure circuit is required, that is a Wave 2 design review, not a silent add.

**Tests.** Unauthorized revoke still fails; post-revoke fill Compact-rejects; expiry rotation leaves no public linkage.

**Acceptance.** A revoked mandate cannot fill. A successor mandate fills only under the new commitment.

**Rollback.** Single-executor mandates remain valid.

**Not claimed.** A marketplace of untrusted executors with reputation (that is Wave 3).

### W2.4 Multi-field purpose-bound selective audit

**What changes.** Exact field requests, predicates ("price limit satisfied" without the limit), multiple approved fields, disclosure receipts, auditor scope, purpose binding, expiry of disclosures, proof that unrequested fields remain closed.

**Why.** Wave 1 one-field `baseAmount` against `auditRoot` `1bbc1cc2…` is the existence proof. Institutions need scoped, time-bound disclosure.

**Privacy.** Purpose binding prevents a receipt from being reused for a different auditor.

**Midnight capability.** Existing `auditRoots` ledger + off-chain packages. Additional salts/fields in `auditRootOf` if the circuit changes.

**Recompile.** Likely yes for new field ids in the root.

**Tests.** Forged value fails (already). Extra field in the package fails. Expired purpose fails. Unrelated field remains sealed.

**Acceptance.** An auditor with purpose P can verify field set F and cannot verify F'.

**Rollback.** Keep one-field packages compatible with current `auditRoots` head.

**Not claimed.** Full-book audit. Identity of the principal.

### W2.5 Residual lifecycle

**What changes.** Repeated partials, residual expiry, maker cancellation of leftovers, dust/fee accounting, batch residual handling.

**Why.** Wave 1 consumed leftover 30 after a 50/80 fill (`5a1200f5…` then `5f1203cf…`). Real desks need more than one leftover.

**Privacy.** Residual offers must not reveal original fillBase on the public ledger (already stripped).

**Midnight capability.** Residual insert inside `fill` already. `cancelOffer` already exists.

**Recompile.** Only if residual domain separators or expiry witnesses change.

**Tests.** Replay of old opening fails (already). Already-consumed leftover fails (already). New: residual expiry Compact-rejects; cancel leftover by owner only.

**Acceptance.** N sequential partials with Compact-enforced leftover sizes. No public `fillBase`.

**Rollback.** Current single leftover path remains.

**Not claimed.** Unlimited book depth on-chain.

### W2.6 Institutional controls

**What changes.** Policy templates, counterparty allowlists (the Merkle root already exists), risk ceilings, execution windows, audit roles, operator controls.

**Why.** The Compact fields already encode the interesting constraints. The product layer should compose them without new leaky UI.

**Privacy.** Templates must not stamp public labels that identify the principal.

**Recompile.** No if only off-chain templates mapping onto existing mandate fields.

**Tests.** Template instantiation equals a hand-built mandate opening. Over-cap still Compact-rejects.

**Acceptance.** A named template produces a mandate that fills and rejects identically to Wave 1 circuits.

**Rollback.** Manual mandate entry remains.

**Not claimed.** Regulatory certification.

### W2.7 Agent architecture

**What changes.** Strategy adapters, optional model-assisted **advisory** ranking, simulation before authorization, policy explanations, anomaly detection.

**Why.** The agent is constrained execution infrastructure, not a chatbot.

**Privacy.** Explanations must not print openings into logs or `/agent/status`.

**Midnight capability.** Unchanged Compact. Off-chain only.

**Recompile.** No.

**Tests.** Leak scans on `/agent/status` and `/agent/rank`. Advisory path cannot call `submitCircuit`.

**Acceptance.** Disabling the model leaves deterministic MBBE ranking intact. Compact still rejects bad fills.

**Rollback.** `REMIT_AGENT_STRATEGY=deterministic-best-quote`.

**Not claimed.** Autonomous settlement by a model.

### W2.8 Wallet UX

**What changes.** Clearer reconnect, signing intent, private-state lifecycle, browser isolation. Wave 1 already: `connect(networkId)`, hashed `SHA-256(network|pool|wallet)` vaults, manual-disconnect flag.

**Why.** Wave 1 already reconnects from connector status and hashes vault keys. Wave 2 tightens signing intent copy, leftover-note recovery UX, and identity-change isolation so operators spend less time on wallet-boundary incidents.

**Privacy.** No Bech32 in storage keys (already). No mixing vaults across identities (already tested).

**Midnight capability.** Connector 4.0.1, wallet-sdk 1.2.0, address-format 3.1.2.

**Recompile.** No.

**Tests.** Reconnect, identity change, disconnect stays disconnected, Bech32/hex encode vectors.

**Acceptance.** Leftover notes in a hashed tab vault can be withdrawn with a Bech32 or hex recipient; Compact `withdraw` remains the Preprod custody proof (`999e2b5b…`).

**Rollback.** Operator withdraw path (`999e2b5b…`) remains the custody evidence.

**Not claimed.** Embedded custom wallet replacing 1AM/Lace.

### W2.9 Judge / developer sandbox

**What changes.** One command already exists: `npm run judge:proof`. Wave 2 extends it with seeded adversarial RFQs, local undeployed optional path, and a recorded report artifact.

**Why.** Judges need LOCAL vs PREPROD vs HOSTED distinguished without secrets.

**Privacy.** Report redacts mnemonics, DATABASE_URL, boxes.

**Recompile.** No.

**Tests.** `judge:proof` exit 0 on a clean tree; exit 1 if verifier count != 7.

**Acceptance.** One command prints circuit inventory, key sizes, test summary, explorer URLs, limitations.

**Rollback.** Manual README path remains.

### W2.10 Persistence hardening

**What changes.** Versioned migrations, backups, retention, RLS verification drills, server-only credentials, idempotent upserts, recovery without plaintext.

**Why.** Wave 1 survived a Render redeploy with ciphertext RFQ `1789419853264-0`. Free-plan disk is no longer the source of truth. Production still needs drills.

**Privacy.** Backups are ciphertext. Restore must not log openings.

**Recompile.** No.

**Tests.** Durable round-trip; RLS deny-all; restart offers count.

**Acceptance.** Kill API, restore from Postgres, inbox ciphertext count matches, public health has no plaintext.

**Rollback.** File inbox when `DATABASE_URL` is unset (tests only).

### W2.11 Security review

**What changes.** Written threat model covering metadata leakage, correlation, replay, malicious executor/maker/principal, API compromise, DB compromise, browser compromise, proof-server trust, key rotation.

**Why.** Wave 1 learned rewind, Bech32, missing withdraw.prover, and hashed vaults the hard way. Those lessons stay in EXECUTION_HISTORY.md. The public threat model should be the distilled invariants.

**Recompile.** No unless a circuit fix is required.

**Tests.** Existing security + privacy suites stay mandatory in CI. No skipped critical tests.

**Acceptance.** Threat model maps each asset to a test or an explicit residual risk.

**Rollback.** n/a

### W2.12 Privacy metrics

**What changes.** CI assertions already exist; Wave 2 publishes them as a stable scoreboard: no private field in public JSON, no plaintext in storage, no reusable identity tag, no public candidate-set membership, no witness in logs, no cross-wallet vault collision.

**Acceptance.** `npm run test:privacy` and `judge:proof` both GREEN.

---

## Wave 2 milestone schedule

| ID | Milestone | Exit criterion |
|---|---|---|
| M2.0 | Wallet leftover-note UX | Bech32/hex recipient vectors + Compact withdraw evidence |
| M2.1 | Best-compliant K relation locked | Adversarial worse-eligible Compact-rejects on Preprod canary or sim |
| M2.2 | Epoch blinds | Correlation tests GREEN |
| M2.3 | Purpose-bound audit v2 | Forged, extra-field, expired purpose fail |
| M2.4 | Residual N-part | Two leftovers Compact-enforced |
| M2.5 | Persistence drill | Restart without disk, ciphertext intact |
| M2.6 | Threat model | Mapped to tests |
| M2.7 | Sandbox | `judge:proof` in CI |

Rollback for every on-chain change: keep `01bebd52…` as the Wave 1 evidence pool; new addresses are additive.

---

## Wave 3 — Mainnet / protocol-scale

Wave 3 **targets a real Mainnet deployment**, subject to a formal compatibility and capability gate. "Production ready" is not the criterion. The criterion is: the same mechanisms Wave 1 proved on Preprod, re-verified on Mainnet versions, with real-value custody.

### W3.1 Mainnet capability gate

Before any Mainnet deploy, experimentally verify:

- ledger compatibility (currently ledger 8 on Preprod/Mainnet in the 0.31.1 matrix; later 0.34/ledger 9 is a **different** generation)
- Compact compiler
- Compact runtime / on-chain runtime
- midnight-js
- wallet SDK
- DApp Connector
- proof-server (always local; never send witnesses to a third-party hosted prover)
- indexer
- token/custody support
- network ID `mainnet`
- transaction size limits
- DUST model (cNIGHT registration, ~12h, no faucet)
- proving key availability and hashes
- browser wallet behavior (1AM / Lace or successors)

Nothing goes to Mainnet until each row is a measured GREEN, not a blog claim.

**Failure/rollback.** Stay on Preprod. Do not migrate funds.

**Not claimed.** That Compact 0.31.1 artifacts can be reused on a ledger 9 chain without recompile.

### W3.2 Production custody

Separate:

| Lane | Wave 1 | Wave 3 |
|---|---|---|
| Native | tNIGHT unshielded | NIGHT unshielded, real value |
| Quote | REMIT-Q testnet mint | Official quote asset or protocol-supported shielded asset TBD |
| Contract-minted | faucet with daily cap | only if Mainnet policy allows, never called a stablecoin |

Evaluate shielded vs unshielded payouts using the matrix at gate time. Do not design unsupported contract-to-contract legs.

### W3.3 Mainnet key lifecycle

Verifier keys in-repo or hashed release. Prover artifacts on an operator release channel with integrity hashes. Reproducible Compact compile. Rollback version = previous proving key set + previous address. Operator key rotation and emergency revoke runbooks.

### W3.4 Mainnet privacy hardening

Fresh blinds, scoped nullifiers, audit purpose binding from Wave 2, metadata minimization, timing jitter (already `REMIT_AGENT_FILL_JITTER_MS`), selective disclosure lifecycle, participant rotation.

### W3.5 Executor marketplace

Multiple independent executors. Principal chooses a policy. Optional execution-quality attestations that do not reveal the book. Reputation, if any, is a proof about fills/revokes, not a marketing score.

**Not claimed.** A liquid marketplace on day one of Mainnet.

### W3.6 Venue federation

Only when officially supported. Compact 0.34 cross-contract calls are **out of scope** until Mainnet ledger 9 exists and the gate says go. Until then, venues are separate pools with policy routing off-chain.

### W3.7 Mainnet observability

Public: `fills`, `activeMandates`, `openOffers`, `auditRoots`, tx hashes, blocks. Private: openings, prices, sizes, `chosenIndex`, identities. Enough to verify solvency of notes and integrity of receipts. Not a public matching tape.

### W3.8 Operational model

Deployment authority, upgrade = new address, incident response, privacy incident response (assume ciphertext leak still requires rotation), proof-server ops (local, pinned 8.1.x or gated successor), key custody, backup of ciphertext only, rate limits, audit logs without private payloads.

### W3.9 Business expansion

Institutions, algorithmic execution inside mandates, private OTC, treasury execution, delegated corporate trading, private RFQ infrastructure. Same circuit family.

### W3.10 Mainnet completion criteria

| Check | GREEN means |
|---|---|
| Gate matrix | All components experimentally verified |
| Deploy | Pool + quote-or-native lanes on `mainnet` |
| Fill | Indexer-confirmed `fill` SUCCESS, 0 public openings |
| Residual | Leftover consume SUCCESS |
| Audit | One authorized field verifies; forged fails |
| Revoke | `revokeMandate` SUCCESS; post-revoke fill rejects |
| Withdraw | Owner withdraw SUCCESS with encoded recipient |
| Privacy | Public JSON leak scan empty |
| Keys | Prover/verifier hashes published |
| Ops | Runbook drill completed |

Until that table is GREEN, Wave 3 is not complete.

---

## Highest-leverage future extensions

Only mechanisms that make REMIT more defensible and sit on the existing architecture.

### A. Provable best-compliant execution

- **Value.** Closes executor discretion inside the K-set.
- **Design.** Strengthen `fill` so a worse eligible slot cannot satisfy the proof.
- **Privacy.** No extra public outputs.
- **Risk.** Larger `fill` prover (already 145MB class).
- **Proof cost.** High. Recompile + new keys.
- **Wave.** 2.1, then 3 if keys change.
- **Acceptance.** Adversarial worse-eligible Compact-rejects.

### B. Purpose-bound selective audit

- **Value.** Compliance without the book.
- **Design.** Purpose id + field set + expiry in the disclosure package bound to `auditRoot`.
- **Privacy.** Receipts are not transferable across purposes.
- **Risk.** Over-wide field sets.
- **Proof cost.** Moderate if `auditRootOf` grows.
- **Wave.** 2.4
- **Acceptance.** Extra field and expired purpose fail.

### C. Multi-executor delegation

- **Value.** Principal does not bind to one operator forever.
- **Design.** Executor key per mandate; revoke + successor.
- **Privacy.** Successor unlinkable from predecessor openings.
- **Risk.** UX confusion; accidental public labels.
- **Proof cost.** Low if no new impure circuit.
- **Wave.** 2.3, marketplace in 3.5
- **Acceptance.** Post-revoke fill rejects; successor fills.

### D. Unlinkable liquidity discovery

- **Value.** Repeat makers harder to cluster.
- **Design.** Epoch blinds; no stable public maker tag.
- **Privacy.** Correlation resistance.
- **Risk.** Operations complexity.
- **Proof cost.** Low.
- **Wave.** 2.2
- **Acceptance.** Correlation tests GREEN.

### E. Private execution reputation

- **Value.** Choose executors without a public tape.
- **Design.** Attestations over fill receipts and revoke counts, not prices.
- **Privacy.** No book leakage.
- **Risk.** Unverifiable scores. Forbidden unless Compact-backed.
- **Proof cost.** Medium.
- **Wave.** 3.5
- **Acceptance.** Attestation verifies against public counters only.

### F. Institutional policy templates

- **Value.** Faster mandates, fewer mis-set caps.
- **Design.** Off-chain templates onto existing fields.
- **Privacy.** No public template id on-chain.
- **Risk.** Template drift vs Compact.
- **Proof cost.** None.
- **Wave.** 2.6
- **Acceptance.** Template fill == hand-built fill.

### G. Private strategy simulation before authorization

- **Value.** Principal sees reject/fill locally before sealing.
- **Design.** Compact sim (`packages/core` sim) on private openings.
- **Privacy.** Simulation stays in the tab vault.
- **Risk.** Sim/circuit divergence.
- **Proof cost.** None on-chain.
- **Wave.** 2.7
- **Acceptance.** Sim reject implies Compact reject in tests.

### H. Mainnet-native custody lanes

- **Value.** Real-value settlement.
- **Design.** Gate-selected native/shielded assets. No REMIT-Q-as-stablecoin.
- **Privacy.** Same fill public shape.
- **Risk.** Real funds. DUST registration delay.
- **Proof cost.** Redeploy.
- **Wave.** 3.2
- **Acceptance.** Mainnet fill SUCCESS.

### I. Privacy-preserving execution analytics

- **Value.** Operators see health without openings.
- **Design.** Counters, latency, reject codes. No prices.
- **Privacy.** Metrics are public-safe by construction.
- **Risk.** Timing side channels.
- **Proof cost.** None.
- **Wave.** 2.12 / 3.7
- **Acceptance.** Metric JSON passes leak scan.

### J. Multi-venue policy routing

- **Value.** One mandate policy, several pools.
- **Design.** Off-chain routing until official cross-contract exists.
- **Privacy.** Venue choice not published as a matching tape.
- **Risk.** Premature C2C.
- **Proof cost.** None until ledger 9 gate.
- **Wave.** 3.6
- **Acceptance.** Two pools, one principal policy, no C2C.

---

## Explicitly out of scope

- Global-book best execution
- MPC matching
- Calling REMIT-Q a stablecoin
- Hosted third-party proof-server for user witnesses
- Compact 0.34 / ledger 9 without a Wave 3 gate
- Contract-to-contract marketplace designs this generation
- Invented withdrawal transaction hashes
- Side-by-side project comparisons in any public document
