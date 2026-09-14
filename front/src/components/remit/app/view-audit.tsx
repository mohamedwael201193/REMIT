"use client";

/**
 * Audit — the selective disclosure desk.
 *
 * States are distinguishable: SEALED / REQUESTED / REVEALED / VERIFIED.
 * A fill tx hash is never an auditRoot. Verified requires verifyDisclosure
 * against the on-chain auditRoots head — a hash alone does not verify.
 */

import * as React from "react";
import { EyeOff, Lock, SearchCheck, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataChip,
  EmptyState,
  HashChip,
  Reveal,
  StatBlock,
  StatusPill,
  type PillTone,
} from "@/components/remit/primitives";
import { assetBySymbol } from "@/lib/remit/catalog";
import { timeAgo } from "@/lib/remit/format";
import {
  AUDIT_FLOW_COPY,
  openedAuditRoot,
  recordAuditFlow,
  disclosureFlow,
} from "@/lib/remit/audit-flow";
import type { AuditFlowState, AuditRecord, Disclosure } from "@/lib/remit/types";
import { useRemitStore } from "@/store/remit";
import { useToast } from "@/hooks/use-toast";

function flowPill(state: AuditFlowState): { tone: PillTone; label: string } {
  switch (state) {
    case "verified":
      return { tone: "verified", label: AUDIT_FLOW_COPY.verified };
    case "revealed":
      return { tone: "settled", label: AUDIT_FLOW_COPY.revealed };
    case "requested":
      return { tone: "pending", label: AUDIT_FLOW_COPY.requested };
    case "sealed":
      return { tone: "sealed", label: AUDIT_FLOW_COPY.sealed };
  }
}

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function DisclosureTile({
  disclosure,
  onReveal,
  busy,
  requested,
}: {
  disclosure: Disclosure;
  onReveal: (disclosure: Disclosure) => void;
  busy: boolean;
  requested: boolean;
}) {
  const flow = disclosureFlow(disclosure.state, requested);

  if (flow === "verified") {
    return (
      <div className="flex min-h-[92px] flex-col justify-between gap-2 rounded-lg border border-mint/45 bg-mint/10 p-3">
        <p className="text-[12px] font-medium text-cream/85">{disclosure.label}</p>
        <div className="flex items-start gap-2">
          <Unlock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
          <p className="font-data text-[11px] leading-relaxed break-words text-mint">
            {disclosure.value ?? "VERIFIED"}
          </p>
        </div>
        <StatusPill tone="verified" className="self-start">
          {AUDIT_FLOW_COPY.verified}
        </StatusPill>
      </div>
    );
  }

  if (flow === "revealed") {
    return (
      <div className="flex min-h-[92px] flex-col justify-between gap-2 rounded-lg border border-mint/35 bg-mint/5 p-3">
        <p className="text-[12px] font-medium text-cream/85">{disclosure.label}</p>
        <div className="flex items-start gap-2">
          <Unlock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
          <p className="font-data text-[11px] leading-relaxed break-words text-mint">
            {disclosure.value ?? "REVEALED"}
          </p>
        </div>
        <StatusPill tone="settled" className="self-start">
          {AUDIT_FLOW_COPY.revealed}
        </StatusPill>
      </div>
    );
  }

  if (flow === "requested") {
    return (
      <div className="flex min-h-[92px] flex-col justify-between gap-2 rounded-lg border border-gold/35 bg-gold/5 p-3">
        <p className="text-[12px] font-medium text-cream/85">{disclosure.label}</p>
        <p className="text-[11px] text-gold">REQUESTED — opening not returned yet</p>
        <StatusPill tone="pending" className="self-start">
          {AUDIT_FLOW_COPY.requested}
        </StatusPill>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onReveal(disclosure)}
      disabled={busy}
      aria-label={`Request ${disclosure.label}`}
      className="group flex min-h-[92px] flex-col justify-between gap-2 rounded-lg border border-[rgba(239,235,224,0.1)] bg-[#0f1814] p-3 text-left transition-colors hover:border-gold/35 disabled:opacity-60"
    >
      <p className="text-[12px] font-medium text-cream/85">{disclosure.label}</p>
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">SEALED — request an opening</span>
        </span>
        <span className="inline-flex h-11 shrink-0 items-center rounded-md px-2.5 text-[11px] font-medium text-gold transition-colors group-hover:bg-gold/10">
          Request
        </span>
      </span>
    </button>
  );
}

function AuditRecordCard({ record, fillHashes }: { record: AuditRecord; fillHashes: Array<string | undefined> }) {
  const revealFact = useRemitStore((s) => s.revealFact);
  const { toast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [requestedId, setRequestedId] = React.useState<string | null>(null);
  const [forged, setForged] = React.useState<"idle" | "rejected" | "unexpected">("idle");

  const asset = assetBySymbol(record.asset);
  const requestedIds = requestedId ? new Set([requestedId]) : new Set<string>();
  const flow = recordAuditFlow(record, requestedIds, fillHashes);
  const pill = flowPill(flow);
  const root = openedAuditRoot(record.auditRoot, fillHashes);

  const handleReveal = async (disclosure: Disclosure) => {
    setBusyId(disclosure.id);
    setRequestedId(disclosure.id);
    try {
      await revealFact(record.id, disclosure.id);
      toast({
        title: "verifyDisclosure accepted — VERIFIED",
        duration: 2600,
      });
    } catch (error) {
      toast({
        title: "Opening not available — fact stays SEALED",
        description:
          error instanceof Error
            ? error.message
            : "verifyDisclosure against the on-chain auditRoot is not wired in this tab",
        variant: "destructive",
        duration: 12000,
      });
    } finally {
      setBusyId(null);
      setRequestedId(null);
    }
  };

  const handleForged = async () => {
    setBusyId("forged");
    try {
      const result = await useRemitStore.getState().probeForgedDisclosure();
      setForged(result.ok ? "unexpected" : "rejected");
      toast({
        title: result.ok ? "Forged package unexpectedly verified" : "Forged package REJECTED",
        variant: result.ok ? "destructive" : "default",
        duration: 4000,
      });
    } catch (error) {
      setForged("rejected");
      toast({
        title: "Forged package REJECTED",
        description: error instanceof Error ? error.message : "verifyDisclosure rejected",
        duration: 4000,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold tracking-tight">
          {record.executionRef}
        </h3>
        <DataChip>{asset.symbol}</DataChip>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
          {root ? (
            <HashChip value={root} label="auditRoot" />
          ) : (
            <span className="font-data text-[11px] text-sage">auditRoot not opened</span>
          )}
          <span className="font-data text-[11px] text-sage">{timeAgo(record.recordedAt)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="eyebrow text-muted-foreground">Request one fact</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {record.disclosures.map((disclosure) => (
            <DisclosureTile
              key={disclosure.id}
              disclosure={disclosure}
              onReveal={(d) => void handleReveal(d)}
              busy={busyId === disclosure.id}
              requested={requestedId === disclosure.id}
            />
          ))}
        </div>
      </div>

      <p className="flex items-center gap-2 border-t border-[rgba(239,235,224,0.07)] pt-3 text-[11px] text-muted-foreground">
        <EyeOff className="h-3 w-3 shrink-0 text-sage" aria-hidden="true" />
        The auditor never receives the complete mandate. Expiry is Compact-enforced, not an auditor opening.
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busyId !== null}
          onClick={() => void handleForged()}
          className="min-h-11 border-clay/35 bg-transparent text-clay hover:bg-clay/10 hover:text-clay"
        >
          Probe forged package
        </Button>
        {forged === "rejected" ? (
          <StatusPill tone="rejected">REJECTED</StatusPill>
        ) : forged === "unexpected" ? (
          <StatusPill tone="pending">UNEXPECTED PASS</StatusPill>
        ) : null}
      </div>
    </article>
  );
}

export function ViewAudit() {
  const audits = useRemitStore((s) => s.audits);
  const executions = useRemitStore((s) => s.executions);
  const syncStatus = useRemitStore((s) => s.syncStatus);
  const role = useRemitStore((s) => s.role);
  const setRole = useRemitStore((s) => s.setRole);

  const loading = syncStatus === "loading" || syncStatus === "idle";
  const fillHashes = executions.map((e) => e.txHash);

  const sealedCount = audits.filter((a) => recordAuditFlow(a, new Set(), fillHashes) === "sealed").length;
  const requestedCount = audits.filter((a) => recordAuditFlow(a, new Set(), fillHashes) === "requested").length;
  const revealedCount = audits.filter((a) => recordAuditFlow(a, new Set(), fillHashes) === "revealed").length;
  const verifiedCount = audits.filter((a) => recordAuditFlow(a, new Set(), fillHashes) === "verified").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <Reveal>
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Audit</h2>
          <p className="max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
            Request one fact at a time. VERIFIED is only after verifyDisclosure against the
            on-chain auditRoot — a fill tx hash is not an auditRoot.
          </p>
        </div>
      </Reveal>

      {role !== "auditor" ? (
        <Reveal delay={0.05}>
          <div className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-cream/80">
              You are viewing as {roleLabel(role)}. Demo lens is not authorization. Switch to the
              Auditor lens for the audit desk.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRole("auditor")}
              className="min-h-11 shrink-0 border-gold/35 bg-transparent px-4 text-gold hover:bg-gold/10 hover:text-gold-2"
            >
              Switch to auditor
            </Button>
          </div>
        </Reveal>
      ) : null}

      <Reveal delay={0.08}>
        <div className="flex min-w-0 flex-wrap gap-2">
          <StatusPill tone="sealed">{AUDIT_FLOW_COPY.sealed}</StatusPill>
          <StatusPill tone="pending">{AUDIT_FLOW_COPY.requested}</StatusPill>
          <StatusPill tone="settled">{AUDIT_FLOW_COPY.revealed}</StatusPill>
          <StatusPill tone="verified">{AUDIT_FLOW_COPY.verified}</StatusPill>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid min-w-0 gap-5 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:grid-cols-4 sm:p-6">
          <StatBlock label="Sealed" value={sealedCount} />
          <StatBlock label="Requested" value={requestedCount} />
          <StatBlock label="Revealed" value={revealedCount} />
          <StatBlock label="Verified" value={verifiedCount} sub="verifyDisclosure only" />
        </div>
      </Reveal>

      {audits.length === 0 ? (
        <EmptyState
          icon={<SearchCheck className="h-5 w-5" />}
          title="No audit records yet"
          description="Indexer-confirmed fills appear here as SEALED packages. They stay sealed until a real disclosure is verified."
        />
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {audits.map((record, i) => (
            <Reveal key={record.id} delay={Math.min(i * 0.04, 0.2)}>
              <AuditRecordCard record={record} fillHashes={fillHashes} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
