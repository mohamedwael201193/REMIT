"use client";

/**
 * Wallet connection — infrastructure underneath the product.
 *
 * 1AM and Lace on Midnight. Connecting is a state transition, never
 * the centerpiece of the experience.
 */

import * as React from "react";
import {
  Check,
  ChevronDown,
  Copy,
  LogOut,
  RefreshCcw,
  Wallet as WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LaceMark, OneAmMark, walletMark, walletName } from "@/components/remit/brand";
import { useRemitStore } from "@/store/remit";
import { useToast } from "@/hooks/use-toast";
import { shortAddress } from "@/lib/remit/format";
import {
  beginConnect,
  injectedApiForKind,
  LACE_CONNECT_TIMEOUT_MESSAGE,
} from "@/lib/remit/midnight-connector";
import type { WalletProviderKind } from "@/lib/remit/types";

const CONNECT_NETWORK = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? "preprod";

function startConnectInClick(kind: WalletProviderKind): void {
  const api = injectedApiForKind(kind, window);
  beginConnect(api, kind, CONNECT_NETWORK);
}

const PROVIDERS: {
  kind: WalletProviderKind;
  name: string;
  blurb: string;
}[] = [
  { kind: "1am", name: "1AM", blurb: "Recommended for Preprod / browser proving" },
  { kind: "lace", name: "Lace", blurb: "Alternative wallet · local proof-server may be required" },
];

function productWalletError(kind: WalletProviderKind | null, message: string): string {
  if (kind === "lace" || /lace/i.test(message)) {
    if (
      /timeout|did not complete|did not resolve|proof-server|unavailable for proving|trouble connecting/i.test(
        message,
      )
    ) {
      return LACE_CONNECT_TIMEOUT_MESSAGE;
    }
  }
  return message;
}

export function ConnectWalletDialog() {
  const open = useRemitStore((s) => s.walletDialogOpen);
  const setOpen = useRemitStore((s) => s.openWalletDialog);
  const connectWallet = useRemitStore((s) => s.connectWallet);
  const lastError = useRemitStore((s) => s.lastError);
  const [pending, setPending] = React.useState<WalletProviderKind | null>(null);
  const { toast } = useToast();

  const connect = async (kind: WalletProviderKind) => {
    setPending(kind);
    const ok = await connectWallet(kind);
    setPending(null);
    if (!ok) {
      const raw = useRemitStore.getState().lastError ?? "Connect must run in this click with 1AM or Lace.";
      const message = productWalletError(kind, raw);
      const laceGuide = message === LACE_CONNECT_TIMEOUT_MESSAGE;
      toast({
        title: laceGuide ? "Try 1AM for the Preprod demo" : "Wallet did not connect",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md border-[rgba(239,235,224,0.12)] bg-[#101915] sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold">
            Connect a wallet
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            REMIT never asks for your seed phrase. Your keys stay in your
            wallet — REMIT only ever sees public account references.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.kind}
              onClick={() => {
                try {
                  startConnectInClick(p.kind);
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Wallet is not injected in this Chrome tab";
                  toast({ title: "Wallet did not connect", description: message, variant: "destructive" });
                  return;
                }
                void connect(p.kind);
              }}
              disabled={pending !== null}
            className="group flex min-h-11 w-full items-center gap-4 rounded-xl border border-[rgba(239,235,224,0.12)] bg-[#121c17] p-4 text-left transition-colors hover:border-gold/40 disabled:opacity-60"
            >
              {walletMark(p.kind)}
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="block text-[15px] font-semibold text-cream">
                    {p.name}
                  </span>
                  {p.kind === "1am" ? (
                    <span className="rounded-md border border-gold/30 bg-gold/10 px-1.5 py-0.5 font-data text-[10px] tracking-wide text-gold">
                      Recommended
                    </span>
                  ) : null}
                </span>
                <span className="block text-[12.5px] text-muted-foreground">
                  {p.blurb}
                </span>
              </span>
              {pending === p.kind ? (
                <span className="flex items-center gap-2 text-[11px] text-gold">
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  {p.kind === "lace" ? "Waiting for Lace authorization" : "Connecting"}
                </span>
              ) : (
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground transition-transform group-hover:text-gold" />
              )}
            </button>
          ))}
        </div>

        <p className="pt-1 text-center text-[11.5px] leading-relaxed text-muted-foreground">
          1AM is recommended for the Preprod demo. Lace is an alternative wallet;
          a local proof-server may be required. REMIT never asks for a seed.
        </p>
        {lastError ? (
          <p className="text-center text-[12px] text-clay">{productWalletError(pending, lastError)}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function WalletButton() {
  const wallet = useRemitStore((s) => s.wallet);
  const openDialog = useRemitStore((s) => s.openWalletDialog);
  const disconnectWallet = useRemitStore((s) => s.disconnectWallet);
  const restoreWalletSession = useRemitStore((s) => s.restoreWalletSession);
  const connectWallet = useRemitStore((s) => s.connectWallet);
  const { toast } = useToast();

  React.useEffect(() => {
    void restoreWalletSession();
  }, [restoreWalletSession]);

  if (wallet.status === "reconnecting") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-11 min-w-0 shrink gap-2 border-[rgba(239,235,224,0.16)] bg-transparent px-3 text-[13px] text-cream/85"
      >
        <RefreshCcw className="h-4 w-4 shrink-0 animate-spin text-gold" />
        <span>Reconnecting</span>
      </Button>
    );
  }

  if (wallet.status === "disconnected") {
    const needsGesture = Boolean(wallet.lastError && /Reconnect wallet/i.test(wallet.lastError));
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (needsGesture && wallet.provider) {
            try {
              startConnectInClick(wallet.provider);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Wallet is not injected in this Chrome tab";
              toast({ title: "Wallet did not connect", description: message, variant: "destructive" });
              return;
            }
            void connectWallet(wallet.provider);
            return;
          }
          openDialog(true);
        }}
        className="h-11 min-w-0 shrink gap-2 border-[rgba(239,235,224,0.16)] bg-transparent px-3 text-[13px] whitespace-normal text-cream/85 hover:bg-[rgba(239,235,224,0.06)] hover:text-cream"
      >
        <WalletIcon className="h-4 w-4 shrink-0 text-gold" />
        <span className="hidden sm:inline">{needsGesture ? "Reconnect wallet" : "Connect wallet"}</span>
        <span className="sm:hidden">{needsGesture ? "Reconnect" : "Connect"}</span>
      </Button>
    );
  }

  if (wallet.status === "connecting") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-11 min-w-0 shrink gap-2 border-[rgba(239,235,224,0.16)] bg-transparent px-3 text-[13px] whitespace-normal text-cream/60"
      >
        <RefreshCcw className="h-3.5 w-3.5 animate-spin text-gold" />
        {wallet.provider === "lace" ? "Waiting for Lace authorization" : "Connecting…"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto min-h-11 min-w-0 max-w-full shrink gap-2 border-[rgba(239,235,224,0.16)] bg-[#121c17] px-2 py-1.5 text-[13px] whitespace-normal text-cream/90 hover:bg-[#18241e] hover:text-cream sm:px-3"
        >
          <span className="flex min-w-0 items-center gap-2">
            {wallet.provider === "1am" ? (
              <OneAmMark className="h-6 w-6 shrink-0 rounded-lg" />
            ) : (
              <LaceMark className="h-6 w-6 shrink-0 rounded-lg" />
            )}
            <span className="font-data min-w-0 truncate text-[12px]">
              {wallet.address ? shortAddress(wallet.address) : wallet.provider === "lace" ? "Lace · connected" : "connected"}
            </span>
          </span>
          {wallet.dustHeader ? (
            <span className="hidden min-w-0 max-w-[7.5rem] truncate items-center rounded-md border border-gold/25 bg-gold/10 px-2 py-0.5 font-data text-[11px] text-gold lg:inline-flex">
              {wallet.dustHeader}
            </span>
          ) : null}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border-[rgba(239,235,224,0.12)] bg-[#101915]"
      >
        <DropdownMenuLabel className="space-y-1.5 font-normal">
          <p className="text-[13px] font-semibold text-cream">
            {walletName(wallet.provider!)} · connected
          </p>
          <p className="flex items-center gap-1.5 font-data text-[11px] text-muted-foreground">
            <Check className="h-3 w-3 text-mint" /> Network: {wallet.networkId ?? "Midnight Preprod"}
          </p>
          {wallet.provingPath === "lace-http" ? (
            <p className="font-data text-[11px] text-cream/70">
              {wallet.methodsReady === false
                ? "Connected. Wallet session unavailable for proving."
                : wallet.proofServerReady === false
                  ? "Connected. Local proof-server required for proving."
                  : "Proving: local proof-server 8.1.0"}
            </p>
          ) : wallet.provingPath === "1am-intab" ? (
            <p className="font-data text-[11px] text-cream/70">Proving: browser (1AM)</p>
          ) : null}
          {wallet.dustHeader ? (
            <p className="font-data min-w-0 truncate text-[11px] text-gold" title={wallet.dustHeader}>
              {wallet.dustHeader}
              <span className="mt-0.5 block text-[10px] text-sage">header DUST is not spendable coins</span>
            </p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[rgba(239,235,224,0.09)]" />
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard?.writeText(wallet.address ?? "");
            toast({ title: "Address copied", duration: 2000 });
          }}
          className="gap-2 text-[13px] text-cream/80"
        >
          <Copy className="h-3.5 w-3.5" /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openDialog(true)}
          className="gap-2 text-[13px] text-cream/80"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Switch wallet
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[rgba(239,235,224,0.09)]" />
        <DropdownMenuItem
          onClick={() => void disconnectWallet()}
          className="gap-2 text-[13px] text-clay focus:text-clay"
        >
          <LogOut className="h-3.5 w-3.5" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
