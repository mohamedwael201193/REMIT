"use client";

/**
 * Settings — profile, wallet, privacy and notifications.
 *
 * Workspace-level configuration. The quiet danger zone at the bottom
 * revokes every executor authorization in one deliberate, confirmed step.
 */

import * as React from "react";
import { Loader2, Lock, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataChip, Reveal } from "@/components/remit/primitives";
import { LaceMark, OneAmMark } from "@/components/remit/brand";
import { useRemitStore } from "@/store/remit";
import { useToast } from "@/hooks/use-toast";
import { shortAddress } from "@/lib/remit/format";

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/* ── shared row for preference switches ────────────────────────────── */

function PreferenceRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 space-y-1">
        <p className="text-[13.5px] font-medium text-cream/90">{label}</p>
        {description ? (
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 py-2">{children}</div>
    </div>
  );
}

const cardClass =
  "rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-4 sm:p-6";

const switchClass = "h-6 w-11 cursor-pointer";

/* ── view ──────────────────────────────────────────────────────────── */

export function ViewSettings() {
  const role = useRemitStore((s) => s.role);
  const wallet = useRemitStore((s) => s.wallet);
  const openWalletDialog = useRemitStore((s) => s.openWalletDialog);
  const disconnectWallet = useRemitStore((s) => s.disconnectWallet);
  const syncStatus = useRemitStore((s) => s.syncStatus);
  const { toast } = useToast();

  /* privacy preferences (workspace-local) */
  const [confirmEveryExecution, setConfirmEveryExecution] =
    React.useState(true);
  const [autoExpireOutside, setAutoExpireOutside] = React.useState(true);

  /* notifications (workspace-local) */
  const [notifyProof, setNotifyProof] = React.useState(true);
  const [notifyOffer, setNotifyOffer] = React.useState(true);
  const [notifySettlement, setNotifySettlement] = React.useState(true);
  const [notifyExpiry, setNotifyExpiry] = React.useState(false);

  const savedToast = () =>
    toast({ title: "Preference saved to this workspace", duration: 2200 });

  const loading = syncStatus === "loading" || syncStatus === "idle";
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* header */}
      <Reveal>
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Settings
          </h2>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            Profile, wallet, privacy and notifications for this workspace.
          </p>
        </div>
      </Reveal>

      {/* profile */}
      <Reveal delay={0.05}>
        <section aria-label="Profile" className={cardClass}>
          <p className="eyebrow text-muted-foreground">Profile</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border border-gold/30">
                <AvatarFallback className="bg-gold/15 font-display text-lg font-semibold text-gold">
                  {wallet.address ? wallet.address.slice(3, 5).toUpperCase() : roleLabel(role).slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1.5">
                <p className="font-display text-lg font-semibold tracking-tight" title={wallet.address ?? undefined}>
                  {wallet.address ? shortAddress(wallet.address) : "Not connected"}
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  Midnight Preprod · {roleLabel(role)}
                </p>
                <DataChip>role · {roleLabel(role)}</DataChip>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast({
                  title: "Profile details are managed by your desk administrator.",
                  duration: 2600,
                })
              }
              className="min-h-10 self-start px-4 text-cream/60 hover:text-cream sm:self-center"
            >
              Edit profile
            </Button>
          </div>
        </section>
      </Reveal>

      {/* wallet */}
      <Reveal delay={0.08}>
        <section aria-label="Wallet" className={cardClass}>
          <p className="eyebrow text-muted-foreground">Wallet</p>

          <div className="mt-4">
            {wallet.status === "connected" && wallet.address ? (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  {wallet.provider === "1am" ? (
                    <OneAmMark className="h-12 w-12 shrink-0" />
                  ) : (
                    <LaceMark className="h-12 w-12 shrink-0" />
                  )}
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[14px] font-semibold text-cream">
                      {wallet.provider === "1am" ? "1AM" : "Lace"} · connected
                      to {wallet.network}
                    </p>
                    <p className="font-data text-[11.5px] leading-relaxed break-all text-cream/60">
                      {wallet.address}
                    </p>
                    <p className="font-data text-[12.5px] text-gold">
                      {wallet.dustHeader ?? "header DUST is not spendable coins"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWalletDialog(true)}
                    className="min-h-10 px-4"
                  >
                    Switch wallet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void disconnectWallet()}
                    className="min-h-10 border-clay/40 px-4 text-clay hover:bg-clay/10 hover:text-clay"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : wallet.status === "connecting" ? (
              <p className="flex min-h-11 items-center gap-2.5 text-[13px] text-cream/70">
                <Loader2
                  className="h-4 w-4 animate-spin text-gold"
                  aria-hidden="true"
                />
                Connecting to Midnight…
              </p>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(239,235,224,0.12)] bg-[#18241e] text-sage">
                    <Wallet className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-[14px] font-semibold text-cream">
                      No wallet connected
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Connect a wallet to confirm executions and grant
                      disclosures.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => openWalletDialog(true)}
                  className="min-h-10 bg-gold px-4 text-[#1a1409] hover:bg-gold-2"
                >
                  Connect wallet
                </Button>
              </div>
            )}
          </div>

          <p className="mt-5 flex items-center gap-2 border-t border-[rgba(239,235,224,0.07)] pt-4 text-[11.5px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true" />
            REMIT never asks for your seed phrase.
          </p>
        </section>
      </Reveal>

      {/* privacy preferences */}
      <Reveal delay={0.11}>
        <section aria-label="Privacy preferences" className={cardClass}>
          <p className="eyebrow text-muted-foreground">Privacy preferences</p>
          <div className="mt-2 divide-y divide-[rgba(239,235,224,0.07)]">
            <PreferenceRow
              label="Require wallet confirmation for every execution"
              description="The engine pauses for a signed approval before any fill settles."
            >
              <Switch
                checked={confirmEveryExecution}
                onCheckedChange={(v) => {
                  setConfirmEveryExecution(v);
                  savedToast();
                }}
                aria-label="Require wallet confirmation for every execution"
                className={switchClass}
              />
            </PreferenceRow>
            <PreferenceRow
              label="Auto-expire offers outside the envelope"
              description="Responses that breach the mandate envelope expire on arrival."
            >
              <Switch
                checked={autoExpireOutside}
                onCheckedChange={(v) => {
                  setAutoExpireOutside(v);
                  savedToast();
                }}
                aria-label="Auto-expire offers outside the envelope"
                className={switchClass}
              />
            </PreferenceRow>
            <PreferenceRow
              label="Grant auditors single-fact disclosures only"
              description={
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-gold" aria-hidden="true" />
                  enforced by protocol
                </span>
              }
            >
              <Switch
                checked
                disabled
                aria-label="Grant auditors single-fact disclosures only — enforced by protocol"
                className={switchClass}
              />
            </PreferenceRow>
          </div>
        </section>
      </Reveal>

      {/* notifications */}
      <Reveal delay={0.14}>
        <section aria-label="Notifications" className={cardClass}>
          <p className="eyebrow text-muted-foreground">Notifications</p>
          <div className="mt-2 divide-y divide-[rgba(239,235,224,0.07)]">
            <PreferenceRow label="Proof verified">
              <Switch
                checked={notifyProof}
                onCheckedChange={(v) => {
                  setNotifyProof(v);
                  savedToast();
                }}
                aria-label="Notify when a proof is verified"
                className={switchClass}
              />
            </PreferenceRow>
            <PreferenceRow label="Offer received">
              <Switch
                checked={notifyOffer}
                onCheckedChange={(v) => {
                  setNotifyOffer(v);
                  savedToast();
                }}
                aria-label="Notify when an offer is received"
                className={switchClass}
              />
            </PreferenceRow>
            <PreferenceRow label="Settlement completed">
              <Switch
                checked={notifySettlement}
                onCheckedChange={(v) => {
                  setNotifySettlement(v);
                  savedToast();
                }}
                aria-label="Notify when a settlement completes"
                className={switchClass}
              />
            </PreferenceRow>
            <PreferenceRow label="Mandate expiring within 48h">
              <Switch
                checked={notifyExpiry}
                onCheckedChange={(v) => {
                  setNotifyExpiry(v);
                  savedToast();
                }}
                aria-label="Notify when a mandate expires within 48 hours"
                className={switchClass}
              />
            </PreferenceRow>
          </div>
        </section>
      </Reveal>

      {/* authorization */}
      <Reveal delay={0.17}>
        <section aria-label="Authorization" className={cardClass}>
          <p className="eyebrow text-clay/80">Authorization</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[14px] font-semibold text-cream/90">
                Executor authorizations
              </p>
              <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                Remove the engine&apos;s authority to fill under any active
                mandate.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="min-h-10 border-clay/40 bg-transparent px-4 text-clay hover:bg-clay/10 hover:text-clay"
                >
                  Revoke all executor authorizations
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md border-[rgba(239,235,224,0.12)] bg-[#101915] sm:rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-xl font-semibold">
                    Revoke authorizations?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[13px] leading-relaxed">
                    Executors will no longer be able to fill under any active
                    mandate. Past receipts remain verifiable.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="min-h-10">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="min-h-10 border-clay/50 bg-clay/90 text-white hover:bg-clay"
                    onClick={() => {
                      void (async () => {
                        try {
                          await useRemitStore.getState().revokeMandates();
                          toast({
                            title: "Revoke submitted only if Compact + indexer confirmed it",
                            duration: 2800,
                          });
                        } catch (error) {
                          toast({
                            title: "Revoke did not settle",
                            description:
                              error instanceof Error
                                ? error.message
                                : "On-chain revokeMandate is required",
                            variant: "destructive",
                          });
                        }
                      })();
                    }}
                  >
                    Revoke all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
