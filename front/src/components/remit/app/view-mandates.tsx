"use client";

/**
 * Mandates — sealed policy envelopes.
 * Reads the workspace store only. No catalog fiction.
 */

import * as React from "react";
import { FileLock2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataChip,
  EmptyState,
  HashChip,
  PaperSurface,
  Reveal,
  StatusPill,
  type PillTone,
} from "@/components/remit/primitives";
import { assetBySymbol, executorById, LIVE_ASSETS } from "@/lib/remit/catalog";
import { isLikelyHash, sideLabel, timeAgo } from "@/lib/remit/format";
import type { Mandate, MandateStatus, Side } from "@/lib/remit/types";
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
  const hashInIntent = mandate.intent.split(/\s+/).find((token) => isLikelyHash(token.replace(/[.,]$/, "")));

  return (
    <PaperSurface className="min-w-0 p-5 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-data text-[13px] font-semibold text-[#1a231e]">{mandate.reference}</span>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        <DataChip>{asset.symbol}</DataChip>
        <span className="ml-auto font-data text-[10.5px] text-sage">{timeAgo(mandate.createdAt)}</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{mandate.intent}</p>
      {hashInIntent ? (
        <div className="mt-2">
          <HashChip value={hashInIntent} label="tx" />
        </div>
      ) : null}
      <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="eyebrow text-muted-foreground">Side</dt>
          <dd className="font-data text-[#1a231e]">{sideLabel(mandate.side)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-muted-foreground">Settled fills</dt>
          <dd className="font-data text-[#1a231e]">{mandate.settledFills}</dd>
        </div>
        <div className="col-span-full min-w-0">
          <dt className="eyebrow text-muted-foreground">Executor</dt>
          <dd className="text-[#1a231e]">{executor.name}</dd>
        </div>
      </dl>
    </PaperSurface>
  );
}

const fieldClass =
  "min-h-11 border-[rgba(239,235,224,0.14)] bg-[#0f1814] font-data text-cream";

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

  const [who, setWho] = React.useState("ex-remit");
  const [asset, setAsset] = React.useState("tNIGHT");
  const [side, setSide] = React.useState<Side>("buy");
  const [howMuch, setHowMuch] = React.useState("50");
  const [price, setPrice] = React.useState("0");
  const [whom, setWhom] = React.useState("");
  const [until, setUntil] = React.useState("30");

  const loading = (syncStatus === "loading" || syncStatus === "idle") && !circuitBusy;

  const seal = async () => {
    if (wallet.status !== "connected") {
      openWalletDialog(true);
      toast({ title: "Connect a wallet to continue." });
      return;
    }
    const maxFill = Number(howMuch);
    const limitPrice = Number(price);
    const expiryDays = Number(until);
    if (!Number.isFinite(maxFill) || maxFill <= 0) {
      toast({ title: "HOW MUCH must be a positive circuit unit", variant: "destructive" });
      return;
    }
    try {
      await createMandate({
        asset,
        side,
        maxFill,
        limitPrice: Number.isFinite(limitPrice) ? limitPrice : 0,
        totalBudget: 0,
        counterpartyClasses: [],
        counterpartyIds: whom.trim() ? [whom.trim()] : [],
        expiryDays: Number.isFinite(expiryDays) && expiryDays > 0 ? expiryDays : 30,
        executorId: who,
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
    <div className="min-w-0 space-y-6">
      <Reveal>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Mandates</h2>
            <p className="max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
              Private policy envelopes enforced by Compact. Openings never appear on the public ledger.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <form
          className="min-w-0 space-y-4 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void seal();
          }}
        >
          <p className="eyebrow text-gold">Seal a mandate</p>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Circuit units, not a public USD quote. Compact stores these privately. Demo lens is not
            authorization.
          </p>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="mandate-who">WHO — executor</Label>
              <Input
                id="mandate-who"
                value={who}
                onChange={(e) => setWho(e.target.value)}
                className={fieldClass}
                autoComplete="off"
              />
              <p className="text-[11px] text-sage">{executorById(who).name}</p>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="mandate-what">WHAT — asset / side</Label>
              <div className="flex min-w-0 gap-2">
                <select
                  id="mandate-what"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className={cnSelect()}
                >
                  {LIVE_ASSETS.filter((a) => a.symbol !== "DUST").map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.symbol}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Side"
                  value={side}
                  onChange={(e) => setSide(e.target.value as Side)}
                  className={cnSelect()}
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="mandate-how">HOW MUCH — max fill</Label>
              <Input
                id="mandate-how"
                inputMode="decimal"
                value={howMuch}
                onChange={(e) => setHowMuch(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="mandate-price">PRICE — limit</Label>
              <Input
                id="mandate-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="mandate-whom">WHOM — counterparty (empty = any)</Label>
              <Input
                id="mandate-whom"
                value={whom}
                onChange={(e) => setWhom(e.target.value)}
                placeholder="Leave empty for any maker"
                className={fieldClass}
                autoComplete="off"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="mandate-until">UNTIL — expiry days</Label>
              <Input
                id="mandate-until"
                inputMode="numeric"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={circuitBusy}
            className="min-h-11 bg-gold px-5 text-[#1a1409] hover:bg-gold-2"
          >
            {circuitBusy ? circuitStatus ?? "Proving on Preprod…" : "SEAL"}
          </Button>
        </form>
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
        <div className="grid min-w-0 gap-4">
          {mandates.map((mandate) => (
            <MandateCard key={mandate.id} mandate={mandate} />
          ))}
        </div>
      )}
    </div>
  );
}

function cnSelect() {
  return "min-h-11 min-w-0 flex-1 rounded-md border border-[rgba(239,235,224,0.14)] bg-[#0f1814] px-3 font-data text-sm text-cream";
}
