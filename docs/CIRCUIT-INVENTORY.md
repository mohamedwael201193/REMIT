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

**Status:** 2026-10-17 (updated post-CONTRACT-1). `discloseField` (Wave 2 N1) IS in
`CONTRACT/src/remit_quote.compact` — implemented, compiled clean under `--skip-zk`
(compactc 0.31.1, language 0.23); `contract-info.json` shows `discloseField`
`proof: true` and the ledger gains `disclosureNullifiers: Set<Bytes<32>>`. Full-ZK
compile + verifier-key byte measurement are CLOSED (Gate N2, 2026-10-17):
10/10 circuits compiled, all verifier keys exactly 2119 B — see
docs/COMPILE-PROOF.md for the full measurement table.

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

## 2. `remit_quote` — 3 PROVING circuits, 1 PURE/VIEW circuit

Ledger: `minted` (Counter), `claims` (Set<Bytes<32>>).

| Circuit | Classification | Compiler verdict | Boundary / exemption |
|---|---|---|---|
| `claimTag` | PURE/VIEW | `pure: true`, `proof: false` | **Exempt.** `persistentHash` of `[pad(32,"remit:faucet"), sk, dayBucket]`; used by `claim` and by local callers via `pureCircuits`. No ledger touched, by design. |
| `quoteColor` | PROVING | `pure: false`, `proof: true` | **Edge case — read-only.** Compiler emits a proof (`quoteColor.verifier` exists) even though the circuit writes nothing; the statement binds the computed `tokenType(pad(32,"remit:quote"), kernel.self())` colour. No `proof:false` flag — the risk the compiler warns about does not apply. Documented here so a future edit that keeps it proof:true-but-stateless is caught by this audit. |
| `claim` | PROVING | `pure: false`, `proof: true` | `claims.insert(tag)` (per-bucket replay protection) + `mintUnshieldedToken(...)` + `minted.increment(1)`. |
| `discloseField` | **IMPLEMENTED (CONTRACT-1)** | `pure: false`, **`proof: true`** | **Boundary met:** `disclosureNullifiers.insert(persistentHash(pad(32,"remit:dnull"), commitment, auditorKey))`. The boundary doubles as replay protection: re-running the same `(field, auditor)` disclosure reverts on the Set membership check. The NightHire `proof:false` failure mode is avoided by construction. |

**quote proof:false risk: NONE today.** The only `proof:false` circuit is `claimTag`,
genuinely pure.

### 2a. `disclose` naming-collision risk — RESOLVED by CONTRACT-1 (rename, final)

The v2 spec's `disclose` name failed at parse time: `disclose` is a RESERVED KEYWORD in
Compact 0.31.1 (`found keyword "disclose" looking for an identifier` — hard error, zero
tolerance). Rename mapping, final: v2-spec `disclose(fieldSelector, auditorKey)` →
`discloseField(fieldSelector, auditorKey, sealedBox)`. The three builtin `disclose(x)`
calls inside `claim` (`disclose(tag)`, `disclose(amount)`, `disclose(to)`) are untouched.
The witness names in `packages/core/src/quote-witnesses.ts` (`discloseField`,
`discloseBlinding`, `discloseSeed`, `discloseCommitPath`) follow the repo pattern either way.

---

## 3. Per-`disclose()` audit table — what is revealed, to whom, why

Spec: CONTRACT-1's FINAL implementation (`discloseField`, compiled clean `--skip-zk`,
contract-info.json: `proof: true`, ledger += `disclosureNullifiers`).
**Honest hybrid:** NO in-circuit encryption exists in Compact 0.31.1. The field is
sealed OFF-circuit (RMTB1: X25519 + XChaCha20-Poly1305, `packages/core/src/box.ts`)
and passed in as an opaque `sealedBox: Bytes<160>`; the circuit does authorization +
binding + anti-replay. `fieldSelector`/`auditorKey` are public metadata.
(This table is the technical version; the buyer-language version lives in
docs/PRIVACY-BOUNDARY.md §4. The `disclose(x)` references here are the Compact builtin
primitive, which the circuit still calls to publish the values below.)

| # | Revealed | To whom | Why |
|---|---|---|---|
| 1 | **Sealed box** — the selected field's `value ‖ salt`, sealed off-circuit (RMTB1) and passed in as opaque `Bytes<160>` | Everyone sees the bytes on the transcript; only the auditor (holder of `auditorKey`) can decrypt and read the value | The auditor gets exactly the one fact they need; the world sees a disclosure happened but learns nothing about the value. The salt stays sealed — `side` is brute-forceable if public |
| 2 | **Field commitment + audit root** recomputed IN-CIRCUIT: all six commitments via the pool fill's `persistentCommit`/field-salt scheme, aggregated per `auditRootOf`; the circuit discloses the field commitment and the root VALUE | Everyone (public circuit outputs, bound by the proof) | Binds the disclosure to the exact root value; a fabricated field cannot match the in-circuit recomputation |
| 3 | **Root-list presence — OFF-CHAIN-VERIFIABLE ONLY (non-claim).** The pool's `auditRoots` is `List<Bytes<32>>`, not a Merkle tree; no tree exists on either ledger to prove membership against, and ledger 8 has no cross-contract reads. The circuit discloses the root VALUE; presence in the pool's list is checked via RPC read | Everyone (the root value, on-transcript) | Honest boundary: no Merkle-membership proof is claimed where no tree exists |
| 4 | **Disclosure nullifier** `persistentHash(pad(32,"remit:dnull"), commitment, auditorKey)` → written to the new `disclosureNullifiers` ledger set | Everyone (ledger write) | Kills replayed disclosure of the same (field, auditor) pair — and is the ledger-write boundary that keeps the compiler generating proofs (the `proof:false` fix) |
| 5 | **`fieldSelector`** (`Uint<8>`, asserted `< 6`: side, fill size, fill price, principal, maker, mandate id), **`auditorKey`** | Everyone (public circuit arguments) | Metadata identifying which field and which auditor; documented as public. `auditorKey` is a key, not an identity — key distribution is off-chain (non-claim #5, HONEST-LIMITS.md) |

**Stays secret (never disclosed):** the field plaintext (except to the auditor, via
the sealed box), the disclosure seed, the per-field salts. The commitment and sealed
box reveal nothing to non-auditors.

**Secret FROM WHOM:** the field value is secret from makers, other desks, the
public, and the executor — from everyone except the named auditor, who recovers it
by decrypting the sealed box off-chain. A stale mandate's field discloses as cleanly
as a live one (non-claim #4) — the circuit proves the field matches the commitment,
not that the mandate is fresh.

**Dishonesty story (detect, not prevent):** the circuit cannot see inside the sealed
box, so a discloser *can* publish a dishonest one. Detection is off-chain and
evidentiary: the auditor decrypts → `(value, salt)` → recomputes `persistentCommit` →
compares to the on-ledger disclosed commitment. Mismatch = caught, with the
commitment, box, and nullifier already on the ledger.

---

## 4. Audit verdict

- remit_pool: 7/7 PROVING circuits `proof: true` with named ledger-write
  boundaries. 22 PURE circuits legitimately `proof: false` with explicit exemptions.
- remit_quote: `claimTag` legitimately pure; `quoteColor` read-only but `proof: true`
  (documented edge); `claim` `proof: true` with three boundaries; `discloseField`
  `proof: true` with one boundary (`disclosureNullifiers.insert`).
- **Current `proof:false` risk: NONE.** No circuit is presented as proven while the
  compiler skips its proof.
- Closed gates (2026-10-17): full-ZK compile + verifier-key bytes (Gate N2 —
  docs/COMPILE-PROOF.md); simulator suite incl. ciphertext≠plaintext regression
  and refusal paths (wrong key, forged field, replayed disclosure) (Gate N3 —
  disclose-sim 7/7, disclose-refusal 7/7, c4-disclose-smoke 5/5, disclose-leak 5/5);
  binding-sync check between the inlined field-salt scheme and the pool's scheme
  (N3 — assertCircuitBindingsSynced in packages/core/src/tx.ts); witness
  declarations in `remit_quote.compact` match `packages/core/src/quote-witnesses.ts`
  (CONTRACT-2/CONTRACT-4).
- Still open (not circuit changes): root provenance via off-chain RPC
  (documented non-claim — pool auditRoots is a List, presence verifiable
  off-chain only); fresh Preprod deploy of the quote contract (gated on DUST
  wallet sync).
  cross-check vs pool `auditRoots` (explicit non-claim — no cross-contract reads on
  ledger 8).

*Source hashes (contract-info.json): pool + quote read 2026-10-17 from
`CONTRACT/managed/*/compiler/contract-info.json`, compactc 0.31.1 / lang 0.23 /
runtime 0.16.0.*
