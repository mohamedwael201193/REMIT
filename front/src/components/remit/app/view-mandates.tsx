"use client";

/**
 * Mandates — sealed policy envelopes.
 * Reads the workspace store only. No catalog fiction.
 */

import * as React from "react";
import { FileLock2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataChip,
  EmptyState,
  PaperSurface,
  Reveal,
  StatusPill,
  type PillTone,
} from "@/components/remit/primitives";
import { assetBySymbol, executorById } from "@/lib/remit/catalog";
import { sideLabel, timeAgo } from "@/lib/remit/format";
import type { Mandate, MandateStatus } from "@/lib/remit/types";
import { useRemitStore } from "@/store/remit";
import { useToast } from "@/hooks/use-toast";

function mandatePill(status: MandateStatus): { tone: PillTone; label: string } {
  switch (status) {
    case "active":
      return { tone: "verified", label: "Active" };
    case "sealed":
      return { tone: "private", label: "Sealed" };
    case "revoked":
      return { tone: "rejected", label: "Revoked" };
    case "exhausted":
      return { tone: "neutral", label: "Exhausted" };
    case "expired":
      return { tone: "neutral", label: "Expired" };
  }
}

function MandateCard({ mandate }: { mandate: Mandate }) {
  const asset = assetBySymbol(mandate.asset);
  const executor = executorById(mandate.executorId);
  const pill = mandatePill(mandate.status);

  return (
    <PaperSurface className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-data text-[13px] font-semibold text-cream">{mandate.reference}</span>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        <DataChip>{asset.symbol}</DataChip>
        <span className="ml-auto font-data text-[10.5px] text-sage">{timeAgo(mandate.createdAt)}</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{mandate.intent}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
        <div>
          <dt className="eyebrow text-muted-foreground">Side</dt>
          <dd className="font-data text-cream">{sideLabel(mandate.side)}</dd>
        </div>
        <div>
          <dt className="eyebrow text-muted-foreground">Settled fills</dt>
          <dd className="font-data text-cream">{mandate.settledFills}</dd>
        </div>
        <div className="col-span-2">
          <dt className="eyebrow text-muted-foreground">Executor</dt>
          <dd className="text-cream">{executor.name}</dd>
        </div>
      </dl>
    </PaperSurface>
  );
}

export function ViewMandates() {
  const mandates = useRemitStore((s) => s.mandates);
  const wallet = useRemitStore((s) => s.wallet);
  const openWalletDialog = useRemitStore((s) => s.openWalletDialog);
  const createMandate = useRemitStore((s) => s.createMandate);
  const syncStatus = useRemitStore((s) => s.syncStatus);
  const circuitBusy = useRemitStore((s) => s.circuitBusy);
  const circuitStatus = useRemitStore((s) => s.circuitStatus);
  const lastError = useRemitStore((s) => s.lastError);
  const { toast } = useToast();

  const loading = (syncStatus === "loading" || syncStatus === "idle") && !circuitBusy;

  const seal = async () => {
    if (wallet.status !== "connected") {
      openWalletDialog(true);
      toast({ title: "Connect a wallet to continue." });
      return;
    }
    try {
      await createMandate({
        asset: "tNIGHT",
        side: "buy",
        maxFill: 50,
        limitPrice: 0,
        totalBudget: 0,
        counterpartyClasses: [],
        counterpartyIds: [],
        expiryDays: 30,
        executorId: "ex-remit",
        intent: "Preprod mandate",
      });
      toast({ title: "Mandate sealed on Preprod", duration: 8000 });
    } catch (error) {
      toast({
        title: "Mandate was not created",
        description: error instanceof Error ? error.message : "Compact circuit-call required",
        variant: "destructive",
        duration: 20000,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Mandates</h2>
            <p className="max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
              Private policy envelopes enforced by Compact. Openings never appear on the public ledger.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => void seal()}
            disabled={circuitBusy}
            className="min-h-10 bg-gold px-4 text-[#1a1409] hover:bg-gold-2"
          >
            {circuitBusy ? circuitStatus ?? "Proving on Preprod…" : "Seal a mandate"}
          </Button>
        </div>
      </Reveal>
      {lastError ? (
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-clay">{lastError}</p>
      ) : null}
      {mandates.length === 0 ? (
        <EmptyState
          icon={<FileLock2 className="h-5 w-5" />}
          title="No indexer-backed mandate yet"
          description="A mandate appears here after createMandate is confirmed by the Preprod indexer."
        />
      ) : (
        <div className="grid gap-4">
          {mandates.map((mandate) => (
            <MandateCard key={mandate.id} mandate={mandate} />
          ))}
        </div>
      )}
    </div>
  );
}
