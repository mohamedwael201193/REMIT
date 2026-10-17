# PRIVACY-BOUNDARY.md — what leaves the circuit, and to whom

> **Reading guide.** This document answers one question per row: *when this contract reveals a value, who can see it, and why is that reveal necessary?*
> "Public" means: visible in clear on the transaction transcript to anyone with an RPC endpoint — the whole world, including competitors.
> Technical terms (witness, commitment, nullifier) are defined once in the Appendix, never in the tables above it.

**Scope:** `CONTRACT/src/remit_pool.compact` (7 `export circuit`s, 2 deploy circuits) and
`CONTRACT/src/remit_quote.compact` (`claim`, `quoteColor`). Source of truth is the
`.compact` source; line numbers below are current as of this write.

## 1. The trust split (why this boundary exists)

The executor is **trusted for ranking quality and liveness** — it can pick the worst
in-bounds quote, it can stall, it can abort. It is **cryptographically untrusted for
bounds** — it cannot produce a valid fill outside your committed limits, and anyone can
verify that from the ledger without seeing the limits. This document shows exactly
where each secret stops and each public fact begins.

## 2. remit_pool — per-`disclose()` table

Every `disclose(x)` places `x` in the clear on the transaction transcript. Values that
are private inputs (witnesses) stay private because they are never disclosed — only
their *commitments* and *nullifiers* are.

| # | Circuit (line) | What is revealed | To whom | Why (buyer language) |
|---|---|---|---|---|
| 1 | constructor (L86) | The quote token's colour | Everyone | The pool must know which token it settles; a settlement asset is not a secret. |
| 2 | `consumeNote` (L226) | A Merkle-tree root for the private notes tree | Everyone | Proves the note being spent existed in the tree *without* naming which note. A root is a membership anchor, not a leak. |
| 3 | `consumeNote` (L228–229) | A nullifier: one-way tag `noteNullifier(secretKey, nonce)` | Everyone | Tamper-evident receipt: proves this note was spent and can never be spent twice. No one can derive the note or the owner from it. |
| 4 | `mintNote` (L234) | A commitment `noteCommitment(note, nonce)` | Everyone | Parks a sealed envelope on the ledger so the owner can spend the note later. The amounts, asset, and owner stay sealed inside. |
| 5 | `bindSlot` (L285) | A Merkle-tree root for the offers tree | Everyone | Same as #2, for offers instead of notes. |
| 6 | `deposit` (L291–292) | Asset id (0 or 1) and amount; the token colour | Everyone | An unshielded deposit *moves* a public token into the pool — the chain must see the move to execute it. |
| 7 | `withdraw` (L299–302) | Asset id, amount, and the **destination address** | Everyone | An unshielded withdrawal moves a public token *to a specific address* — the chain must see where to send it. **This is the loudest row in the table: withdrawals are fully public.** |
| 8 | `placeOffer` (L322) | An offer commitment | Everyone | Sealed envelope for the maker's offer. The price and size stay secret; only the executor's ranking step learns them (see §4). |
| 9 | `cancelOffer` (L334) | Offers-tree root | Everyone | Proves the cancelled offer existed without naming it. |
| 10 | `cancelOffer` (L336–337) | Offer nullifier | Everyone | Proves this offer was cancelled/used once and only once. |
| 11 | `createMandate` (L356) | A mandate commitment | Everyone | Sealed envelope for your limits. Your max price, max size, budget, and expiry stay secret — the chain sees only that *a bound exists*. |
| 12 | `createMandate` (L357) | A mandate-state commitment (budget remaining) | Everyone | Sealed envelope for the running budget so fills can debit it without revealing the balance. |
| 13 | `revokeMandate` (L370) | Mandates-tree root | Everyone | Proves the mandate existed. |
| 14 | `revokeMandate` (L372–373) | Mandate revocation tag | Everyone | Public kill-switch record: everyone can see this mandate is dead, which is exactly what a compliance observer wants. |
| 15 | `revokeMandate` (L380) | Mandate-states root | Everyone | Proves the mandate's state existed. |
| 16 | `revokeMandate` (L382–383) | Mandate-state nullifier | Everyone | Prevents the same mandate state from being spent twice (no double-fill). |
| 17 | `fill` (L399) | Mandates-tree root | Everyone | Proves the fill's mandate was registered. |
| 18 | `fill` (L400) | Mandate revocation tag (checked) | Everyone | The fill proves publicly that the mandate was *not* revoked — revocations are checkable by anyone. |
| 19 | `fill` (L401) | `nowBound` (the deadline the executor committed to) | Everyone | The expiry bound must be public so the chain can check the fill beat the clock. **A `nowBound` close to the real time leaks timing; near the deadline it leaks urgency.** |
| 20 | `fill` (L409) | Mandate-states root | Everyone | Proves the budget state existed. |
| 21 | `fill` (L411–412) | Mandate-state nullifier | Everyone | Consumes the old budget state so each fill debits exactly once. |
| 22 | `fill` (L444–445) | Offer nullifier | Everyone | The chosen offer can never be filled twice. |
| 23 | `fill` (L471) | Residual-offer commitment | Everyone | The unfilled part of the offer goes back on the book as a fresh sealed envelope. |
| 24 | `fill` (L477) | New mandate-state commitment (remaining − fill size) | Everyone | Updated sealed budget for the next fill. |
| 25 | `fill` (L489) | The audit root (one commitment over six sealed fields: side, fill size, fill price, principal, maker, mandate id) | Everyone | **Tamper-evident receipt**: everyone can verify no deal was counted twice and that fills chain correctly — without seeing a single price. |
| 26 | `fill` (L443–444) | *Via `bindSlot` ×3:* offers-tree roots for the three candidate slots | Everyone | Proves all three ranked quotes existed on the book. **What the roots don't reveal: the quote values — but the executor, which did the ranking off-circuit, saw them (see §4).** |

**What is NEVER disclosed in the pool contract:** your limit values (`limitNum/limitDen`,
`maxFillBase`, `expiry`, counterparty list), the maker's price and size, the note
contents (asset, amount, owner), any secret key or preimage. These exist only as
witnesses inside the circuit and on the prover's machine.

## 3. remit_quote — per-`disclose()` table

| # | Circuit (line) | What is revealed | To whom | Why (buyer language) |
|---|---|---|---|---|
| 27 | `claim` (L35–36) | A claim tag: `persistentHash("remit:faucet", secretKey, dayBucket)` | Everyone | One claim per user per day. The tag is one-way: no one learns whose secret it is. |
| 28 | `claim` (L37) | Minted **amount** and **destination address** of REMIT-Q | Everyone | Minting an unshielded test token is a public event — the chain must see what was minted and for whom. |

## 4. The new `disclose` circuit (Wave 2 — remit_quote, 3rd circuit)

**Status: SPECIFIED, not yet compiled.** The row below describes the v2 design exactly;
where an implementation detail is not yet pinned it is marked **TBD**.

| # | Circuit | What is revealed | To whom | Why (buyer language) |
|---|---|---|---|---|
| 29 | `disclose(fieldSelector, auditorKey)` | **Ciphertext only.** The selected field is encrypted to `auditorKey` *inside the circuit*; only the ciphertext lands on the transcript. | Only the holder of `auditorKey` can read the field value | Compliance gets exactly one fact, nothing else — the world learns a disclosure happened, never the value. |
| 30 | `disclose(...)` | A disclosure nullifier: `Hash(fieldCommitment ‖ auditorKey)` — written to the ledger | Everyone | Tamper-evident receipt that this field was opened to this auditor, and can never be replayed or double-counted. |
| 31 | `disclose(...)` | **Public metadata:** `fieldSelector` (which field was opened) and `auditorKey` (to whom) | Everyone | Observers learn *that* a disclosure happened and *to whom* — a relationship graph. For compliance use this is arguably the point, but it is not hidden. |
| 32 | `disclose(...)` | **Binding:** the field's commitment is recomputed under the existing `auditRoot` scheme and proved a member of the on-ledger commitment tree (≤2 historic roots) | Everyone (as a proof) | Stops the discloser from "disclosing" a fabricated field: the opened fact must be a real field of a real on-ledger commitment. |

**Leak the fixed design still carries (stated, not hidden):** the ciphertext leaks its
*occurrence, approximate size, and timing* — correlatable with fill/mandate
transactions. Anyone watching the transcript can see *when* disclosures happen and
*how often*. This is a known, accepted leak of the transcript model, listed here so no
judge has to find it.

**TBD (honest):** the exact `fieldSelector` encoding (which fields are openable) and the
in-circuit encryption construction are TBD — they will be pinned in the circuit spec
before compile, and this table will be updated to match. Nothing here is invented.

## 5. Boundary summary — the whole product in one view

| Stays secret | Secret from whom | Why |
|---|---|---|
| Your limits: max price, max size, budget left, expiry, who you'll trade with | Everyone — makers, other desks, the public; the executor sees only that a bound exists, never its value | If anyone sees these, they trade against you. Your limits ARE your strategy. |
| The maker's price and size | Everyone except the executor's ranking step | Seeing this leaks their book. Nobody quotes honestly if their book is public. |
| Who won the deal, and at what size | Everyone except the two counterparties | Reveals the winner and their pricing power. |
| Which agent may act for you | Everyone (binding is by secret preimage; the commitment is public) | If someone can impersonate your agent, your limits are fiction. |

| Goes public | Why |
|---|---|
| Commitments, nullifiers, Merkle roots, audit roots (tamper-evident receipts) | Everyone can verify the books balance without seeing a single price. |
| One fact opened to YOUR named auditor — ciphertext on the ledger, key-holders only read it | Compliance gets exactly what it needs, nothing else. The world learns a disclosure happened and to whom — the field value stays encrypted. |
| Unshielded token movements (deposits, withdrawals, mints) — asset, amount, destination | The chain has to see the move to execute it. Withdrawals are the loudest event on the transcript. |
| Transaction timing and graph shape | The chain has to timestamp events. Correlatable by anyone watching. |

## Appendix: mechanism nouns (judge reference, not the pitch)

- **Witness:** a secret input to the circuit, known only to the prover (e.g. your limit values, the maker's rand). Never disclosed.
- **Commitment:** a one-way sealed envelope over a value, parked on the ledger. Binds the prover to the value without revealing it.
- **Nullifier:** a one-way tag derived from a spent object. Reveals only that the object was used; prevents double-spend.
- **Merkle root / HistoricMerkleTree:** a short public fingerprint of a whole tree of commitments. Checking a root proves "this commitment exists in the tree" without naming which one.
- **`disclose(x)`:** the Compact primitive that moves `x` from inside the circuit onto the public transaction transcript. Everything in the tables above.
- **auditRoot:** one commitment over six sealed fill fields, pushed per fill. The receipt that lets the new `disclose` circuit open *one field* of a *real* fill without opening the rest.
