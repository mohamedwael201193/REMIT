"use client";

/**
 * Audit — the selective disclosure desk.
 *
 * An auditor verifies one fact at a time against a proof. The mandate
 * itself is never handed over: sealed facts stay sealed until they are
 * individually revealed on request.
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
import type { AuditRecord, Disclosure } from "@/lib/remit/types";
import { useRemitStore } from "@/store/remit";
import { useToast } from "@/hooks/use-toast";

/* ── presentation helpers ──────────────────────────────────────────── */

function proofPill(status: AuditRecord["proofStatus"]): {
  tone: PillTone;
  label: string;
} {
  return status === "verified"
    ? { tone: "verified", label: "Proof verified" }
    : { tone: "pending", label: "Proof pending" };
}

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/* ── disclosure tile ───────────────────────────────────────────────── */

function DisclosureTile({
  disclosure,
  onReveal,
  busy,
}: {
  disclosure: Disclosure;
  onReveal: (disclosure: Disclosure) => void;
  busy: boolean;
}) {
  if (disclosure.state === "disclosed") {
    return (
      <div className="flex min-h-[92px] flex-col justify-between gap-2 rounded-lg border border-mint/35 bg-mint/5 p-3">
        <p className="text-[12px] font-medium text-cream/85">
          {disclosure.label}
        </p>
        <div className="flex items-start gap-2">
          <Unlock
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint"
            aria-hidden="true"
          />
          <p className="font-data text-[11px] leading-relaxed break-words text-mint">
            {disclosure.value ?? "Revealed on request"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onReveal(disclosure)}
      disabled={busy}
      aria-label={`Reveal ${disclosure.label}`}
      className="group flex min-h-[92px] flex-col justify-between gap-2 rounded-lg border border-[rgba(239,235,224,0.1)] bg-[#0f1814] p-3 text-left transition-colors hover:border-gold/35 disabled:opacity-60"
    >
      <p className="text-[12px] font-medium text-cream/85">
        {disclosure.label}
      </p>
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">SEALED — reveal on request</span>
        </span>
        <span className="inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-[11px] font-medium text-gold transition-colors group-hover:bg-gold/10">
          Reveal
        </span>
      </span>
    </button>
  );
}

/* ── audit record card ─────────────────────────────────────────────── */

function AuditRecordCard({ record }: { record: AuditRecord }) {
  const wallet = useRemitStore((s) => s.wallet);
  const openWalletDialog = useRemitStore((s) => s.openWalletDialog);
  const revealFact = useRemitStore((s) => s.revealFact);
  const { toast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const asset = assetBySymbol(record.asset);
  const pill = proofPill(record.proofStatus);

  const handleReveal = async (disclosure: Disclosure) => {
    if (wallet.status !== "connected") {
      openWalletDialog(true);
      toast({ title: "Connect a wallet to continue." });
      return;
    }
    setBusyId(disclosure.id);
    try {
      await revealFact(record.id, disclosure.id);
      toast({
        title: `Fact revealed — ${disclosure.label}`,
        duration: 2600,
      });
    } catch (error) {
      toast({
        title: "Disclosure stays sealed",
        description:
          error instanceof Error
            ? error.message
            : "Field opening requires a real audit package verified against the on-chain auditRoot",
        variant: "destructive",
        duration: 12000,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6">
      {/* header */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold tracking-tight">
          {record.executionRef}
        </h3>
        <DataChip>{asset.symbol}</DataChip>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
          {record.auditRoot ? <HashChip value={record.auditRoot} label="audit" /> : (
            <span className="font-data text-[11px] text-sage">auditRoot not opened</span>
          )}
          <span className="font-data text-[11px] text-sage">
            {record.proofStatus === "verified" ? "verified" : "pending"} {timeAgo(record.verifiedAt)}
          </span>
        </div>
      </div>

      {/* disclosures */}
      <div className="space-y-2">
        <p className="eyebrow text-muted-foreground">Reveal one fact</p>
        <div className="grid grid-cols-2 gap-2">
          {record.disclosures.map((disclosure) => (
            <DisclosureTile
              key={disclosure.id}
              disclosure={disclosure}
              onReveal={(d) => void handleReveal(d)}
              busy={busyId === disclosure.id}
            />
          ))}
        </div>
      </div>

      <p className="flex items-center gap-2 border-t border-[rgba(239,235,224,0.07)] pt-3 text-[11px] text-muted-foreground">
        <EyeOff className="h-3 w-3 shrink-0 text-sage" aria-hidden="true" />
        The auditor never receives the complete mandate.
      </p>
    </article>
  );
}

/* ── view ──────────────────────────────────────────────────────────── */

export function ViewAudit() {
  const audits = useRemitStore((s) => s.audits);
  const syncStatus = useRemitStore((s) => s.syncStatus);
  const role = useRemitStore((s) => s.role);
  const setRole = useRemitStore((s) => s.setRole);

  const loading = syncStatus === "loading" || syncStatus === "idle";

  const verifiedCount = audits.filter((a) => a.proofStatus === "verified").length;
  const disclosedCount = audits.reduce(
    (sum, a) => sum + a.disclosures.filter((d) => d.state === "disclosed").length,
    0,
  );
  const sealedCount = audits.reduce(
    (sum, a) => sum + a.disclosures.filter((d) => d.state === "sealed").length,
    0,
  );

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
    <div className="space-y-6">
      {/* header */}
      <Reveal>
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Audit
          </h2>
          <p className="max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
            Verify one fact at a time. The mandate is never handed over.
          </p>
        </div>
      </Reveal>

      {/* role note */}
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
              className="min-h-10 shrink-0 border-gold/35 bg-transparent px-4 text-gold hover:bg-gold/10 hover:text-gold-2"
            >
              Switch to auditor
            </Button>
          </div>
        </Reveal>
      ) : null}

      {/* legend */}
      <Reveal delay={0.08}>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(239,235,224,0.12)] bg-[#121c17] px-3.5 text-[11.5px] text-sage">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Private — sealed by default
          </span>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3.5 text-[11.5px] text-mint">
            <Unlock className="h-3 w-3" aria-hidden="true" />
            Disclosed — revealed on request
          </span>
        </div>
      </Reveal>

      {/* summary strip */}
      <Reveal delay={0.1}>
        <div className="grid gap-5 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:grid-cols-3 sm:p-6">
          <StatBlock label="Executions with proofs" value={verifiedCount} />
          <StatBlock label="Facts disclosed" value={disclosedCount} />
          <StatBlock label="Facts sealed" value={sealedCount} />
        </div>
      </Reveal>

      {/* records */}
      {audits.length === 0 ? (
        <EmptyState
          icon={<SearchCheck className="h-5 w-5" />}
          title="No audit records yet"
          description="Every settled execution produces a proof record with individually sealed facts."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {audits.map((record, i) => (
            <Reveal key={record.id} delay={Math.min(i * 0.05, 0.25)}>
              <AuditRecordCard record={record} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
