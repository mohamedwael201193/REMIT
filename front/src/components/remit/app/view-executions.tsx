"use client";

/**
 * Executions — the operating record of the engine.
 *
 * Three zones: the live pipeline while an attempt is in flight, the
 * enforcement-boundary showcase that teaches what refusal means, and the
 * full ledger of every attempt with its policy checks, timeline and proofs.
 */

import * as React from "react";
import { ArrowLeftRight, Check, ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BoundaryGlyph,
  DataChip,
  EASE,
  EmptyState,
  Hairline,
  ProofSeal,
  Reveal,
  StatusPill,
  type PillTone,
} from "@/components/remit/primitives";
import { assetBySymbol, counterpartyById } from "@/lib/remit/catalog";
import { formatDateTime, formatUsd, sideLabel, timeAgo } from "@/lib/remit/format";
import type { Execution, ExecutionStatus } from "@/lib/remit/types";
import { useRemitStore } from "@/store/remit";

/* ── presentation helpers ──────────────────────────────────────────── */

function executionPill(status: ExecutionStatus): { tone: PillTone; label: string } {
  switch (status) {
    case "settled":
      return { tone: "settled", label: "Settled" };
    case "rejected":
      return { tone: "rejected", label: "Rejected" };
    case "proof-pending":
      return { tone: "pending", label: "Proof pending" };
    case "expired":
      return { tone: "neutral", label: "Lapsed" };
    case "offer-matched":
      return { tone: "pending", label: "Matched" };
    case "mandate-verified":
      return { tone: "pending", label: "Verified" };
  }
}

const PENDING_STATUSES: ExecutionStatus[] = [
  "proof-pending",
  "offer-matched",
  "mandate-verified",
];

/* ── live pipeline ─────────────────────────────────────────────────── */

type Stage = "idle" | "evaluating" | "checking" | "proving" | "settling" | "done";

const PIPELINE = [
  "Offer matched",
  "Mandate verified",
  "Proof generated",
  "Proof accepted",
  "Settlement",
  "Receipt",
] as const;

/** Number of pipeline stages lit at each engine stage. */
const STAGE_PROGRESS: Record<Stage, number> = {
  idle: 0,
  evaluating: 1,
  checking: 2,
  proving: 3,
  settling: 5,
  done: 6,
};

const STAGE_NOTES: Record<Stage, string> = {
  idle: "",
  evaluating: "Evaluating the offer against the private mandate envelope…",
  checking: "Running policy checks — price, size, counterparty, budget…",
  proving: "Generating the zero-knowledge proof on Midnight…",
  settling: "Proof accepted — settling the fill…",
  done: "",
};

function LiveExecutionPanel() {
  const executionStage = useRemitStore((s) => s.executionStage);
  const lastExecution = useRemitStore((s) => s.lastExecution);
  if (executionStage === "idle" && !lastExecution) return null;

  const stage = executionStage as Stage;
  const running = stage !== "idle" && stage !== "done";
  /** Stages stay lit for a persisted last attempt after the run ends. */
  const lit =
    stage === "idle" && lastExecution
      ? lastExecution.status === "settled"
        ? STAGE_PROGRESS.done
        : STAGE_PROGRESS.checking
      : STAGE_PROGRESS[stage];

  return (
    <Reveal>
      <section
        aria-label="Live execution"
        className="rounded-2xl border border-gold/25 bg-[#121c17] p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative flex h-2 w-2">
            {running ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60" />
            ) : null}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                lastExecution?.status === "rejected" ? "bg-clay" : "bg-gold",
              )}
            />
          </span>
          <p className="eyebrow text-gold">
            {running ? "Execution engine · live" : "Execution engine · last attempt"}
          </p>
        </div>

        {/* stepper */}
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
          {PIPELINE.map((label, i) => {
            const isLit = i < lit;
            const isActive = running && i === lit - 1;
            return (
              <React.Fragment key={label}>
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "hidden h-px w-5 sm:block",
                      i < lit ? "bg-gold/60" : "bg-[rgba(239,235,224,0.14)]",
                    )}
                  />
                ) : null}
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      isLit
                        ? "bg-gold"
                        : "border border-sage/60 bg-transparent",
                      isActive && "animate-pulse ring-4 ring-gold/15",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-[11.5px] leading-none",
                      isLit ? "text-cream" : "text-sage",
                    )}
                  >
                    {label}
                  </span>
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {running ? (
          <p className="mt-4 text-[12.5px] text-gold/90">{STAGE_NOTES[stage]}</p>
        ) : null}

        {/* result banner */}
        <AnimatePresence mode="wait">
          {lastExecution && !running ? (
            <motion.div
              key={lastExecution.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="mt-5"
            >
              {lastExecution.status === "settled" ? (
                <div className="flex flex-col gap-4 rounded-xl border border-mint/35 bg-mint/10 p-4 sm:flex-row sm:items-center">
                  <ProofSeal
                    tone="mint"
                    stamp
                    label="Proof verified"
                    className="h-12 w-12 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold tracking-[0.12em] text-mint uppercase">
                      Proof verified — Fill settled
                    </p>
                    <p className="font-data mt-1 text-[11.5px] text-cream/70">
                      {lastExecution.reference} ·{" "}
                      {formatUsd(lastExecution.settledFill)}{" "}
                      {assetBySymbol(lastExecution.asset).symbol} @{" "}
                      {formatUsd(
                        lastExecution.price,
                        lastExecution.price != null && lastExecution.price < 10,
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lastExecution.receipt ? (
                      <DataChip className="border-mint/30 bg-mint/5 text-mint/90">
                        receipt {lastExecution.receipt.code}
                      </DataChip>
                    ) : null}
                    {lastExecution.proofRef ? (
                      <DataChip>proof {lastExecution.proofRef}</DataChip>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-xl border border-clay/40 bg-clay/10 p-4 sm:flex-row sm:items-center">
                  <ProofSeal
                    tone="clay"
                    stamp
                    label="Rejected before settlement"
                    className="h-12 w-12 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold tracking-[0.12em] text-clay uppercase">
                      Rejected before settlement
                    </p>
                    <p className="font-data mt-1 text-[11.5px] text-cream/70">
                      {lastExecution.reference} · {lastExecution.refusalReason}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </Reveal>
  );
}

/* ── enforcement-boundary showcase ─────────────────────────────────── */

function EnforcementShowcase() {
  const executions = useRemitStore((s) => s.executions);
  const over = executions.find((e) => e.status === "rejected");
  const fill = executions.find((e) => e.status === "settled");
  if (!over && !fill) return null;
  const attempted = over?.attemptedFill ?? null;
  const settled = fill?.settledFill ?? fill?.attemptedFill ?? null;
  const receipt = fill?.txHash ? fill.txHash.slice(0, 12) : null;

  return (
    <Reveal>
      <section
        aria-label="The enforcement boundary"
        className="rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="eyebrow text-gold">The enforcement boundary</p>
          <p className="text-[11.5px] text-muted-foreground">
            Every attempt is measured against the mandate before value moves.
          </p>
        </div>

        <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">Attempted fill</p>
            <p className="font-data mt-2 text-4xl font-semibold tracking-tight text-clay sm:text-5xl">
              {formatUsd(attempted)}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:px-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(239,235,224,0.14)] bg-[#18241e] text-sage">
              <BoundaryGlyph className="h-5 w-5" />
            </span>
            <span className="text-[10.5px] tracking-[0.18em] text-sage uppercase">
              mandate limit
            </span>
          </div>

          <div className="sm:text-right">
            <p className="eyebrow text-muted-foreground">Mandate limit</p>
            <p className="font-data mt-2 text-4xl font-semibold tracking-tight text-gold sm:text-5xl">
              {formatUsd(null)}
            </p>
          </div>
        </div>

        {over ? (
        <div className="mt-7 rounded-xl border border-clay/40 bg-clay/10 p-4">
          <p className="text-[13px] font-semibold tracking-wide text-clay">
            REJECTED BEFORE SETTLEMENT — Compact refused the fill. No settlement tx.
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-cream/70">
            No value moved. The attempt is provable, the rules are not.
          </p>
        </div>
        ) : null}

        {fill ? (
        <>
        <Hairline className="my-5" />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <ProofSeal tone="mint" label="Proof verified" className="h-8 w-8 shrink-0" />
          <p className="font-data text-[15px] text-cream/85">
            <span className="text-mint">{formatUsd(settled)}</span>
            {" → "}
            <span className="text-mint">VERIFIED — Mandate satisfied</span>
          </p>
          {receipt ? (
            <DataChip className="border-mint/30 bg-mint/5 text-mint/90">
              tx {receipt}
            </DataChip>
          ) : null}
        </div>
        </>
        ) : null}
      </section>
    </Reveal>
  );
}

/* ── ledger row ────────────────────────────────────────────────────── */

function LedgerRow({ execution }: { execution: Execution }) {
  const [open, setOpen] = React.useState(false);
  const asset = assetBySymbol(execution.asset);
  const counterparty = counterpartyById(execution.counterpartyId);
  const pill = executionPill(execution.status);
  const panelId = `${execution.id}-detail`;

  return (
    <div className="rounded-xl border border-[rgba(239,235,224,0.1)] bg-[#121c17]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[64px] w-full flex-col gap-2.5 p-4 text-left transition-colors hover:bg-[rgba(239,235,224,0.025)] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="min-w-0">
          <p className="font-data text-[13.5px] font-semibold text-cream">
            {execution.reference}
          </p>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">
            {asset.symbol} · {sideLabel(execution.side)} · {counterparty.name} ·{" "}
            {timeAgo(execution.executedAt)}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="sm:text-right">
            <p className="font-data text-[15px] font-medium text-cream">
              {formatUsd(execution.attemptedFill)}
            </p>
            {execution.settledFill !== undefined ? (
              <p className="font-data text-[11px] text-mint">
                = {formatUsd(execution.settledFill)} settled
              </p>
            ) : null}
          </div>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-[rgba(239,235,224,0.08)] px-4 py-4">
              <div className="scroll-elegant max-h-96 space-y-6 overflow-y-auto pr-2">
                {/* policy checks */}
                <div>
                  <p className="eyebrow text-muted-foreground">Policy checks</p>
                  <ul className="mt-3 space-y-2">
                    {execution.checks.map((check) => (
                      <li
                        key={check.label}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5"
                      >
                        {check.passed ? (
                          <Check
                            className="mt-[3px] h-3.5 w-3.5 shrink-0 self-start text-mint"
                            aria-hidden="true"
                          />
                        ) : (
                          <X
                            className="mt-[3px] h-3.5 w-3.5 shrink-0 self-start text-clay"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-[13px] text-cream/85">
                          {check.label}
                        </span>
                        <span className="font-data ml-auto text-[11px] text-muted-foreground">
                          {check.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* event timeline */}
                <div>
                  <p className="eyebrow text-muted-foreground">Timeline</p>
                  <ol className="mt-3 space-y-3 border-l border-[rgba(239,235,224,0.12)]">
                    {execution.events.map((event, i) => (
                      <li key={`${event.at}-${i}`} className="relative pl-5">
                        <span
                          className="absolute top-[6px] left-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold/80"
                          aria-hidden="true"
                        />
                        <p className="text-[12.5px] leading-snug text-cream/85">
                          {event.label}
                        </p>
                        <p className="font-data mt-0.5 text-[10.5px] text-muted-foreground">
                          {formatDateTime(event.at)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* proof references */}
                {execution.proofRef || execution.auditRoot || execution.receipt ? (
                  <div className="flex flex-wrap gap-2">
                    {execution.proofRef ? (
                      execution.explorerUrl ? (
                        <a
                          href={execution.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex"
                        >
                          <DataChip>tx {execution.proofRef}</DataChip>
                        </a>
                      ) : (
                        <DataChip>proof {execution.proofRef}</DataChip>
                      )
                    ) : null}
                    {execution.auditRoot ? (
                      <DataChip>audit {execution.auditRoot}</DataChip>
                    ) : null}
                    {execution.receipt ? (
                      <DataChip>receipt {execution.receipt.code}</DataChip>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ── view ──────────────────────────────────────────────────────────── */

export function ViewExecutions() {
  const executions = useRemitStore((s) => s.executions);
  const syncStatus = useRemitStore((s) => s.syncStatus);

  const loading = syncStatus === "loading" || syncStatus === "idle";

  const settledCount = executions.filter((e) => e.status === "settled").length;
  const rejectedCount = executions.filter((e) => e.status === "rejected").length;
  const pendingCount = executions.filter((e) =>
    PENDING_STATUSES.includes(e.status),
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Executions
            </h2>
            <p className="max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
              Every attempt, checked against the mandate before value moves.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(239,235,224,0.1)] bg-[#121c17] px-3 font-data text-[11.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
              settled {settledCount}
            </span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(239,235,224,0.1)] bg-[#121c17] px-3 font-data text-[11.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" aria-hidden="true" />
              rejected {rejectedCount}
            </span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(239,235,224,0.1)] bg-[#121c17] px-3 font-data text-[11.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
              pending {pendingCount}
            </span>
          </div>
        </div>
      </Reveal>

      <LiveExecutionPanel />

      <EnforcementShowcase />

      {/* ledger */}
      {executions.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="No executions yet"
          description="Run an offer through the engine and every attempt will be recorded here with its proofs."
        />
      ) : (
        <div className="space-y-3">
          {executions.map((execution, i) => (
            <Reveal key={execution.id} delay={Math.min(i * 0.04, 0.2)} y={12}>
              <LedgerRow execution={execution} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
