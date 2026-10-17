"use client";

import { useCallback, useRef, useState } from "react";
import { Copy, ExternalLink, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabelChip } from "./LabelChip";
import { explorerTxUrl, getChainLiveness, normalizeTxHash } from "./rpc";
import { lookupTx } from "./verify-api";
import type { EvidenceLabel, TxCheckResult } from "./types";

type Phase = "idle" | "checking" | "done";

function truncateMiddle(value: string, keep = 10): string {
  if (value.length <= keep * 2 + 3) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-[#5d6a61] transition-colors hover:bg-[rgba(26,35,30,0.07)] hover:text-[#1a231e]"
    >
      <Copy className="h-3 w-3" aria-hidden />
      {copied ? "copied" : "copy"}
    </button>
  );
}

function Row({
  term,
  label,
  note,
  children,
}: {
  term: string;
  label: EvidenceLabel;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-[rgba(26,35,30,0.1)] py-4 last:border-b-0 sm:grid-cols-[180px_1fr_auto] sm:items-start sm:gap-4">
      <dt className="pt-0.5 text-[13px] font-medium text-[#5d6a61]">{term}</dt>
      <dd className="min-w-0">
        <div className="text-[15px] leading-relaxed text-[#1a231e]">{children}</div>
        {note && <p className="mt-1 text-[13px] leading-relaxed text-[#5d6a61]">{note}</p>}
      </dd>
      <dd className="sm:pt-0.5">
        <LabelChip label={label} />
      </dd>
    </div>
  );
}

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [inputError, setInputError] = useState<string | null>(null);
  const [result, setResult] = useState<TxCheckResult | null>(null);

  const runCheck = useCallback(async () => {
    const hash = normalizeTxHash(input);
    if (!hash) {
      setInputError(
        "That doesn't look like a transaction hash — paste 64 hexadecimal characters (a 0x prefix is fine).",
      );
      setResult(null);
      setPhase("idle");
      return;
    }
    setInputError(null);
    setPhase("checking");
    setResult(null);

    const [liveness, apiLookup] = await Promise.all([getChainLiveness(), lookupTx(hash)]);

    setResult({
      hash,
      liveness,
      api: apiLookup.data,
      apiUnavailableReason: apiLookup.unavailableReason,
      explorerUrl: apiLookup.data?.explorerUrl ?? explorerTxUrl(hash),
      checkedAt: new Date().toISOString(),
    });
    setPhase("done");
  }, [input]);

  const api = result?.api;
  const blockHeight =
    api?.found === true && typeof api.blockHeight === "number" ? api.blockHeight : null;
  const apiFound = blockHeight != null;
  const tip = result?.liveness.tipHeight;
  const confirmations =
    apiFound && tip != null && tip >= blockHeight ? tip - blockHeight : null;
  const disclose = api?.disclose ?? null;

  return (
    <div className="paper grain min-h-screen">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        {/* ── Headline ─────────────────────────────────────────── */}
        <p className="eyebrow text-[#8c6a1f]">REMIT · Public verification</p>
        <h1 className="font-display mt-4 text-4xl leading-[1.05] text-[#1a231e] sm:text-5xl">
          Verify a transaction.
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#3d4a43]">
          This is the auditor&apos;s surface: paste a Midnight Preprod transaction
          hash and confirm its on-chain record — inclusion, block, and any
          auditor-disclosure entry — without ever seeing the underlying mandate
          itself. This page reads the chain directly — through the public node
          RPC and our public verify API. Every fact below is labeled{" "}
          <em className="font-display-wonk">verified</em> or{" "}
          <em className="font-display-wonk">linked</em>, so you can see exactly
          what was checked and what is merely a pointer.
        </p>

        {/* ── Input ────────────────────────────────────────────── */}
        <div className="mt-8 rounded-2xl border border-[rgba(26,35,30,0.14)] bg-[#fbf8f0] p-5 shadow-[0_18px_44px_-28px_rgba(26,35,30,0.35)] sm:p-6">
          <label
            htmlFor="verify-tx-hash"
            className="mb-2 block text-[13px] font-medium text-[#5d6a61]"
          >
            Preprod transaction hash
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="verify-tx-hash"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runCheck();
              }}
              placeholder="paste 64 hex characters…"
              spellCheck={false}
              autoComplete="off"
              className="font-data h-12 min-w-0 flex-1 rounded-xl border border-[rgba(26,35,30,0.2)] bg-[#f4f0e6] px-4 text-[14px] text-[#1a231e] placeholder:text-[#97a49a] focus:border-[#8c6a1f] focus:outline-none focus:ring-2 focus:ring-[rgba(140,106,31,0.25)]"
            />
            <button
              type="button"
              onClick={() => void runCheck()}
              disabled={phase === "checking"}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1a231e] px-6 text-[15px] font-medium text-[#f4f0e6] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {phase === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Search className="h-4 w-4" aria-hidden />
              )}
              {phase === "checking" ? "Reading the chain…" : "Verify"}
            </button>
          </div>
          {inputError && (
            <p role="alert" className="mt-3 text-[14px] leading-relaxed text-[#b5522e]">
              {inputError}
            </p>
          )}
          <p className="mt-3 text-[13px] leading-relaxed text-[#5d6a61]">
            Find hashes in the Wave-2 changelog or on the explorer. This page never asks for a
            wallet, a key, or a signature — verification is read-only.
          </p>
        </div>

        {/* ── Checking state ───────────────────────────────────── */}
        {phase === "checking" && (
          <div className="mt-8 rounded-2xl border border-[rgba(26,35,30,0.14)] bg-[#fbf8f0] p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#8c6a1f]" aria-hidden />
              <p className="text-[15px] text-[#1a231e]">Reading the chain…</p>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[#5d6a61]">
              <li>Asking the public Preprod node for liveness and the current tip.</li>
              <li>Asking the public verify API for this transaction&apos;s block.</li>
            </ul>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────── */}
        {phase === "done" && result && (
          <section aria-live="polite" className="mt-8">
            <div className="rounded-2xl border border-[rgba(26,35,30,0.14)] bg-[#fbf8f0] px-5 py-2 sm:px-6">
              <dl>
                <Row term="Transaction hash" label="linked" note="Echoed from your input — the page asserts nothing about it beyond the 64-hex format check.">
                  <span className="font-data break-all text-[14px]">{result.hash}</span>{" "}
                  <CopyButton value={result.hash} label="Copy full transaction hash" />
                </Row>

                <Row
                  term="Network"
                  label={result.liveness.ok && result.liveness.chainName ? "verified" : "unverified"}
                  note="Read from the node's own system_chain just now."
                >
                  {result.liveness.chainName ?? "Could not be read"}
                </Row>

                <Row
                  term="Node status"
                  label={result.liveness.ok ? "verified" : "unverified"}
                  note={
                    result.liveness.ok
                      ? "Direct read of system_health on the public RPC."
                      : (result.liveness.error ?? "The node could not be reached.")
                  }
                >
                  {result.liveness.ok ? (
                    <>
                      Reachable
                      {result.liveness.peers != null && (
                        <span className="text-[#5d6a61]"> · {result.liveness.peers} peers</span>
                      )}
                      {result.liveness.isSyncing === false && (
                        <span className="text-[#5d6a61]"> · not syncing</span>
                      )}
                      {result.liveness.isSyncing === true && (
                        <span className="text-[#b5522e]"> · still syncing — tip may lag</span>
                      )}
                    </>
                  ) : (
                    "Unreachable"
                  )}
                </Row>

                <Row
                  term="Chain tip at check time"
                  label={result.liveness.ok && tip != null ? "verified" : "unverified"}
                  note="Direct read of chain_getHeader on the public RPC."
                >
                  {tip != null ? (
                    <span className="font-data">{tip.toLocaleString("en-US")}</span>
                  ) : (
                    "Could not be read"
                  )}
                </Row>

                {apiFound ? (
                  <Row
                    term="Included in block"
                    label="verified"
                    note="Confirmed by the indexer through the public verify API during this check."
                  >
                    <span className="font-data">{blockHeight!.toLocaleString("en-US")}</span>
                    {confirmations != null && (
                      <span className="text-[#5d6a61]">
                        {" "}
                        · <span className="font-data">{confirmations.toLocaleString("en-US")}</span>{" "}
                        confirmations deep
                      </span>
                    )}
                  </Row>
                ) : (
                  <Row
                    term="Included in block"
                    label="unverified"
                    note={
                      result.apiUnavailableReason ??
                      (api?.note
                        ? `The indexer answered: ${api.note}.`
                        : "The indexer holds no record of this hash.")
                    }
                  >
                    Not confirmed
                  </Row>
                )}

                <Row
                  term="Explorer"
                  label="linked"
                  note="A deep link we construct — a pointer to the explorer's own page, not a claim by this page."
                >
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-data inline-flex items-center gap-1.5 break-all text-[14px] text-[#1a231e] underline decoration-[rgba(140,106,31,0.5)] decoration-2 underline-offset-4 hover:decoration-[#8c6a1f]"
                  >
                    {result.explorerUrl}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </a>
                </Row>
              </dl>
            </div>

            {/* ── Disclose panel ─────────────────────────────────── */}
            <div className="mt-6 rounded-2xl border border-[rgba(140,106,31,0.35)] bg-[#fbf8f0] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-[#1a231e]">Auditor disclosure record</h2>
                <LabelChip label={disclose ? "verified" : "unverified"} />
              </div>
              {disclose ? (
                <div className="mt-3">
                  <p className="text-[15px] leading-relaxed text-[#1a231e]">
                    A disclosure occurred to auditorKey{" "}
                    <span className="font-data text-[14px]">{truncateMiddle(disclose.auditorKey)}</span>{" "}
                    <CopyButton value={disclose.auditorKey} label="Copy full auditor key" /> — the
                    field value is <strong>NOT visible</strong>.
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#5d6a61]">
                    (verified: ciphertext only — the ledger carries the sealed disclosure box and
                    its nullifier; no field plaintext is present on the ledger. The field is sealed
                    to the auditor&apos;s key off-circuit (RMTB1); the circuit authorizes the
                    disclosure, binds it to the on-chain commitment, and kills replay — so only
                    the auditor can read the value.)
                  </p>
                  <dl className="mt-4">
                    <div className="grid gap-1 border-t border-[rgba(26,35,30,0.1)] py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <dt className="text-[13px] font-medium text-[#5d6a61]">Auditor key</dt>
                      <dd className="font-data break-all text-[13px] text-[#1a231e]">
                        {disclose.auditorKey}
                        <span className="mt-0.5 block text-[12px] text-[#5d6a61]">
                          Public on-ledger metadata — a key, not an identity.
                        </span>
                      </dd>
                    </div>
                    <div className="grid gap-1 border-t border-[rgba(26,35,30,0.1)] py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <dt className="text-[13px] font-medium text-[#5d6a61]">Disclosure nullifier</dt>
                      <dd className="font-data break-all text-[13px] text-[#1a231e]">
                        {disclose.nullifier}
                        <span className="mt-0.5 block text-[12px] text-[#5d6a61]">
                          Hash(commitment ‖ auditorKey) — the ledger-write boundary; a replayed
                          disclosure would collide here.
                        </span>
                      </dd>
                    </div>
                    <div className="grid gap-1 border-y border-[rgba(26,35,30,0.1)] py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                      <dt className="text-[13px] font-medium text-[#5d6a61]">Field</dt>
                      <dd className="font-data text-[13px] text-[#1a231e]">
                        {disclose.fieldSelector}
                        <span className="mt-0.5 block font-sans text-[12px] text-[#5d6a61]">
                          Which field was disclosed — public metadata. Its value stays encrypted.
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="mt-3 text-[14px] leading-relaxed text-[#5d6a61]">
                  {api && !result.apiUnavailableReason
                    ? "The lookup returned no disclosure attached to this transaction. The disclose circuit ships with the Wave-2 quote-contract deploy — until its transactions exist on Preprod, every check shows this note rather than an invented answer."
                    : "Disclosure status could not be determined for this check — the per-transaction lookup above did not complete, so nothing is claimed about disclosures here."}
                </p>
              )}
            </div>

            {/* ── Honesty footer ─────────────────────────────────── */}
            <div className="mt-6 rounded-2xl border border-[rgba(26,35,30,0.14)] bg-transparent p-5 sm:p-6">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#5d6a61]">
                What this page does not claim
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[#5d6a61]">
                <li>
                  It cannot tell you <em>which contract call</em> a transaction made — decoding
                  that needs an indexer. The explorer link above (linked) is where the decoded
                  actions live.
                </li>
                <li>
                  It cannot re-verify a private proof from a hash — that is cryptographically
                  impossible, and this page does not pretend otherwise.
                </li>
                <li>
                  &ldquo;Verified&rdquo; means read back from the chain or the indexer during
                  this check, seconds ago. &ldquo;Linked&rdquo; means a pointer, never a claim.
                </li>
              </ul>
              <p className="font-data mt-4 text-[12px] text-[#97a49a]">
                checked {new Date(result.checkedAt).toLocaleString()}
              </p>
            </div>
          </section>
        )}

        {/* ── Idle hint ────────────────────────────────────────── */}
        {phase === "idle" && !result && (
          <div
            className={cn(
              "mt-8 rounded-2xl border border-dashed border-[rgba(26,35,30,0.25)] p-6",
              "text-[14px] leading-relaxed text-[#5d6a61]",
            )}
          >
            Paste a hash and press Verify. The page will show the chain tip it read, whether the
            indexer confirms the transaction and its block, and a deep link to the explorer —
            each labeled so you know what was actually checked.
          </div>
        )}
      </main>
    </div>
  );
}
