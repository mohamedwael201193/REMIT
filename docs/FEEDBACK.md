# FEEDBACK — Wave-1 loss reasons → Wave-2 fix ledger

> **DRAFT (2026-10-17).** Resubmission rule: "meaningful new progress" is required — a mere copy is ineligible. Every Wave-1 loss reason below maps to the exact commit (or evidence) that fixes it. **Status rule: a row is not done until it names a real commit SHA or real explorer-linked evidence.** Items that are specified but unshipped are **[PENDING]**. Items with no fix possible today say **"not fixed this wave"** — no fabrication, ever.
>
> Baseline: `origin/main` newest commit is `4928aa7` (2026-09-15) — **zero Wave-2 commits have landed yet**. This ledger finalizes at code-freeze.
>
> Correction history: the original Wave-1 audit listed "no demo video" as loss reason #1. That reason is **WITHDRAWN (2026-10-17)** — the Wave-1 submission entry does contain a real demo video (`youtu.be/mb_GpcffqUs`), a live app, and a deck. The corrected loss profile (4 reasons) is the audit correction addendum; the ledger tracks those four.

## The ledger

| # | Wave-1 loss reason (corrected 2026-10-17) | Wave-2 fix | Fix commit | Judge hit(s) answered | Status |
|---|---|---|---|---|---|
| 1 | **Jargon-dense pitch (Communication).** The video existed, but the pitch was "mandate-bound dark RFQ desk", "MBBE K=3", "RMTB1 RFQ boxes". Winners pitched one plain sentence. | Constraint-led one-liner (no "AI" in the headline), tagline "The agent can choose. It cannot exceed.", killer-question line (what the executor sees vs what's secret), buyer-language privacy table with secret-*from-whom* per row; video re-recorded ≤4 min with audio commentary, mission in the first 30 seconds, zero jargon on screen; real PDF deck; `midnightntwrk` GitHub topic verified set. | — | jkato R1, R2, R5, R6 · Taro T7 | **[PENDING]** — pitch copy + N9 video/deck |
| 2 | **Second-order privacy-necessity + crowded payments theme (Product/Vision).** "Hide the book / mandate terms" competes in the same domain pile-up Junya flagged ("many submissions in the same domain, on the same theme, solving the same problem"). | The `discloseField` circuit (v2 spec's `disclose`, renamed — `disclose` is a Compact reserved keyword) makes "which parts require privacy" executable code, not a claim; "why not a server" rewritten as the trust split (executor trusted for ranking/liveness, cryptographically untrusted for bounds); commercial privacy sentence with a cost (competing dealers shading quotes on leaked flow — bps per fill on real weekly flow); uniqueness line owning the crowded domain ("Nobody else proved an agent stayed inside someone else's limits and let an auditor check one fact without seeing the book"). | — | Jay J1–J3 · Taro T2, HIT 2 · jkato R8 | **[PENDING]** — N1 circuit + N6 docs |
| 3 | **The remittance story doesn't close.** REMIT-Q is explicitly NOT a stablecoin, NOT redeemable, testnet-only — honest, but a remittance product that cannot move real value has no adoption path. | Settlement asset NAMED: Preprod fills settle in REMIT-Q (testnet-only faucet token — not a stablecoin, not redeemable); the product's settlement leg is asset-agnostic; no token economics claimed; pitch reframed to what the product actually is. | — | Taro T6 | **[PENDING]** — honest reframing ships with docs. Real-value redeemability: **not fixed this wave** (Wave-3 gate item) |
| 4 | **Zero viability signals (BD).** Solo builder, no users/partners/GTM. Junya's bar: "serious about building a real product." | User zero = the founder's own flow (GYOTAK precedent — stated honestly, never as external traction); first-100 as a numbered wedge by type + channel; ONE first door: a Japanese enterprise piloting AI agents in procurement/treasury, sold to the compliance owner on provable agent governance (not the trader); the three-hop path is deleted. | — | Taro T1, T4, HIT 1, HIT 5 · jkato R4 | **[PENDING]** — plan stated as plan, never claimed as traction. Real traction, partners, LOIs: **not fixed this wave** (no fabricated users, partners, or LOIs — ever) |

## Judge-critique hit map (every required fix → its disposition)

### Jay (DevRel — technical gate)
- **J1** N1 spec rewrite: encrypt-to-`auditorKey` in-circuit, disclose ciphertext only (raw disclose = selective publication to the world) → **[PENDING]** N1 circuit
- **J2** N1 binding specified: field commitment recomputed under `auditRoot` scheme + Merkle-membership vs on-ledger commitment tree (≤2 historic roots) + disclosure nullifier `Hash(commitment || auditorKey)` as ledger-write boundary → **[PENDING]** N1 circuit
- **J3** "Why not a server" as trust split → **[PENDING]** docs
- **J5** N7 inventory-first: classify every circuit in both contracts proving vs pure/view; pure circuits get explicit exemptions → **[PENDING]** N7 audit
- **J7** Cite-or-cut: "200,000 B" removed; actual verifier-key bytes measured at Gate-D → **[PENDING]** N2
- **J8** Scope cuts: N5 → RPC-read verify page; this ledger folds N8 into the README changelog; deploy quote contract only → **[PENDING]**
- **J9** N3: ciphertext≠plaintext regression + binding-sync check after artifact regen → **[PENDING]** N3 tests
- **J10** Mock-risk rules: /verify elements labeled *linked* vs *verified*; "secrets on-chain: 0" counter killed → **[PENDING]** N5 + front
- **J5/J6** Zero Sep-2026 hashes in the changelog; undeployed-first-with-simulator as the honest fallback → **this changelog section (DRAFT)**
- **Correction (2026-10-17, CONTRACT-1 verification).** J1/J2's specified design (in-circuit encryption + Merkle membership) was superseded by evidence: Compact 0.31.1 has **no in-circuit encryption primitive** (standard library is hash-only), and the pool's `auditRoots` is a `List<Bytes<32>>` — no tree exists on either ledger to prove membership against. The final circuit is the documented hybrid `discloseField(fieldSelector, auditorKey, sealedBox)` — off-circuit RMTB1 seal (X25519 + XChaCha20-Poly1305), in-circuit authorization + binding + anti-replay, disclosed root VALUE, nullifier-bound replay protection; auditor dishonesty-detection is off-chain and evidentiary. The v2 spec name `disclose` was a Compact reserved keyword (parse-time hard error), hence the rename. J1/J2 dispositions stay **[PENDING]** until the N1 row names a real commit SHA per the status rule.

### Taro (Japan — product/BD)
- **T1** User zero + numbered first-100 wedge; no TAM language → **[PENDING]** docs (reason #4)
- **T2** Commercial privacy sentence with a cost: named adversary (competing dealers shading quotes on leaked flow), bps-per-fill math → **[PENDING]** docs (reason #2)
- **T3** Executor-choice hole: steering within bounds is **disclosed** as non-claim #2 (griefing within bounds is trusted, not proven) + trust tiers → **[PENDING]** HONEST-LIMITS.md
- **T4** Japan paragraph: one concrete door or cut → one door kept (reason #4)
- **T6** Settlement asset named → **[PENDING]** docs (reason #3)
- **T7** Video: mission in first 30 seconds, zero jargon on screen → **[PENDING]** N9 (reason #1)

### jkato (pitchability — the re-tell test)
- **R1** One-liner fixed: constraint leads, agent subordinated, "mandate"→"limits", no "AI" in the pitch headline → **[PENDING]** docs (reason #1)
- **R2** Killer-question one-liner (what the executor sees vs what's secret; how the circuit enforces the bound without exposing it) → **[PENDING]** docs (reason #1)
- **R3** "What changed" re-anchored: `discloseField` circuit + fresh Preprod txs + refusal tests are the heroes; executor explicitly labeled Wave-1 lineage → **this changelog section (DRAFT)**
- **R4** One door: Japanese enterprise piloting AI agents in procurement/treasury, sold to the compliance owner → **[PENDING]** docs (reason #4)
- **R5** Buyer-language privacy table in the README headline; technical table → appendix; "secret FROM WHOM" per row → **[PENDING]** docs (reason #2)
- **R6** Comm formalities: video-audio question answered in hour one; re-record ≤4 min; real PDF deck; `midnightntwrk` topic verified set → **[PENDING]** N9 (reason #1)
- **R7** This ledger: Wave-1 loss reason → exact fix commit; "not fixed this wave" where no commit exists → **this file (DRAFT)**
- **R8** Crowded domain owned: "Nobody else proved an agent stayed inside someone else's limits and let an auditor check one fact without seeing the book"; RFQ = demo venue, constraint = product → **[PENDING]** docs (reason #2)

## Honesty footer

- No commit SHA appears anywhere above because no Wave-2 commits exist yet. The moment this ledger names a SHA, that commit must exist on `origin/main` — named-but-unpushed SHAs do not count.
- No tx hash appears in the README "What changed since Wave 1" section until fresh Wave-2 Preprod transactions are truth-gated on RPC/explorer. Old (Sep-2026) hashes in the changelog would make the resubmission a mere copy — ineligible.
- "Not fixed this wave" is a confession, not a gap: the winners' pattern is stated limits, not covered ones.
