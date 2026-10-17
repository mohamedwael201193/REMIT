# HONEST-LIMITS.md — what REMIT does NOT prove

> **Reading guide.** Every constrained-execution product tempts its pitch into claiming
> more than the circuits prove. This document is the anti-pitch: eight things REMIT
> does *not* claim, stated plainly, so a judge never has to catch us. Each item names
> the limit in buyer language first; the mechanism lives in one line at the end.
> Headlines in this document avoid the word "mandate" — that word lives in the
> contract code and the appendix of PRIVACY-BOUNDARY.md. The one exception is
> the approved pitch one-liner quoted verbatim below.

## The eight non-claims

**1. Best execution — two different claims, one proven, one not.**

**(A) Relative best-execution: PROVEN.** The circuit proves the filled quote was best
among the K=3 committed book slots *in this transaction* — `notDominated` × 3 over a
`strictlyBetter` total order (price cross-multiplication + fillable-base tie-break +
commitment lex-order tie-break). If a better quote existed off the book, or arrived a
block later, the proof says nothing about it.
(Mechanism: MBBE over the three committed book slots.)

**(B) Set completeness: NOT proven.** The executor chooses *which* quotes enter the
three slots. The circuit cannot prove the book was complete — a better quote omitted
from the book is invisible to the proof. A bigger K, or a ranking commitment over an
executor-chosen set, would not change this: the gap is *which quotes compete*, not how
they compare. This is the steering hole, named precisely. A completeness construction
exists (count-pinned full-book proof: commitment-sorted book, per-slot Merkle binding,
distinctness via `bytesLt`, live-count folded and asserted equal to `openOffers`) — it
requires a pool rewrite and is Wave-3 work, not this wave.

(Taro's lottery test, decomposed: *were all tickets in the drum?* — unproven;
*was the winner drawn fairly from the drum?* — proven; *was the draw held at a fair
time?* — unprovable in one tx; residual timing trust, listed in #3.)

**2. Honest ranking and steering — no.**
The executor can fill the *worst* in-bounds quote and the proof still verifies.
Griefing *within* your limits is trusted, not proven: the bounds are cryptographic,
the quality of the pick is not. This is non-claim #1(B) restated at the ranking step —
`chosenIndex` is an executor-supplied witness; the circuit checks the chosen slot is
eligible and undominated, never that the book was complete or that the pick is optimal
for you. Disclosed, not closed this wave; a choice-integrity proof is Wave 3.

**3. Liveness — no.**
The executor can abort, stall, or simply never fill. Nothing in either contract
slashes it, penalizes it, or forces it to act.
(Mechanism: no liveness bond, no timeout slash, no forced-fill path exists on ledger.)

**4. Freshness of a disclosed field — no**, unless the disclosure binds a limit *version*.
A field from a stale or superseded limit discloses exactly as cleanly as one from a
live limit. **Not fixed this wave:** we list it rather than version-bind it.
(Mechanism: the `discloseField` circuit's nullifier binds `fieldCommitment ‖ auditorKey`,
not a limit version or state nonce. `discloseField` is the v2 spec's `disclose`, renamed —
`disclose` is a reserved keyword in Compact 0.31.1.)

**5. Auditor legitimacy — no.**
An auditor key is a key, not an identity. Whoever holds the key reads the field.
Key distribution — who the key belongs to, whether it was revoked, whether it leaked —
happens off-chain and is unproven by any circuit.
(Mechanism: `auditorKey` is a public input; no on-chain identity registry.)

**6. Maker quote backing — no.**
Quotes are off-chain boxes. No circuit proves the maker can actually settle what they
quoted — a maker can quote size they don't have; the fill circuit proves the fill
stayed inside your limits, not that the maker's side was funded.
(Mechanism: `placeOffer` escrows the maker's sell side, but nothing binds a quote box
seen by the executor to funded on-chain liquidity at fill time.)

**7. Front-running resistance — no.**
The executor sees all quotes before choosing. An executor affiliated with a maker can
self-deal *within* your limits and the proof verifies perfectly — the circuit cannot
tell a self-deal from an arm's-length fill.
(Mechanism: quote visibility precedes `chosenIndex`; no commit-reveal or blinding on
the ranking step.)

**8. Limit sanity — no.**
Garbage limits in, compliant fill out. The circuit enforces the bounds it was given,
not *sensible* bounds. If you set a max price ten times the market, every fill under
it is "compliant" — and worthless.
(Mechanism: `slotEligible` checks the chosen quote against the committed limits; no
circuit judges the limits themselves.)

## What this means for the pitch

The approved one-liner is: *"Provable spending limits for autonomous purchasing
agents — the agent can choose, it cannot exceed."* Full stop. Everything after
"full stop" in a competitor's pitch — best price, fair ranking, guaranteed fill,
verified auditor, backed quotes, front-running proof, sane limits — we explicitly do
not claim. What we *do* claim: the executor cannot produce a valid fill outside your
committed limits, and anyone can verify that from the ledger without seeing the limits.

"Inside the limits" is the whole product. Nothing in any slide, line, or voiceover —
here or elsewhere — implies choice-integrity: no "best deal", no "fair", no "unrigged".

## "Not fixed this wave" ledger

| # | Non-claim | Fixed? |
|---|---|---|
| 1 | Best execution | **Split:** (A) relative best-execution proven at K=3 (MBBE, in-tx). (B) Set completeness — no; the executor chooses the book. Completeness construction exists, is scoped, and is Wave 3. |
| 2 | Honest ranking / steering | No — disclosed, not closed. Choice-integrity proof is Wave 3. |
| 3 | Liveness | No — no slashing/bond mechanism this wave. |
| 4 | Disclosure freshness | No — listed, not version-bound. |
| 5 | Auditor legitimacy | No — key distribution stays off-chain. |
| 6 | Maker quote backing | No — off-chain boxes, stated as non-claim. |
| 7 | Front-running resistance | No — ranking step unblinded. |
| 8 | Limit sanity | No — by design; the user owns their limits. |
