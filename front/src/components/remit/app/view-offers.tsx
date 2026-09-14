"use client";

/**
 * Offers — the private RFQ desk.
 *
 * Counterparties respond to sealed mandates without ever seeing the mandate
 * (or each other). Each response is scored against the private envelope and
 * can be handed to the execution engine with one deliberate action.
 */

import * as React from "react";
import { Inbox, Loader2, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataChip,
  EmptyState,
  HashChip,
  ProgressTrack,
  Reveal,
  StatusPill,
  type PillTone,
} from "@/components/remit/primitives";
import { assetBySymbol, counterpartyById, executorById } from "@/lib/remit/catalog";
import { formatUsd, pct, timeAgo } from "@/lib/remit/format";
import type { Offer, OfferState } from "@/lib/remit/types";
import { useRemitStore } from "@/store/remit";
import { useToast } from "@/hooks/use-toast";

/* ── state presentation ────────────────────────────────────────────── */

function offerPill(state: OfferState): { tone: PillTone; label: string } {
  switch (state) {
    case "compatible":
      return { tone: "verified", label: "Compatible" };
    case "incompatible":
      return { tone: "rejected", label: "Outside envelope" };
    case "new":
      return { tone: "pending", label: "New" };
    case "evaluating":
      return { tone: "pending", label: "Evaluating" };
    case "executed":
      return { tone: "settled", label: "Executed" };
    case "declined":
      return { tone: "neutral", label: "Declined" };
    case "expired":
      return { tone: "neutral", label: "Expired" };
  }
}

/* ── filters ───────────────────────────────────────────────────────── */

type OfferFilter = "all" | "compatible" | "incompatible";

const INSIDE_ENVELOPE: OfferState[] = [
  "compatible",
  "new",
  "evaluating",
  "executed",
];

function inFilter(offer: Offer, filter: OfferFilter): boolean {
  if (filter === "all") return true;
  if (filter === "compatible") return INSIDE_ENVELOPE.includes(offer.state);
  return offer.state === "incompatible";
}

/* ── one offer card ────────────────────────────────────────────────── */

function OfferCard({
  offer,
  onRun,
  makerLens,
}: {
  offer: Offer;
  onRun: (offer: Offer) => void;
  makerLens: boolean;
}) {
  const mandates = useRemitStore((s) => s.mandates);
  const declineOffer = useRemitStore((s) => s.declineOffer);
  const { toast } = useToast();

  const mandate = mandates.find((m) => m.id === offer.mandateId);
  const asset = assetBySymbol(offer.asset);
  const counterparty = counterpartyById(offer.counterpartyId);
  const pill = offerPill(offer.state);
  const expired = !offer.txHash && new Date(offer.expiresAt).getTime() < Date.now();
  const actionable = !makerLens && (offer.state === "compatible" || offer.state === "new");

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6",
        actionable && "border-[rgba(239,235,224,0.14)]",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-data text-[13px] font-semibold tracking-tight text-cream">
          {offer.reference}
        </span>
        {!makerLens && mandate ? (
          <DataChip className="border-gold/20 bg-gold/5 text-gold/80">
            {mandate.reference}
          </DataChip>
        ) : null}
        {makerLens ? (
          <StatusPill tone={offer.state === "executed" ? "settled" : "sealed"}>
            {offer.state === "executed" ? "Filled" : offer.txHash ? "Committed" : "Sealed"}
          </StatusPill>
        ) : (
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        )}
        <span
          className={cn(
            "font-data ml-auto text-[10.5px] whitespace-nowrap",
            expired ? "text-clay/80" : "text-sage",
          )}
        >
          {offer.txHash
            ? "on-chain"
            : `${expired ? "expired" : "expires"} ${timeAgo(offer.expiresAt)}`}
        </span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="min-w-0 space-y-1">
          <p className="eyebrow text-muted-foreground">Price</p>
          <p className="font-data text-[15px] font-medium tracking-tight text-cream">
            {formatUsd(offer.price, offer.price != null && offer.price < 10)}
          </p>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="eyebrow text-muted-foreground">Size</p>
          <p className="font-data text-[15px] font-medium tracking-tight text-cream">
            {formatUsd(offer.size)}
          </p>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="eyebrow text-muted-foreground">Asset</p>
          <p className="font-data text-[15px] font-medium tracking-tight text-cream">
            {asset.symbol}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[rgba(239,235,224,0.07)] bg-[#0f1814] px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-cream">{counterparty.name}</p>
          {counterparty.desk || counterparty.region ? (
            <p className="text-[11.5px] text-muted-foreground">
              {[counterparty.desk, counterparty.region].filter(Boolean).join(" · ")}
            </p>
          ) : (
            <p className="text-[11.5px] text-muted-foreground">Desk not disclosed</p>
          )}
        </div>
        {offer.txHash ? (
          <div className="ml-auto min-w-0">
            <HashChip value={offer.txHash} label="tx" />
          </div>
        ) : null}
      </div>

      {makerLens ? (
        <p className="rounded-xl border border-[rgba(239,235,224,0.08)] bg-[#101915] px-3 py-2.5 text-[12.5px] text-cream/70">
          You never see the principal&apos;s mandate. Compact enforces it. Eligible vs ineligible is
          not visible from this desk.
        </p>
      ) : offer.compatibility != null && offer.executionScore != null ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-muted-foreground">Compatibility</p>
            <p className="font-data text-[11.5px] text-gold">
              {pct(offer.compatibility)}
            </p>
          </div>
          <ProgressTrack value={offer.compatibility} max={100} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-muted-foreground">Rank (not AI)</p>
            <p className="font-data text-[11.5px] text-mint">
              {pct(offer.executionScore)}
            </p>
          </div>
          <ProgressTrack value={offer.executionScore} max={100} tone="mint" />
        </div>
      </div>
      ) : (
        <p className="rounded-xl border border-[rgba(239,235,224,0.08)] bg-[#101915] px-3 py-2.5 text-[12.5px] text-cream/60">
          Eligibility is private. Compact ranks the K openings the executor actually opened — not a public score.
        </p>
      )}

      {/* frictions */}
      {makerLens || offer.frictions.length === 0 ? null : (
        <ul className="space-y-1.5 rounded-xl border border-clay/30 bg-clay/5 p-3">
          {offer.frictions.map((friction) => (
            <li
              key={friction}
              className="flex items-start gap-2 text-[12.5px] leading-snug text-clay"
            >
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{friction}</span>
            </li>
          ))}
        </ul>
      )}

      {/* actions */}
      {actionable ? (
        <div className="mt-auto flex flex-wrap gap-2.5 pt-1">
          <Button
            size="sm"
            onClick={() => onRun(offer)}
            className="min-h-10 bg-gold px-4 text-[#1a1409] hover:bg-gold-2"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Run execution
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              declineOffer(offer.id);
              toast({ title: "Offer declined", duration: 2200 });
            }}
            className="min-h-10 px-4 text-cream/60 hover:text-cream"
          >
            Decline
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/* ── execution confirm dialog ──────────────────────────────────────── */

function ExecutionDialog({
  offer,
  onClose,
}: {
  offer: Offer | null;
  onClose: () => void;
}) {
  const mandates = useRemitStore((s) => s.mandates);
  const wallet = useRemitStore((s) => s.wallet);
  const openWalletDialog = useRemitStore((s) => s.openWalletDialog);
  const executeFill = useRemitStore((s) => s.executeFill);
  const executionStage = useRemitStore((s) => s.executionStage);
  const { toast } = useToast();
  const [running, setRunning] = React.useState(false);

  const mandate = offer ? mandates.find((m) => m.id === offer.mandateId) : undefined;
  const counterparty = offer ? counterpartyById(offer.counterpartyId) : undefined;
  const asset = offer ? assetBySymbol(offer.asset) : undefined;
  const executor = mandate ? executorById(mandate.executorId) : undefined;

  const stageNote: Record<string, string> = {
    evaluating: "Evaluating the offer against the mandate envelope…",
    checking: "Running policy checks — price, size, counterparty, budget…",
    proving: "Generating the compliance proof…",
    settling: "Proof accepted — settling on Midnight…",
    done: "Finalizing the receipt…",
  };

  const run = async () => {
    if (!offer || running) return;
    if (wallet.status !== "connected") {
      openWalletDialog(true);
      toast({ title: "Connect a wallet to continue." });
      return;
    }
    setRunning(true);
    try {
      const execution = await executeFill({ offerId: offer.id });
      onClose();
      if (execution.status === "settled") {
        toast({
          title: "Fill settled",
          description: `Receipt ${execution.receipt?.code ?? "—"} issued — proof verified.`,
        });
      } else {
        toast({
          title: "Attempt refused",
          description:
            execution.refusalReason ?? "The offer fell outside the mandate envelope.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Execution could not start",
        description: error instanceof Error ? error.message : "Fill is not simulated in this tab.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const summary: { label: string; value: string }[] = offer
    ? [
        { label: "Asset", value: asset?.symbol ?? offer.asset },
        {
          label: "Price",
          value: formatUsd(offer.price, offer.price != null && offer.price < 10),
        },
        { label: "Size", value: formatUsd(offer.size) },
        { label: "Counterparty", value: counterparty?.name ?? "—" },
        { label: "Mandate", value: mandate?.reference ?? "—" },
      ]
    : [];

  return (
    <Dialog open={offer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-[rgba(239,235,224,0.12)] bg-[#101915] sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold">
            Run execution
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Hand this response to the execution engine. Nothing settles before
            the mandate is satisfied and proven.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-0 rounded-xl border border-[rgba(239,235,224,0.08)] bg-[#121c17] px-4 py-2">
          {summary.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b border-[rgba(239,235,224,0.06)] py-2 last:border-b-0"
            >
              <dt className="text-[12px] text-muted-foreground">{row.label}</dt>
              <dd className="font-data text-[12.5px] text-cream">{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          {executor ? executor.name : "The execution engine"} will evaluate this
          offer against the private mandate and prove compliance before
          settlement.
        </p>

        {running ? (
          <p className="flex items-center gap-2 text-[12px] text-gold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {stageNote[executionStage] ?? "Working on Midnight…"}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={running}
            className="min-h-10 px-4 text-cream/60 hover:text-cream"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void run()}
            disabled={running}
            className="min-h-10 bg-gold px-5 text-[#1a1409] hover:bg-gold-2"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Executing…
              </>
            ) : (
              "Execute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── view ──────────────────────────────────────────────────────────── */

export function ViewOffers() {
  const offers = useRemitStore((s) => s.offers);
  const role = useRemitStore((s) => s.role);
  const syncStatus = useRemitStore((s) => s.syncStatus);
  const [filter, setFilter] = React.useState<OfferFilter>("all");
  const [confirmOffer, setConfirmOffer] = React.useState<Offer | null>(null);
  const [desk, setDesk] = React.useState<"inbox" | "posted">(
    role === "maker" ? "posted" : "inbox",
  );

  React.useEffect(() => {
    setDesk(role === "maker" ? "posted" : "inbox");
  }, [role]);

  const loading = syncStatus === "loading" || syncStatus === "idle";
  const makerLens = desk === "posted";
  const filtered = offers.filter((o) => (makerLens ? true : inFilter(o, filter)));

  const counts: Record<OfferFilter, number> = {
    all: offers.length,
    compatible: offers.filter((o) => inFilter(o, "compatible")).length,
    incompatible: offers.filter((o) => inFilter(o, "incompatible")).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-9 w-72 rounded-full" />
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
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
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Private liquidity
            </h2>
            <p className="max-w-lg text-[13.5px] leading-relaxed text-muted-foreground">
              {makerLens
                ? "Posted commitments. You never see the principal's mandate. Compact enforces it."
                : "Executor inbox of private RFQ openings. Demo lens is not authorization."}
            </p>
          </div>
          <div className="flex min-w-0 flex-col items-stretch gap-3 sm:items-end">
            <Tabs value={desk} onValueChange={(v) => setDesk(v as "inbox" | "posted")}>
              <TabsList className="h-10 gap-1 rounded-full border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-1">
                <TabsTrigger
                  value="inbox"
                  className="min-h-8 rounded-full px-3 text-[12px] text-cream/60 data-[state=active]:bg-gold/15 data-[state=active]:text-gold"
                >
                  Inbox (executor)
                </TabsTrigger>
                <TabsTrigger
                  value="posted"
                  className="min-h-8 rounded-full px-3 text-[12px] text-cream/60 data-[state=active]:bg-gold/15 data-[state=active]:text-gold"
                >
                  Posted (maker)
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {!makerLens ? (
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as OfferFilter)}
          >
            <TabsList className="h-10 gap-1 rounded-full border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-1">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "compatible", label: "Compatible" },
                  { value: "incompatible", label: "Incompatible" },
                ] as const
              ).map((f) => (
                <TabsTrigger
                  key={f.value}
                  value={f.value}
                  className="min-h-8 rounded-full px-3 text-[12px] text-cream/60 data-[state=active]:bg-gold/15 data-[state=active]:text-gold"
                >
                  {f.label}
                  <span className="font-data text-[10.5px] text-muted-foreground">
                    {counts[f.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
            ) : null}
          </div>
        </div>
      </Reveal>

      {makerLens ? (
        <p className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-[13px] leading-relaxed text-cream/80">
          This tab does not post RFQ boxes. Operator-placed commitments appear as sealed inventory.
          You never see the principal&apos;s mandate. Compact enforces it.
        </p>
      ) : null}

      {/* list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="No offers in this view"
          description="Adjust the filter to see the rest of your private responses."
        />
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {filtered.map((offer, i) => (
            <Reveal key={offer.id} delay={Math.min(i * 0.05, 0.25)}>
              <OfferCard offer={offer} onRun={setConfirmOffer} makerLens={makerLens} />
            </Reveal>
          ))}
        </div>
      )}

      <ExecutionDialog offer={confirmOffer} onClose={() => setConfirmOffer(null)} />
    </div>
  );
}
