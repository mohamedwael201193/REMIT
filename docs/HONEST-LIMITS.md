# HONEST-LIMITS.md — what REMIT does NOT prove

> **Reading guide.** Every constrained-execution product tempts its pitch into claiming
> more than the circuits prove. This document is the anti-pitch: eight things REMIT
> does *not* claim, stated plainly, so a judge never has to catch us. Each item names
> the limit in buyer language first; the mechanism lives in one line at the end.
> Headlines here never use the word "mandate" — that word lives in the contract code
> and the appendix of PRIVACY-BOUNDARY.md.

## The eight non-claims

**1. Best execution — no.**
We prove best-of-3 *in this transaction*, not best price in the market. If a better
quote existed off the book, or arrived a block later, the proof says nothing about it.
(Mechanism: MBBE over the three committed book slots.)

**2. Honest ranking and steering — no.**
The executor can fill the *worst* in-bounds quote and the proof still verifies.
Griefing *within* your limits is trusted, not proven: the bounds are cryptographic,
the quality of the pick is not. This is the known steering hole — disclosed, not closed
this wave.
(Mechanism: `chosenIndex` is an executor-supplied witness; the circuit checks the
chosen slot is eligible and undominated, never that it is optimal for you.)

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

The honest one-liner is: *"Set hard limits for how your money gets quoted. Your agent
can negotiate inside them — it can never exceed them."* Full stop. Everything after
"full stop" in a competitor's pitch — best price, fair ranking, guaranteed fill,
verified auditor, backed quotes, front-running proof, sane limits — we explicitly do
not claim. What we *do* claim: the executor cannot produce a valid fill outside your
committed limits, and anyone can verify that from the ledger without seeing the limits.

## "Not fixed this wave" ledger

| # | Non-claim | Fixed? |
|---|---|---|
| 1 | Best execution | No — by design; best-of-K-in-tx is the product's scope. |
| 2 | Honest ranking / steering | No — disclosed, not closed. Choice-integrity proof is Wave 3. |
| 3 | Liveness | No — no slashing/bond mechanism this wave. |
| 4 | Disclosure freshness | No — listed, not version-bound. |
| 5 | Auditor legitimacy | No — key distribution stays off-chain. |
| 6 | Maker quote backing | No — off-chain boxes, stated as non-claim. |
| 7 | Front-running resistance | No — ranking step unblinded. |
| 8 | Limit sanity | No — by design; the user owns their limits. |
