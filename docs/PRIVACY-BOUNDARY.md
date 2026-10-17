# PRIVACY-BOUNDARY.md — what stays hidden, who sees what, and why

> **Reading guide.** This document answers the buyer's question — *"which parts of
> this require privacy?"* — in commercial language first (§1–2), then proves every
> row with the exact on-chain disclosures the circuits make (§3–5). "Public" means:
> visible in clear on the transaction transcript to anyone with an RPC endpoint —
> the whole world, including your competitors.
> Technical terms (witness, commitment, nullifier) are defined once in the Appendix,
> never in the tables above it.

**Scope:** `CONTRACT/src/remit_pool.compact` (7 `export circuit`s) and
`CONTRACT/src/remit_quote.compact` (`quoteColor`, `claim`, `discloseField`).
Source of truth is the `.compact` source; line numbers below are current as of
this write.

## 1. The commercial answer — for the procurement / treasury officer

Your purchasing agent negotiates against professional counterparties. When those
counterparties learn your mandate — your limits, your urgency, your flow — they
shade their quotes and you pay wider spreads on every fill. That is a basis-point
cost on real volume, paid out of a real P&L, every week. Privacy here is not
ideology; it is the difference between your limits being *your strategy* and your
limits being *your counterparties' pricing input*.

The boundary REMIT draws is three-sided:

- **What the company hides from suppliers and the market:** the mandate terms
  (max price, max size, budget left, expiry, who you'll trade with), the makers'
  quotes, and who won at what size. If anyone sees these, they trade against you.
  Your limits ARE your strategy.
- **What the auditor / compliance owner sees:** exactly one fact at a time,
  encrypted to their key, replay-protected by a nullifier. They see what they need
  to sign off on — never the book.
- **What the world sees:** tamper-evident receipts — commitments, nullifiers,
  counters, audit roots. Anyone can verify the agent stayed inside its committed
  limits without seeing the limits.

**The trust split:** the executor is trusted for ranking quality and liveness —
it can pick the worst in-bounds quote, it can stall, it can abort. It is
cryptographically untrusted for bounds — it cannot produce a valid fill outside
your committed limits, and anyone can verify that from the ledger without seeing
the limits.

**Why not a server:** a server would have to *hold* your mandate to check it.
Here the mandate never leaves your private state, and anyone verifies compliance
from commitments alone.

**Compliance evidence, not promises:** position limits, exposure caps, value
thresholds — the control parameters regulators expect agents to carry — are the
things REMIT proves, on-chain, per fill. The proof is the audit artifact your
governance committee can check without a seat at the negotiating table.

## 2. The buyer-language privacy table

| What | Hidden from | Visible to | Why (buyer language) |
|---|---|---|---|
| Mandate terms: max price, max size, budget remaining, expiry, who you'll trade with | Everyone — suppliers, other desks, the public; the executor sees only that a bound exists, never its value | Nobody, as values | If suppliers learn your limits, they price to them. This is the strategy; it never leaves your private state. |
| The quote book: makers' prices and sizes | Everyone except the executor's ranking step | The executor, which sees them to rank (trusted for ranking quality — not proven; see HONEST-LIMITS.md #2) | Nobody quotes honestly if their book is public. |
| Spend patterns: who won, at what size, at what price, and how often | Everyone except the two counterparties | The two counterparties | Reveals the winner's pricing power and your cadence — the things a supplier prices against. |
| Which agent may act for you | Everyone (binding is by secret preimage; only the commitment is public) | — | If someone can impersonate your agent, your limits are fiction. |
| One disclosed field (side / fill size / fill price / principal / maker / mandate id) | The world sees only ciphertext bytes | The named auditor (key-holder) — one field, nothing else | The auditor checks exactly one fact. Observers learn *that* a disclosure happened and *to whom* — the field selector and auditor key are public metadata, a relationship graph, stated honestly, not hidden. |
| Commitments, nullifiers, Merkle roots, audit roots, counters | — (public by design) | Everyone | The compliance record: anyone can verify the books balance and the agent stayed inside its mandate — without seeing a single price. |
| Unshielded token movements (deposits, withdrawals, mints) | — (public by design) | Everyone | The chain must see the move to execute it. Withdrawals are the loudest event on the transcript. |
| Transaction timing and graph shape | — (public by design) | Everyone | The chain timestamps events; correlatable by anyone watching. |

## 3. remit_pool — per-`disclose()` table

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
| 8 | `placeOffer` (L322) | An offer commitment | Everyone | Sealed envelope for the maker's offer. The price and size stay secret; only the executor's ranking step learns them (see §2). |
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
| 26 | `fill` (L443–444) | *Via `bindSlot` ×3:* offers-tree roots for the three candidate slots | Everyone | Proves all three ranked quotes existed on the book. **What the roots don't reveal: the quote values — but the executor, which did the ranking off-circuit, saw them (see §2).** |

**What is NEVER disclosed in the pool contract:** your limit values (`limitNum/limitDen`,
`maxFillBase`, `expiry`, counterparty list), the maker's price and size, the note
contents (asset, amount, owner), any secret key or preimage. These exist only as
witnesses inside the circuit and on the prover's machine.

## 4. remit_quote — per-`disclose()` table

| # | Circuit (line) | What is revealed | To whom | Why (buyer language) |
|---|---|---|---|---|
| 27 | `claim` (L35–36) | A claim tag: `persistentHash("remit:faucet", secretKey, dayBucket)` | Everyone | One claim per user per day. The tag is one-way: no one learns whose secret it is. |
| 28 | `claim` (L37) | Minted **amount** and **destination address** of REMIT-Q | Everyone | Minting an unshielded test token is a public event — the chain must see what was minted and for whom. |

## 5. The `discloseField` circuit (Wave 2 — remit_quote, 3rd circuit)

**Status: SHIPPED in the Wave-2 build (commit `efda26c`).** Full-ZK compile,
simulator suite, and measured artifacts are complete — proof in
[`docs/COMPILE-PROOF.md`](./COMPILE-PROOF.md). Preprod deploy of the new circuit
is pending the Wave-2 lifecycle run (N4) and is **not** claimed here.

**Wave-2 evidence for `discloseField`:**
- Source: `CONTRACT/src/remit_quote.compact`, pinned sha256
  `52e5369e23e4424835827963bd857ff41ba903612939379da6ce7b6b9fb5b9af`
  (measured, COMPILE-PROOF.md §1). Pool contract unchanged, pinned
  `b0b1da28ffb29f7ff10072a2d342a2906b148542146ed74f08210579ea3bd60d`.
- Full-ZK compile, no `--skip-zk`: compactc 0.31.1, language 0.23.0, runtime
  0.16.0, ledger 8 — 10/10 proving circuits, 10 verifier keys + 10 prover keys
  + 10 ZKIR binaries.
- `discloseField` artifacts: ZKIR sha256
  `a8689e972425777bcfde64802a8e96a0f9e8f403f01b5cf580ecc2ab4f90500c`;
  verifier key exactly **2119 bytes** (committed to git); prover key
  **19,518,477 bytes** (gitignored by design, fetched at deploy).
- Tests: 4 new files, 35 cases — `TESTS/unit/disclose-sim.test.ts` (8),
  `TESTS/unit/disclose-refusal.test.ts` (10), `TESTS/unit/c4-disclose-smoke.test.ts`
  (7), `TESTS/privacy/disclose-leak.test.ts` (10).

**Rename mapping (final, not cosmetic):**

| Spec name | Final circuit name | Why |
|---|---|---|
| v2-spec `disclose(fieldSelector, auditorKey)` | `discloseField(fieldSelector, auditorKey, sealedBox)` | `disclose` is a **reserved keyword** in Compact 0.31.1 — `export circuit disclose(...)` fails at parse time with `found keyword "disclose" looking for an identifier` (hard error, zero tolerance). |

The builtin `disclose(x)` calls inside `claim` (`disclose(tag)`, `disclose(amount)`,
`disclose(to)`) are untouched — they are the primitive, not the circuit.

**Honest hybrid (documented, not hidden).** Compact 0.31.1 has NO in-circuit encryption
primitive — the standard library is hash-only (`persistentHash` / `persistentCommit`,
Merkle-tree ops, verify-only signatures; no symmetric cipher, no KEM/ECDH). So the
circuit does **not** encrypt the field in-circuit. Instead: the field is sealed
OFF-circuit with the repo's real, tested RMTB1 pattern (X25519 + XChaCha20-Poly1305,
`packages/core/src/box.ts`), passed in as an opaque `sealedBox: Bytes<160>`. The circuit
does **authorization + binding + anti-replay**; the seal does the confidentiality. A
hand-rolled in-circuit "cipher" would be boundary theater.

| # | Circuit | What is revealed | To whom | Why (buyer language) |
|---|---|---|---|---|
| 29 | `discloseField(...)` | **Sealed box — opaque ciphertext bytes.** The selected field's `value ‖ salt`, sealed off-circuit to the auditor; only the bytes land on the transcript | Everyone sees the bytes; only the holder of `auditorKey` can open them | The auditor gets exactly one fact, nothing else — the world learns a disclosure happened, never the value. |
| 30 | `discloseField(...)` | A disclosure nullifier: `persistentHash(pad(32,"remit:dnull"), commitment, auditorKey)` — inserted into the new `disclosureNullifiers` ledger set | Everyone | Tamper-evident receipt that this field was opened to this auditor. A second disclosure of the same (field, auditor) pair reverts — replay is dead, and the write is what keeps the compiler generating proofs (the `proof:false` fix). |
| 31 | `discloseField(...)` | **Public metadata:** `fieldSelector` (which of the 6 fields) and `auditorKey` (to whom) | Everyone | Observers learn *that* a disclosure happened and *to whom* — a relationship graph. For compliance use this is arguably the point, but it is not hidden. |
| 32 | `discloseField(...)` | **Binding:** the circuit recomputes all six field commitments and the full `auditRootOf` IN-CIRCUIT under the pool's exact scheme, then discloses the field commitment and the root VALUE | Everyone (as a proof) | Stops the discloser from "disclosing" a fabricated field — the opened fact is tied to the disclosed root value. **Non-claim:** the pool's `auditRoots` is a `List<Bytes<32>>`, not a Merkle tree — no tree exists on either ledger to prove membership against, so no Merkle-membership proof is claimed. Whether the root is present in the pool's list is verifiable OFF-CHAIN only (RPC read). |

**The auditor's verification story — detect, not prevent.** The auditor decrypts the
sealed box → recovers `(value, salt)` → recomputes `persistentCommit` under the pool's
field-salt scheme → compares it to the on-ledger disclosed commitment. The circuit
cannot see inside the box, so it cannot prevent a dishonest box — but if the discloser
published one, the values don't match, and the evidence (disclosed commitment, sealed
box, nullifier) is already on the ledger. Dishonesty is **detected** via on-ledger
evidence, not prevented in-circuit. The salt stays sealed for a reason: `side`
(buy/sell) is brute-forceable if its salt were public. Sealed-box layout:
`RMTB1(5) ‖ ephPub(32) ‖ nonce(24) ‖ ct(80)` = 141 bytes inside `Bytes<160>`; plaintext =
`value32 ‖ salt32`.

**Selector encoding:** `fieldSelector` is `Uint<8>`, asserted `< 6`; the six openable
fields are side, fill size, fill price, principal, maker, mandate id.

**Leak the fixed design still carries (stated, not hidden):** the sealed box leaks its
*occurrence, approximate size, and timing* — correlatable with fill/mandate
transactions. Anyone watching the transcript can see *when* disclosures happen and
*how often*. This is a known, accepted leak of the transcript model, listed here so no
judge has to find it.

## 6. Boundary summary — the whole product in one view

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
- **auditRoot:** one commitment over six sealed fill fields, pushed per fill. The receipt that lets the new `discloseField` circuit open *one field* of a *real* fill without opening the rest.
