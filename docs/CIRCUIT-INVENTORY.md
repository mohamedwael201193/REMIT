# CIRCUIT INVENTORY — Wave 2 N7 `proof:false` audit

**Method (inventory-first, not cargo-cult):** every row below is grounded in the compiler's
own output — `CONTRACT/managed/<name>/compiler/contract-info.json` (compactc 0.31.1,
language 0.23, full-ZK, no `--skip-zk`) — cross-checked against
`CONTRACT/src/remit_pool.compact` and `CONTRACT/src/remit_quote.compact`.
The `proof` flag in contract-info.json is the compiler's verdict on whether it will
generate a proof for the circuit. NightHire was DQ'd in Wave 1 because circuits
the compiler silently marked `proof:false` were still presented as "proven".

**Rule applied:** a circuit counts as PROVING only if the compiler says
`pure: false` AND `proof: true`. Every PROVING circuit names its ledger-write
boundary below. PURE/VIEW circuits (`proof: false`) carry an explicit exemption
instead of a ritual `sequence.increment(1)`.

**Status:** 2026-10-17. `disclose` (Wave 2 N1, CONTRACT-1's circuit) is NOT yet in
the contract sources at inventory time — its expected row is marked PENDING with
the exact acceptance condition.

---

## 1. `remit_pool` — 7 PROVING circuits, 22 PURE/VIEW circuits

Ledger: `notes`, `noteNullifiers`, `offers`, `offerNullifiers`, `mandates`,
`mandateRevoked`, `mandateStates`, `mandateStateNullifiers` (HistoricMerkleTree/Set),
`auditRoots` (List), `openOffers`, `activeMandates`, `fills` (Counter),
`quoteColor` (sealed Cell).

### 1a. PROVING circuits — all `proof: true`, all have a ledger-write boundary

| Circuit | Compiler verdict | Ledger-write boundary (named) | What the boundary writes |
|---|---|---|---|
| `deposit` | `proof: true` | `notes.insert(noteCommitment(...))` via `mintNote` | new note commitment (unspent note exists) |
| `withdraw` | `proof: true` | `noteNullifiers.insert(noteNullifier(sk, nonce))` via `consumeNote` + `notes.insert(...)` via `mintNote` (change) | note marked spent; change note committed |
| `placeOffer` | `proof: true` | `offers.insert(offerCommitment(o, rand))` + `openOffers.increment(1)` (via `consumeNote`/`mintNote` also `noteNullifiers.insert`/`notes.insert`) | offer commitment published; open-offer count up |
| `cancelOffer` | `proof: true` | `offerNullifiers.insert(offerNullifier(c))` + `openOffers.decrement(1)` (escrow returned via `mintNote` → `notes.insert`) | offer marked used; open-offer count down |
| `createMandate` | `proof: true` | `mandates.insert(mandateCommitment(m, rand))` + `mandateStates.insert(mandateStateCommitment(...))` + `activeMandates.increment(1)` | mandate + initial state committed; active-mandate count up |
| `revokeMandate` | `proof: true` | `mandateRevoked.insert(mandateRevocationTag(...))` + `mandateStateNullifiers.insert(mandateStateNullifier(...))` + `activeMandates.decrement(1)` (+ residual escrow `notes.insert`) | mandate revoked; consumed state nullified; count down |
| `fill` | `proof: true` | `mandateStateNullifiers.insert(snul)` + `offerNullifiers.insert(onul)` + `offers.insert(residual commit)` + `notes.insert(...)` ×2 (payouts) + `mandateStates.insert(next state)` + `auditRoots.pushFront(auditRootOf(cs))` + `fills.increment(1)` | state+offer consumed; residual re-listed; payouts committed; audit root appended; fill counted |

**pool proof:false risk: NONE.** Every exported impure circuit is `proof: true` with a
real ledger write.

### 1b. PURE/VIEW circuits — all `proof: false`, explicitly exempted

| Circuit | Why it is genuinely pure (exemption) |
|---|---|
| `ownerKey`, `executorKey` | `persistentHash` key derivation; no state. Callers use `pureCircuits` locally or inside proofs — no proof of their own needed. |
| `escrowKey` | `persistentHash` derivation from mandateId; no state. |
| `noteCommitment`, `offerCommitment`, `mandateCommitment`, `mandateStateCommitment` | `persistentCommit` — pure hash of the commitment value; the PROVING circuit does the ledger write of the result. |
| `noteNullifier`, `offerNullifier`, `mandateStateNullifier`, `mandateRevocationTag` | `persistentHash` nullifier tags; the PROVING circuit does the ledger `insert`. |
| `fieldSalt`, `auditRootOf` | `persistentHash`/`persistentCommit` helpers; `auditRootOf` is materialized on-ledger only by `fill`'s `auditRoots.pushFront`. |
| `priceAtLeast`, `priceAtMost`, `minU64`, `bytesLt`, `fillableBaseOf`, `betterPrice`, `samePrice` | division-free pure arithmetic/comparisons (Compact has no division); called inside `fill`'s proof and via `pureCircuits` in tests. |
| `residualPayNonceOf`, `residualRandOf` | `persistentHash` derivation for the residual offer in `fill`. |

Exemption rationale (uniform): these circuits read no ledger and write no ledger;
their only consumers are (a) PROVING circuits, which carry their own proof, and
(b) local `pureCircuits` evaluation, which by definition is not a proof. Adding a
ledger write to any of them would be cargo-cult proving and would cost a verifier
key each.

### 1c. Non-exported internal circuits (no verifier key, not callable externally)

`colorOf`, `consumeNote`, `mintNote`, `slotEligible`, `strictlyBetter`,
`notDominated`, `bindSlot` — plain (non-`export`) circuits inlined/compiled into the
7 PROVING circuits above. They do not appear in contract-info.json, have no
verifier keys, and inherit the caller's proof. No separate audit needed.

---

## 2. `remit_quote` — 2 PROVING circuits, 1 PURE/VIEW circuit

Ledger: `minted` (Counter), `claims` (Set<Bytes<32>>).

| Circuit | Classification | Compiler verdict | Boundary / exemption |
|---|---|---|---|
| `claimTag` | PURE/VIEW | `pure: true`, `proof: false` | **Exempt.** `persistentHash` of `[pad(32,"remit:faucet"), sk, dayBucket]`; used by `claim` and by local callers via `pureCircuits`. No ledger touched, by design. |
| `quoteColor` | PROVING | `pure: false`, `proof: true` | **Edge case — read-only.** Compiler emits a proof (`quoteColor.verifier` exists) even though the circuit writes nothing; the statement binds the computed `tokenType(pad(32,"remit:quote"), kernel.self())` colour. No `proof:false` flag — the risk the compiler warns about does not apply. Documented here so a future edit that keeps it proof:true-but-stateless is caught by this audit. |
| `claim` | PROVING | `pure: false`, `proof: true` | `claims.insert(tag)` (per-bucket replay protection) + `mintUnshieldedToken(...)` + `minted.increment(1)`. |
| `disclose` | **PENDING (CONTRACT-1)** | must be `pure: false`, **`proof: true`** | **Acceptance boundary:** `disclosures.insert(Hash(commitment ‖ auditorKey))`. If the final circuit does not perform this (or any) ledger write, the compiler will silently mark it `proof:false` — the exact NightHire failure mode — and this inventory fails the circuit at review time. The boundary doubles as replay protection: re-running the same `(field, auditor)` disclosure reverts on the Set membership check. |

**quote proof:false risk: NONE today.** The only `proof:false` circuit is `claimTag`,
genuinely pure.

### 2a. `disclose` naming-collision risk (flagged for CONTRACT-1, not a circuit change)

The v2 spec names the new circuit `disclose`. The file already calls the Compact
builtin `disclose()` three times (`claim`: `disclose(tag)`, `disclose(amount)`,
`disclose(to)`). A circuit named `disclose` in the same module shadows the builtin
— this is a compile-time hazard. Recommendation to CONTRACT-1: keep the public
name `disclose` only if the compiler accepts it without shadowing; otherwise rename
the circuit (e.g. `discloseField`) and document the mapping. The witness names in
`packages/core/src/quote-witnesses.ts` (`discloseField`, `discloseBlinding`,
`discloseSeed`, `discloseCommitPath`) are CONTRACT-1-agnostic and follow the repo
pattern either way.

---

## 3. Per-`disclose()` audit table — what is revealed, to whom, why

Spec: Wave 2 N1 v2 (Jay fix J1/J2). The field is encrypted to `auditorKey`
IN-CIRCUIT; only ciphertext is disclosed. `fieldSelector`/`auditorKey` are public
metadata. (This table is the technical version; the buyer-language version lives in
the README per the plan. The docs worker owns PRIVACY-BOUNDARY.md — this section is
the N7-mandated per-disclose() record and stays in this file.)

| # | Revealed | To whom | Why |
|---|---|---|---|
| 1 | **Ciphertext** of the selected field, encrypted to `auditorKey` in-circuit | Everyone sees the ciphertext bytes; only the auditor (holder of the key) can read the value | The auditor gets exactly the one fact they need; the world sees a disclosure happened but learns nothing about the value |
| 2 | **Field commitment** recomputed under the `auditRoot` scheme (`persistentCommit` per `fieldSalt(seed, idx)`, aggregated per `auditRootOf`) | Everyone (public input to the proof) | Binds the disclosed value to the commitment the principal originally made — a forged or invented field cannot pass |
| 3 | **Merkle membership** of the field commitment vs the on-ledger commitment tree (≤2 historic roots, NightPool budget rule) | Everyone (public proof statement) | Proves the commitment is genuinely on-ledger, not conjured; ≤2 roots keeps the indexer from panicking |
| 4 | **Disclosure nullifier** `Hash(commitment ‖ auditorKey)` → written to the `disclosures` ledger set | Everyone (ledger write) | Kills replayed disclosure of the same (field, auditor) pair — and is the ledger-write boundary that keeps the compiler generating proofs (the `proof:false` fix) |
| 5 | **`fieldSelector`**, **`auditorKey`** | Everyone (public circuit arguments) | Metadata identifying which field and which auditor; documented as public by the v2 spec. `auditorKey` is a key, not an identity — key distribution is off-chain (non-claim #5, HONEST-LIMITS.md) |

**Stays secret (never disclosed):** the field plaintext, the blinding, the session
seed. The commitment and ciphertext reveal nothing about them.

**Secret FROM WHOM:** the field value is secret from makers, other desks, the
public, and the executor — from everyone except the named auditor, who recovers it
by decrypting the ciphertext off-chain. A stale mandate's field discloses as cleanly
as a live one (non-claim #4) — the circuit proves the field matches the commitment,
not that the mandate is fresh.

---

## 4. Audit verdict

- remit_pool: 7/7 PROVING circuits `proof: true` with named ledger-write
  boundaries. 22 PURE circuits legitimately `proof: false` with explicit exemptions.
- remit_quote: `claimTag` legitimately pure; `quoteColor` read-only but `proof: true`
  (documented edge); `claim` `proof: true` with three boundaries.
- **Current `proof:false` risk: NONE.** No circuit is presented as proven while the
  compiler skips its proof.
- Open items (not circuit changes — handoffs): CONTRACT-1's `disclose` must ship
  with the `disclosures.insert` boundary or this audit fails it; the
  `disclose`-name/builtin shadowing hazard needs a compile-time ruling; the four
  witness declarations in `remit_quote.compact` must match
  `packages/core/src/quote-witnesses.ts` before the managed artifacts regen.

*Source hashes (contract-info.json): pool + quote read 2026-10-17 from
`CONTRACT/managed/*/compiler/contract-info.json`, compactc 0.31.1 / lang 0.23 /
runtime 0.16.0.*
