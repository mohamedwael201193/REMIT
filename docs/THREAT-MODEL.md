# REMIT — Threat Model

*One page. What we protect, from whom, and where trust ends and cryptography begins.*

## Assets

- **Your limits** — max price, max size, budget left, expiry, who you'll trade with. This is the strategy.
- **Maker quotes** — price and size. This is their book.
- **Fill details** — who won the deal, and at what size. This is pricing power.
- **Agent binding** — which agent is allowed to act for you. If someone can impersonate it, your limits are fiction.
- **Receipts** — tamper-evident proof that no deal was counted twice.

## Adversaries

1. **Competing dealers** — want your limits, flow, and urgency so they can shade their quotes and trade against you.
2. **Malicious or affiliated executor** — sees rankings and encrypted quote boxes before choosing. It cannot break bounds, but it can pick the worst in-bounds quote, stall, abort, or self-deal within bounds.
3. **Curious public** — chain observers. They see commitments, nullifiers, counters, `auditRoot`, ciphertext, and timing — never values.
4. **Malicious maker or principal** — garbage quote in, garbage mandate in. The system enforces the bounds it was given, not sensible bounds.

## Trust tiers

**Cryptographic — trust no one:**

- No valid fill can settle outside the principal's committed limits. The circuit rejects it.
- Consumed openings cannot be replayed; each disclosure is bound to one `(commitment, auditorKey)` pair, so disclosures can't be replayed either.
- Forged audit disclosures fail — the auditor only verifies, never learns the book.

**Trusted — role trust, not cryptographic:**

- **Executor ranking quality and liveness.** It can fill the worst in-bounds quote, stall, or never fill. Bounds are proven; quality is trusted. (Taro's steering attack — disclosed, not closed.)
- **Auditor legitimacy.** `auditorKey` is a key, not an identity. Key distribution is off-chain and unproven.
- **Maker solvency.** Quotes are off-chain boxes; nothing proves the maker can settle.

**Trusted infrastructure:**

- The wallet / local proof-server sees witnesses in the clear — kept local or operator-side, never on Render. This is the privacy boundary, not a missing feature.
- Custody amounts are disclosed at the unshielded deposit/withdraw boundary.

## Out of scope

The eight non-claims, spelled out in [HONEST-LIMITS.md](HONEST-LIMITS.md): no execution-quality claim of any kind (K=3 bounds the witness set; the proven claim is "cannot exceed", never a ranked-top pick); no honest ranking — the executor may pick the worst in-bounds quote, stall, or grief (Taro's steering attack — disclosed, not closed); no liveness; no disclose field freshness without mandate versioning; no auditor identity; no maker quote backing; no front-running resistance against an affiliated executor; no mandate sanity.

## Why Midnight and not a server — the trust split

The executor is trusted for ranking quality and liveness — it can pick the worst in-bounds quote, it can stall, it can abort. It is cryptographically UNTRUSTED for bounds: it cannot produce a valid fill outside your committed limits, and anyone can verify that from the ledger without seeing the limits. A server would ask you to trust its honesty about compliance. Midnight lets you verify compliance without trusting anyone's honesty.
