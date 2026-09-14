"use client";

/**
 * Overview — the principal's home inside the REMIT workspace.
 *
 * A quiet surface: greeting, four headline figures, the active mandate
 * rendered as a sealed paper document, and the private activity ledger.
 * Everything reads from the workspace store; nothing calls the provider.
 */

import * as React from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Ban,
  Bot,
  Check,
  FileLock2,
  Inbox,
  Lock,
  Receipt,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemitStore } from "@/store/remit";
import {
  CountUp,
  DataChip,
  EmptyState,
  PaperSurface,
  ProgressTrack,
  ProofSeal,
  Reveal,
  StatusPill,
  type PillTone,
} from "@/components/remit/primitives";
import {
  assetBySymbol,
  executorById,
} from "@/lib/remit/catalog";
import {
  formatCompactUsd,
  formatUsd,
  sideLabel,
  timeAgo,
} from "@/lib/remit/format";
import type {
  ActivityItem,
  ActivityKind,
  Execution,
  ExecutionStatus,
  Mandate,
  Role,
} from "@/lib/remit/types";

/* ── local lookups ────────────────────────────────────────────────── */

const ROLE_LINE: Record<Role, string> = {
  principal: "Principal workspace",
  executor: "Executor console",
  auditor: "Audit desk",
};

const ACTIVITY_ICON: Record<ActivityKind, React.ElementType> = {
  mandate: FileLock2,
  offer: Inbox,
  proof: ShieldCheck,
  settlement: Receipt,
  audit: SearchCheck,
  revocation: Ban,
};

const EXECUTION_PILL: Record<
  ExecutionStatus,
  { tone: PillTone; label: string }
> = {
  "offer-matched": { tone: "pending", label: "Matched" },
  "mandate-verified": { tone: "verified", label: "Verified" },
  "proof-pending": { tone: "pending", label: "Proof pending" },
  settled: { tone: "settled", label: "Settled" },
  rejected: { tone: "rejected", label: "Rejected" },
  expired: { tone: "neutral", label: "Lapsed" },
};

/* ── small building blocks ────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4">
      <span className="eyebrow text-sage">{label}</span>
      <span className="font-data text-[1.6rem] font-medium leading-none tracking-tight text-cream">
        {value}
      </span>
      <span className="text-[11px] leading-snug text-sage">{sub}</span>
    </div>
  );
}

/** Status pill tuned for the cream paper surface (fixed tones are ink-scoped). */
function PaperPill({
  tone,
  className,
  children,
}: {
  tone: "gold" | "sage" | "verified";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    gold: "border-gold-deep/40 bg-gold-deep/10 text-gold-deep",
    sage: "border-[#5d6a61]/45 bg-[#5d6a61]/10 text-[#5d6a61]",
    verified: "border-[#3e8e66]/40 bg-[#3e8e66]/10 text-[#3e8e66]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

function PaperFact({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

/* ── spotlight document ───────────────────────────────────────────── */

function SpotlightCard({ mandate }: { mandate: Mandate | undefined }) {
  const setAppView = useRemitStore((s) => s.setAppView);

  return (
    <section
      className="rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-6"
      aria-label="Active mandate spotlight"
    >
      <p className="eyebrow text-gold">Active mandate spotlight</p>

      {mandate ? (
        <PaperSurface className="mt-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="font-display text-[1.7rem] font-semibold leading-tight text-foreground">
                {mandate.reference}
              </p>
              <p className="mt-1.5 max-w-md text-[13px] italic leading-relaxed text-muted-foreground">
                {mandate.intent}
              </p>
            </div>
            <PaperPill tone={mandate.side === "buy" ? "gold" : "sage"}>
              {sideLabel(mandate.side)}
            </PaperPill>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
            <PaperFact label="Asset">
              <span className="font-data font-semibold">
                {assetBySymbol(mandate.asset).symbol}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                {assetBySymbol(mandate.asset).name}
              </span>
            </PaperFact>

            <PaperFact label="Max fill">
              <span className="font-data text-[15px] font-bold text-gold-deep">
                {formatUsd(mandate.maxFill)}
              </span>
            </PaperFact>

            <PaperFact label="Limit">
              <span className="font-data font-semibold">
                {formatUsd(
                  mandate.limitPrice,
                  mandate.limitPrice != null && mandate.limitPrice < 10,
                )}
              </span>
            </PaperFact>

            <PaperFact label="Expiry">
              <span className="font-data font-semibold">
                {timeAgo(mandate.expiry)}
              </span>
            </PaperFact>

            <PaperFact label="Budget" className="col-span-2">
              {mandate.spent == null || mandate.totalBudget == null ? (
                <p className="mt-2 font-data text-[11.5px] text-muted-foreground">
                  Sealed
                </p>
              ) : (
                <>
                  <ProgressTrack value={mandate.spent} max={mandate.totalBudget} />
                  <p className="mt-2 font-data text-[11.5px] text-muted-foreground">
                    <span className="font-semibold text-gold-deep">
                      {formatCompactUsd(mandate.spent)}
                    </span>{" "}
                    spent of {formatCompactUsd(mandate.totalBudget)}
                  </p>
                </>
              )}
            </PaperFact>

            <PaperFact label="Executor" className="col-span-2">
              <span className="block text-[13px] font-medium">
                {executorById(mandate.executorId).name}
              </span>
              <PaperPill tone="verified" className="mt-1.5">
                policy-bound
              </PaperPill>
            </PaperFact>
          </dl>

          <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
            <ProofSeal className="h-8 w-8" tone="gold" label="Sealed mandate" />
            <p className="text-[12px] font-medium text-muted-foreground">
              Sealed — rules visible only to you
            </p>
          </div>
        </PaperSurface>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={<FileLock2 className="h-5 w-5" />}
            title="No active mandate"
            description="Seal a private mandate to put a policy-bound engine to work."
            action={
              <Button
                size="sm"
                className="h-9 bg-gold text-[#1a1409] hover:bg-gold-2"
                onClick={() => setAppView("mandates")}
              >
                Seal a mandate
              </Button>
            }
          />
        </div>
      )}
    </section>
  );
}

/* ── recent executions ────────────────────────────────────────────── */

function ExecutionRow({ execution }: { execution: Execution }) {
  const setAppView = useRemitStore((s) => s.setAppView);
  const pill = EXECUTION_PILL[execution.status];
  const amount = execution.settledFill ?? execution.attemptedFill;

  return (
    <button
      type="button"
      onClick={() => setAppView("executions")}
      aria-label={`Open executions — ${execution.reference}`}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[rgba(239,235,224,0.04)]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-data text-[12.5px] font-semibold text-cream">
            {execution.reference}
          </span>
          <DataChip className="py-0.5">{execution.asset}</DataChip>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 font-data text-[11.5px] text-sage">
          <span className="uppercase tracking-[0.12em]">
            {sideLabel(execution.side)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-cream/90">
            {formatCompactUsd(amount)}{" "}
            {execution.settledFill !== undefined ? "settled" : "attempted"}
          </span>
          <span aria-hidden="true">·</span>
          <span>{timeAgo(execution.executedAt)}</span>
        </p>
      </div>
      <StatusPill tone={pill.tone} className="shrink-0">
        {pill.label}
      </StatusPill>
    </button>
  );
}

function RecentExecutionsCard({ executions }: { executions: Execution[] }) {
  const setAppView = useRemitStore((s) => s.setAppView);

  return (
    <section
      className="rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-6"
      aria-label="Recent executions"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-gold">Recent executions</p>
        <button
          type="button"
          onClick={() => setAppView("executions")}
          className="rounded px-1 py-0.5 text-[11px] text-sage transition-colors hover:text-cream"
        >
          View all
        </button>
      </div>

      {executions.length > 0 ? (
        <div className="mt-3 max-h-80 divide-y divide-[rgba(239,235,224,0.06)] overflow-y-auto scroll-elegant">
          {executions.map((execution) => (
            <ExecutionRow key={execution.id} execution={execution} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={<ArrowLeftRight className="h-5 w-5" />}
            title="No executions yet"
            description="Settled and refused fills will appear here as the engine works."
          />
        </div>
      )}
    </section>
  );
}

/* ── private activity ─────────────────────────────────────────────── */

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = ACTIVITY_ICON[item.kind];

  return (
    <div className="flex items-start gap-3 rounded-lg px-1 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(239,235,224,0.1)] bg-[#18241e] text-cream/70">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-[13px] font-medium text-cream">{item.label}</p>
          {item.privateToWorkspace ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-sage">
              <Lock className="h-3 w-3" aria-hidden="true" />
              private
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-sage">{item.detail}</p>
      </div>
      <span className="shrink-0 font-data text-[10.5px] text-sage/80">
        {timeAgo(item.at)}
      </span>
    </div>
  );
}

function PrivateActivityCard({ activity }: { activity: ActivityItem[] }) {
  return (
    <section
      className="rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-6"
      aria-label="Private activity"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-gold">Private activity</p>
        <StatusPill tone="private">workspace only</StatusPill>
      </div>

      {activity.length > 0 ? (
        <div className="mt-3 max-h-72 divide-y divide-[rgba(239,235,224,0.06)] overflow-y-auto scroll-elegant">
          {activity.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No activity yet"
            description="Workspace events will appear here as mandates and fills progress."
          />
        </div>
      )}
    </section>
  );
}

/* ── audit-ready executions ───────────────────────────────────────── */

function AuditReadyCard({ verifiedCount }: { verifiedCount: number }) {
  const audits = useRemitStore((s) => s.audits);
  const setAppView = useRemitStore((s) => s.setAppView);
  const verified = audits.filter((a) => a.proofStatus === "verified");

  return (
    <section
      className="rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-6"
      aria-label="Audit-ready executions"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-gold">Audit-ready executions</p>
        <span className="font-data text-[11px] text-mint">
          {verifiedCount} verified
        </span>
      </div>

      {verified.length > 0 ? (
        <>
          <div className="mt-3 divide-y divide-[rgba(239,235,224,0.06)]">
            {verified.slice(0, 3).map((record) => (
              <div
                key={record.id}
                className="flex min-h-[48px] items-center gap-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-mint/35 bg-mint/10 text-mint">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-data text-[12.5px] font-semibold text-cream">
                    {record.executionRef}
                  </p>
                  <p className="truncate font-data text-[10.5px] text-sage">
                    {record.asset} · {record.auditRoot}
                  </p>
                </div>
                <span className="shrink-0 font-data text-[10.5px] text-sage/80">
                  {timeAgo(record.verifiedAt)}
                </span>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAppView("audit")}
            className="mt-3 h-10 w-full justify-between text-[12.5px] text-sage hover:text-cream"
          >
            Open audit
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={<SearchCheck className="h-5 w-5" />}
            title="No verified proofs yet"
            description="Proofs become audit-ready once fills settle on Midnight."
          />
        </div>
      )}
    </section>
  );
}

/* ── role banners ─────────────────────────────────────────────────── */

function ExecutorBanner() {
  const setAppView = useRemitStore((s) => s.setAppView);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-gold/10 text-gold">
        <Bot className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-cream">
          Constrained executor
        </p>
        <p className="text-[11.5px] text-sage">awaiting instructions</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAppView("offers")}
        className="h-10 shrink-0 border-gold/35 bg-transparent px-3.5 text-gold hover:bg-gold/10 hover:text-gold-2"
      >
        Review offers
      </Button>
    </div>
  );
}

function AuditorBanner({ verifiedCount }: { verifiedCount: number }) {
  const setAppView = useRemitStore((s) => s.setAppView);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-mint/25 bg-mint/10 text-mint">
        <SearchCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-cream">Audit desk</p>
        <p className="text-[11.5px] text-sage">
          {verifiedCount} executions with verified proofs
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAppView("audit")}
        className="h-10 shrink-0 border-mint/35 bg-transparent px-3.5 text-mint hover:bg-mint/10"
      >
        Open audit
      </Button>
    </div>
  );
}

/* ── loading state ────────────────────────────────────────────────── */

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
        className="grid gap-6 lg:grid-cols-2"
        <Skeleton className="h-[430px] rounded-2xl" />
        <div className="space-y-6">
          <Skeleton className="h-[290px] rounded-2xl" />
          <Skeleton className="h-[220px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* ── view ─────────────────────────────────────────────────────────── */

export function ViewOverview() {
  const portfolio = useRemitStore((s) => s.portfolio);
  const mandates = useRemitStore((s) => s.mandates);
  const executions = useRemitStore((s) => s.executions);
  const audits = useRemitStore((s) => s.audits);
  const activity = useRemitStore((s) => s.activity);
  const role = useRemitStore((s) => s.role);
  const wallet = useRemitStore((s) => s.wallet);
  const syncStatus = useRemitStore((s) => s.syncStatus);

  const [greeting] = React.useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  });

  if (!portfolio || syncStatus === "loading" || syncStatus === "idle") {
    return <OverviewSkeleton />;
  }

  const principalName =
    portfolio.principalName ||
    wallet.address ||
    (wallet.status === "connected" ? "Connected principal" : "Principal");
  const remainingBudget =
    portfolio.totalBudget == null || portfolio.committedBudget == null
      ? null
      : portfolio.totalBudget - portfolio.committedBudget;
  const verifiedAudits = audits.filter((a) => a.proofStatus === "verified");
  const spotlight = mandates.find((m) => m.status === "active");

  return (
    <div className="space-y-6">
      {/* greeting */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow text-gold">{greeting}</p>
          <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-cream sm:text-[1.75rem]">
            {principalName}
          </h2>
          <p className="mt-1.5 text-[13px] text-sage">
            {portfolio.deskName} · {ROLE_LINE[role]}
          </p>
        </div>
        <StatusPill tone="private" className="shrink-0">
          Rules visible only to you
        </StatusPill>
      </section>

      {/* headline figures */}
      <Reveal className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Active mandates"
          value={<CountUp value={portfolio.activeMandates} />}
          sub={`of ${mandates.length} total`}
        />
        <KpiCard
          label="Remaining budget"
          value={
            remainingBudget == null ? (
              "Sealed"
            ) : (
              <CountUp value={remainingBudget} format={(n) => formatUsd(n)} />
            )
          }
          sub={
            portfolio.totalBudget == null
              ? "Not disclosed"
              : `of ${formatCompactUsd(portfolio.totalBudget)} authorized`
          }
        />
        <KpiCard
          label="Open offers"
          value={<CountUp value={portfolio.openOffers} />}
          sub="awaiting evaluation"
        />
        <KpiCard
          label="Verification rate"
          value={
            <CountUp
              value={portfolio.verificationRate}
              format={(n) => `${n.toFixed(1)}%`}
            />
          }
          sub="fills proven compliant"
        />
      </Reveal>

      {/* main grid */}
      <Reveal
        delay={0.08}
        className="grid gap-6 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-6">
          <SpotlightCard mandate={spotlight} />
          <RecentExecutionsCard executions={executions.slice(0, 6)} />
        </div>

        <div className="flex flex-col gap-6">
          {role === "executor" ? <ExecutorBanner /> : null}
          {role === "auditor" ? (
            <AuditorBanner verifiedCount={verifiedAudits.length} />
          ) : null}

          <PrivateActivityCard activity={activity.slice(0, 8)} />
          <AuditReadyCard verifiedCount={verifiedAudits.length} />
        </div>
      </Reveal>
    </div>
  );
}
