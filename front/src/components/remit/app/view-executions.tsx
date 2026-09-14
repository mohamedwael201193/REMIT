"use client";

/**
 * Agent — first-class blotter for private RFQs, mandate friction, selection,
 * and indexer-backed proof/settlement. Compact proves best among the K
 * openings the executor supplied — not the global book.
 */

import * as React from "react";
import { ArrowLeftRight, Check, ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BoundaryGlyph,
  DataChip,
  EmptyState,
  HashChip,
  Hairline,
  MOTION,
  ProofSeal,
  Reveal,
  StateFade,
  StatusPill,
  type PillTone,
} from "@/components/remit/primitives";
import { openedAuditRoot } from "@/lib/remit/audit-flow";
import { assetBySymbol, counterpartyById } from "@/lib/remit/catalog";
import { formatDateTime, formatUsd, sideLabel, timeAgo } from "@/lib/remit/format";
import {
  isIndexerSettled,
  type Execution,
  type ExecutionStatus,
  type Offer,
} from "@/lib/remit/types";
import { useRemitStore } from "@/store/remit";

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

const COMPATIBLE_STATES: Offer["state"][] = ["compatible", "new", "evaluating", "executed"];

type Stage = "idle" | "evaluating" | "checking" | "proving" | "settling" | "done";

const PIPELINE = [
  "Offer matched",
  "Mandate verified",
  "Proof generated",
  "Proof accepted",
  "Settlement",
  "Receipt",
] as const;

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
  settling: "Waiting for indexer contractAction…",
  done: "",
};

function indexerSettled(execution: Execution | null): boolean {
  return Boolean(execution && isIndexerSettled(execution));
}

function pickSelected(offers: Offer[]): Offer | null {
  return (
    offers.find((o) => o.state === "executed") ??
    offers.find((o) => o.state === "compatible") ??
    offers.find((o) => o.state === "new") ??
    null
  );
}

function BlotterSection({
  eyebrow,
  count,
  children,
}: {
  eyebrow: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow text-gold">{eyebrow}</p>
        {count != null ? (
          <span className="font-data text-[11.5px] text-sage">{count}</span>
        ) : null}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

function AgentStatusCard() {
  const status = useRemitStore((s) => s.agentStatus);
  const error = useRemitStore((s) => s.agentStatusError);
  const kLabel = status && Number.isFinite(status.k) ? String(status.k) : "unknown";
  const last = status?.last ?? null;

  return (
    <BlotterSection eyebrow="Agent status">
      <StateFade stateKey={error ?? (status ? "ok" : "loading")}>
        {error && !status ? (
          <p className="text-[13px] text-muted-foreground">{error}</p>
        ) : !status ? (
          <p className="text-[13px] text-muted-foreground">Reading GET /agent/status…</p>
        ) : (
          <div className="min-w-0 space-y-3">
            {last ? (
              <p className="text-[14px] leading-relaxed text-cream">
                {last.candidateCount} private offers received · {last.eligibleCount} satisfy the
                mandate · {last.rejectedCount} rejected
                {last.selected
                  ? " · Agent selected the best compliant candidate among K"
                  : " · no eligible candidate among the openings this executor holds"}
                .
              </p>
            ) : (
              <p className="text-[13px] leading-relaxed text-cream/80">
                Ranker is {status.rank ? "on" : "off"} · HTTP fill submit is{" "}
                {status.httpSubmit ? "on" : "off"} · K={kLabel} · global-book best is not claimed ·
                MPC is off.
              </p>
            )}
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Compact proves the selected candidate among the K openings the executor included.
              This tab does not invent an AI confidence score, and it does not read fillBase or
              chosenIndex from public HTTP.
            </p>
            <div className="flex min-w-0 flex-wrap gap-2">
              <DataChip>rank {status.rank ? "true" : "false"}</DataChip>
              <DataChip>httpSubmit {status.httpSubmit ? "true" : "false"}</DataChip>
              <DataChip>K={kLabel}</DataChip>
              <DataChip>globalBest false</DataChip>
              {status.rule ? <DataChip>{status.rule}</DataChip> : null}
            </div>
            {status.inbox ? (
              <p className="font-data text-[12px] text-sage">
                Inbox counts from the public status: {status.inbox.offers} offers ·{" "}
                {status.inbox.mandates} mandates
              </p>
            ) : null}
            {error ? <p className="text-[12px] text-clay">{error}</p> : null}
          </div>
        )}
      </StateFade>
    </BlotterSection>
  );
}

function LiveExecutionPanel() {
  const executionStage = useRemitStore((s) => s.executionStage);
  const lastExecution = useRemitStore((s) => s.lastExecution);
  const reduced = useReducedMotion();
  if (executionStage === "idle" && !lastExecution) return null;

  const stage = executionStage as Stage;
  const running = stage !== "idle" && stage !== "done";
  const lit =
    stage === "idle" && lastExecution
      ? indexerSettled(lastExecution)
        ? STAGE_PROGRESS.done
        : STAGE_PROGRESS.checking
      : STAGE_PROGRESS[stage];
  const settledTruth = indexerSettled(lastExecution);

  return (
    <Reveal>
      <section
        aria-label="Live execution"
        className="min-w-0 rounded-2xl border border-gold/25 bg-[#121c17] p-4 sm:p-6"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              lastExecution?.status === "rejected" ? "bg-clay" : "bg-gold",
            )}
            aria-hidden="true"
          />
          <p className="eyebrow text-gold">
            {running ? "Execution engine · live" : "Execution engine · last attempt"}
          </p>
        </div>

        <div className="mt-5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-3">
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
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      isLit ? "bg-gold" : "border border-sage/60 bg-transparent",
                      isActive && !reduced && "ring-4 ring-gold/15",
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn("text-[11.5px] leading-none", isLit ? "text-cream" : "text-sage")}>
                    {label}
                  </span>
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {running ? <p className="mt-4 text-[12.5px] text-gold/90">{STAGE_NOTES[stage]}</p> : null}

        <AnimatePresence mode="wait">
          {lastExecution && !running ? (
            <motion.div
              key={`${lastExecution.id}:${settledTruth ? "settled" : lastExecution.status}`}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduced ? 0 : MOTION.duration.base, ease: MOTION.ease }}
              className="mt-5 min-w-0"
            >
              {settledTruth ? (
                <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-mint/35 bg-mint/10 p-4 sm:flex-row sm:items-center">
                  <ProofSeal tone="mint" stamp label="Indexer-confirmed fill" className="h-12 w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold tracking-[0.12em] text-mint uppercase">
                      Indexer-confirmed fill
                    </p>
                    <p className="font-data mt-1 min-w-0 text-[11.5px] text-cream/70">
                      {lastExecution.reference} · {formatUsd(lastExecution.settledFill)}{" "}
                      {assetBySymbol(lastExecution.asset).symbol}
                    </p>
                    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                      {lastExecution.txHash ? (
                        <HashChip
                          value={lastExecution.txHash}
                          label="tx"
                          href={lastExecution.explorerUrl}
                        />
                      ) : null}
                      {lastExecution.block != null ? (
                        <DataChip>block {lastExecution.block}</DataChip>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : lastExecution.status === "rejected" ? (
                <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-clay/40 bg-clay/10 p-4 sm:flex-row sm:items-center">
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
              ) : (
                <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
                  <p className="text-[12.5px] font-semibold tracking-[0.12em] text-gold uppercase">
                    Awaiting indexer truth
                  </p>
                  <p className="mt-1 text-[12.5px] text-cream/70">
                    This tab does not animate success until contractAction returns a tx and block.
                  </p>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </Reveal>
  );
}

function EnforcementShowcase() {
  const executions = useRemitStore((s) => s.executions);
  const over = executions.find((e) => e.status === "rejected");
  const fill = executions.find((e) => e.status === "settled");
  if (!over && !fill) return null;
  const attempted = over?.attemptedFill ?? null;
  const settled = fill?.settledFill ?? fill?.attemptedFill ?? null;

  return (
    <Reveal>
      <section
        aria-label="The enforcement boundary"
        className="min-w-0 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6"
      >
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="eyebrow text-gold">The enforcement boundary</p>
          <p className="text-[11.5px] text-muted-foreground">
            Compact refused overreach with no settlement tx. Amounts stay sealed.
          </p>
        </div>

        <div className="mt-6 grid min-w-0 items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">Attempted fill</p>
            <p className="font-data mt-2 break-words text-4xl font-semibold tracking-tight text-clay sm:text-5xl">
              {formatUsd(attempted)}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:px-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(239,235,224,0.14)] bg-[#18241e] text-sage">
              <BoundaryGlyph className="h-5 w-5" />
            </span>
            <span className="text-[10.5px] tracking-[0.18em] text-sage uppercase">mandate limit</span>
          </div>

          <div className="min-w-0 sm:text-right">
            <p className="eyebrow text-muted-foreground">Mandate limit</p>
            <p className="font-data mt-2 break-words text-4xl font-semibold tracking-tight text-gold sm:text-5xl">
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
              {over.refusalReason ?? "No value moved. The attempt is provable; the openings are not."}
            </p>
          </div>
        ) : null}

        {fill ? (
          <>
            <Hairline className="my-5" />
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3">
              <ProofSeal
                tone={indexerSettled(fill) ? "mint" : "gold"}
                label={indexerSettled(fill) ? "Indexer-confirmed" : "Pending indexer"}
                className="h-8 w-8 shrink-0"
              />
              <p className="font-data min-w-0 text-[15px] text-cream/85">
                <span className={indexerSettled(fill) ? "text-mint" : "text-gold"}>
                  {formatUsd(settled)}
                </span>
                {" → "}
                <span className={indexerSettled(fill) ? "text-mint" : "text-gold"}>
                  {indexerSettled(fill) ? "Settled — indexer contractAction" : "Awaiting indexer truth"}
                </span>
              </p>
              {fill.txHash ? <HashChip value={fill.txHash} label="tx" href={fill.explorerUrl} /> : null}
              {fill.block != null ? <DataChip>block {fill.block}</DataChip> : null}
            </div>
          </>
        ) : null}
      </section>
    </Reveal>
  );
}

function OfferLine({ offer }: { offer: Offer }) {
  const asset = assetBySymbol(offer.asset);
  const counterparty = counterpartyById(offer.counterpartyId);
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-[rgba(239,235,224,0.08)] bg-[#0f1814] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-data text-[13px] font-semibold text-cream">{offer.reference}</p>
        <p className="mt-1 truncate text-[12px] text-muted-foreground">
          {asset.symbol} · {sideLabel(offer.side)}
          {counterparty.name ? ` · ${counterparty.name}` : ""}
        </p>
        {offer.frictions.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {offer.frictions.map((friction) => (
              <li key={friction} className="flex items-start gap-1.5 text-[12px] text-clay">
                <X className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{friction}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-data text-[13px] text-cream/80">{formatUsd(offer.size)}</span>
        {offer.txHash ? <HashChip value={offer.txHash} label="tx" /> : <DataChip>sealed opening</DataChip>}
      </div>
    </li>
  );
}

function LedgerRow({ execution }: { execution: Execution }) {
  const [open, setOpen] = React.useState(false);
  const reduced = useReducedMotion();
  const asset = assetBySymbol(execution.asset);
  const counterparty = counterpartyById(execution.counterpartyId);
  const pill = executionPill(execution.status);
  const panelId = `${execution.id}-detail`;

  return (
    <div className="min-w-0 rounded-xl border border-[rgba(239,235,224,0.1)] bg-[#121c17]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[64px] w-full min-w-0 flex-col gap-2.5 p-4 text-left transition-colors hover:bg-[rgba(239,235,224,0.025)] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="min-w-0">
          <p className="font-data text-[13.5px] font-semibold text-cream">{execution.reference}</p>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">
            {asset.symbol} · {sideLabel(execution.side)}
            {counterparty.name ? ` · ${counterparty.name}` : ""} · {timeAgo(execution.executedAt)}
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="min-w-0 sm:text-right">
            <p className="font-data text-[15px] font-medium text-cream">
              {formatUsd(execution.attemptedFill)}
            </p>
            {execution.settledFill !== undefined ? (
              <p className="font-data text-[11px] text-mint">= {formatUsd(execution.settledFill)} settled</p>
            ) : null}
          </div>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
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
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : MOTION.duration.fast, ease: MOTION.ease }}
            className="overflow-hidden"
          >
            <div className="border-t border-[rgba(239,235,224,0.08)] px-4 py-4">
              <div className="scroll-elegant max-h-96 min-w-0 space-y-6 overflow-y-auto pr-2">
                <div>
                  <p className="eyebrow text-muted-foreground">Policy checks</p>
                  <ul className="mt-3 space-y-2">
                    {execution.checks.map((check) => (
                      <li key={check.label} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        {check.passed ? (
                          <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 self-start text-mint" aria-hidden="true" />
                        ) : (
                          <X className="mt-[3px] h-3.5 w-3.5 shrink-0 self-start text-clay" aria-hidden="true" />
                        )}
                        <span className="text-[13px] text-cream/85">{check.label}</span>
                        <span className="font-data ml-auto min-w-0 max-w-full break-words text-[11px] text-muted-foreground">
                          {check.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="eyebrow text-muted-foreground">Timeline</p>
                  <ol className="mt-3 space-y-3 border-l border-[rgba(239,235,224,0.12)]">
                    {execution.events.map((event, i) => (
                      <li key={`${event.at}-${i}`} className="relative pl-5">
                        <span
                          className="absolute top-[6px] left-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold/80"
                          aria-hidden="true"
                        />
                        <p className="text-[12.5px] leading-snug text-cream/85">{event.label}</p>
                        <p className="font-data mt-0.5 text-[10.5px] text-muted-foreground">
                          {formatDateTime(event.at)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex min-w-0 flex-wrap gap-2">
                  {execution.txHash ? (
                    <HashChip value={execution.txHash} label="tx" href={execution.explorerUrl} />
                  ) : null}
                  {execution.block != null ? <DataChip>block {execution.block}</DataChip> : null}
                  {execution.auditRoot ? (
                    openedAuditRoot(execution.auditRoot, [execution.txHash]) ? (
                      <HashChip value={execution.auditRoot} label="auditRoot" />
                    ) : null
                  ) : null}
                  {execution.receipt ? <DataChip>receipt {execution.receipt.code}</DataChip> : null}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ViewExecutions() {
  const executions = useRemitStore((s) => s.executions);
  const offers = useRemitStore((s) => s.offers);
  const agentStatus = useRemitStore((s) => s.agentStatus);
  const syncStatus = useRemitStore((s) => s.syncStatus);

  const loading = syncStatus === "loading" || syncStatus === "idle";

  const received = offers;
  const compatible = offers.filter((o) => COMPATIBLE_STATES.includes(o.state));
  const rejected = offers.filter((o) => o.state === "incompatible");
  const selected = pickSelected(offers);
  const last = agentStatus?.last ?? null;
  const receivedCount = last?.candidateCount ?? received.length;
  const compatibleCount = last?.eligibleCount ?? compatible.length;
  const rejectedCountOffers = last?.rejectedCount ?? rejected.length;
  const settledCount = executions.filter((e) => e.status === "settled").length;
  const rejectedCount = executions.filter((e) => e.status === "rejected").length;
  const pendingCount = executions.filter((e) => PENDING_STATUSES.includes(e.status)).length;

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
    <div className="min-w-0 space-y-6">
      <Reveal>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Agent</h2>
            <p className="max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
              Compact proves the selected candidate is the best mandate-compliant live slot among
              the K openings the executor included — not global-book best execution, and not an AI
              confidence score.
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
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

      <AgentStatusCard />

      {last ? (
        <p className="text-[12px] leading-relaxed text-sage">
          Blotter headlines use GET /agent/status last rank ({last.candidateCount} / {last.eligibleCount}{" "}
          / {last.rejectedCount}). Rows below are committed evidence openings — not AI confidence,
          fillBase, or chosenIndex.
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <BlotterSection eyebrow="Private RFQs received" count={receivedCount}>
          {received.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No committed openings in this workspace. Counts come from GET /agent/status
              when present, otherwise from evidence steps — never a simulated book.
            </p>
          ) : (
            <ul className="space-y-2">
              {received.map((offer) => (
                <OfferLine key={offer.id} offer={offer} />
              ))}
            </ul>
          )}
        </BlotterSection>

        <div className="flex min-w-0 flex-col gap-4">
          <BlotterSection eyebrow="Mandate-compatible" count={compatibleCount}>
            <StateFade stateKey={`eligible:${compatible.map((o) => o.id).join(",") || "empty"}`}>
              {compatible.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No compatible openings in the K-set.</p>
              ) : (
                <ul className="space-y-2">
                  {compatible.map((offer) => (
                    <OfferLine key={offer.id} offer={offer} />
                  ))}
                </ul>
              )}
            </StateFade>
          </BlotterSection>
          <BlotterSection eyebrow="Rejected" count={rejectedCountOffers}>
            <StateFade stateKey={`rejected:${rejected.map((o) => o.id).join(",") || "empty"}`}>
              {rejected.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No Compact friction recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {rejected.map((offer) => (
                    <OfferLine key={offer.id} offer={offer} />
                  ))}
                </ul>
              )}
            </StateFade>
          </BlotterSection>
        </div>
      </div>

      <BlotterSection eyebrow="Selection">
        <StateFade stateKey={selected ? `${selected.id}:${selected.state}` : "none"}>
        {selected ? (
          <div className="min-w-0 space-y-2">
            <p className="font-data text-[15px] text-cream">
              {selected.state === "executed" ? "Settled candidate" : "Best compliant candidate in this K-set"}{" "}
              · {selected.reference}
            </p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Compact proves best among K openings supplied, not the global book. This tab does not
              claim NightPool-style auction ranking or Senyap global cheapest-live.
            </p>
            <div className="flex min-w-0 flex-wrap gap-2">
              <DataChip>{selected.state}</DataChip>
              <span className="font-data text-[12.5px] text-cream/80">{formatUsd(selected.size)}</span>
              {selected.txHash ? <HashChip value={selected.txHash} label="tx" /> : null}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Sealed — no eligible candidate among the openings this executor holds.
          </p>
        )}
        </StateFade>
      </BlotterSection>

      <BlotterSection eyebrow="Proof / settlement">
        <StateFade
          stateKey={
            executions
              .map((e) => `${e.id}:${e.status}:${e.txHash ?? ""}:${e.block ?? ""}`)
              .join("|") || "none"
          }
        >
        {executions.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Proof stays pending until the indexer returns a tx and block. Settlement is not
            animated from a local success.
          </p>
        ) : (
          <ul className="space-y-2">
            {executions.map((execution) => (
              <li
                key={execution.id}
                className="flex min-w-0 flex-col gap-2 rounded-xl border border-[rgba(239,235,224,0.08)] bg-[#0f1814] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-data text-[13px] font-semibold text-cream">{execution.reference}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {execution.status === "settled"
                      ? indexerSettled(execution)
                        ? "Indexer-confirmed fill"
                        : "Marked settled without tx+block — treating as pending"
                      : execution.refusalReason ?? execution.status}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {execution.txHash ? (
                    <HashChip value={execution.txHash} label="tx" href={execution.explorerUrl} />
                  ) : (
                    <DataChip>no settlement tx</DataChip>
                  )}
                  {execution.block != null ? <DataChip>block {execution.block}</DataChip> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        </StateFade>
      </BlotterSection>

      <EnforcementShowcase />

      {executions.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="No executions yet"
          description="Every Compact attempt is recorded here with indexer evidence — never a simulated confidence score."
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
