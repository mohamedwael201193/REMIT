"use client";

/**
 * REMIT workspace state.
 *
 * Navigation (landing ⇄ workspace, workspace views, role), wallet session
 * and the data slices served by the provider. Views never call the
 * provider directly — they dispatch actions here so the future SDK swap
 * stays a one-file change.
 */

import { create } from "zustand";
import { getRemitProvider } from "@/lib/remit/live-provider";
import { publicAgentView } from "@/lib/remit/agent-public";
import { fetchRemitAgentStatus, type RemitAgentStatus } from "@/lib/remit/public-client";
import {
  isIndexerSettled,
  type ActivityItem,
  type AuditRecord,
  type Execution,
  type FillAttemptInput,
  type Mandate,
  type NewMandateInput,
  type NewOfferInput,
  type Offer,
  type PortfolioSnapshot,
  type RemitProvider,
  type Role,
  type WalletProviderKind,
  type WalletState,
} from "@/lib/remit/types";

export type AppView =
  | "overview"
  | "mandates"
  | "offers"
  | "executions"
  | "audit"
  | "settings";

export type SyncStatus = "idle" | "loading" | "ready" | "error";

function explainCircuitError(message: string): string {
  if (/Wallet UI disconnected|Wallet not initialized/i.test(message)) {
    return "1AM closed its proving toolbar. Click the 1AM icon, keep it open through Compact prove, then retry.";
  }
  return message;
}

interface RemitState {
  /* navigation */
  mode: "landing" | "workspace";
  appView: AppView;
  role: Role;

  /* wallet */
  wallet: WalletState;
  walletDialogOpen: boolean;

  /* data slices */
  portfolio: PortfolioSnapshot | null;
  mandates: Mandate[];
  offers: Offer[];
  postedOffers: Offer[];
  executions: Execution[];
  audits: AuditRecord[];
  activity: ActivityItem[];
  /** Public GET /agent/status — counts only. Null when not fetched. */
  agentStatus: RemitAgentStatus | null;
  agentStatusError: string | null;
  syncStatus: SyncStatus;
  syncedAt: number | null;

  /* execution flow */
  executionStage:
    | "idle"
    | "evaluating"
    | "checking"
    | "proving"
    | "settling"
    | "done";
  lastExecution: Execution | null;

  /* actions */
  enterWorkspace: () => void;
  returnToLanding: () => void;
  setAppView: (view: AppView) => void;
  setRole: (role: Role) => void;

  openWalletDialog: (open: boolean) => void;
  connectWallet: (provider: WalletProviderKind) => Promise<boolean>;
  restoreWalletSession: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  lastError: string | null;
  circuitBusy: boolean;
  circuitStatus: string | null;

  syncWorkspace: () => Promise<void>;
  createMandate: (input: NewMandateInput) => Promise<Mandate>;
  placeOffer: (input: NewOfferInput) => Promise<Offer>;
  executeFill: (input: FillAttemptInput) => Promise<Execution>;
  declineOffer: (offerId: string) => void;
  revokeMandates: () => Promise<void>;
  withdrawLeftover: () => Promise<void>;
  revealFact: (auditId: string, disclosureId: string) => Promise<void>;
  probeForgedDisclosure: () => Promise<{ ok: boolean; failed: string[]; auditRoot?: string }>;
}

const provider: RemitProvider = getRemitProvider();

const initialWallet: WalletState = {
  provider: null,
  address: null,
  network: "Midnight",
  networkId: null,
  dust: null,
  dustHeader: undefined,
  status: "disconnected",
  lastError: null,
};

export const useRemitStore = create<RemitState>((set, get) => ({
  mode: "landing",
  appView: "overview",
  role: "principal",

  wallet: initialWallet,
  walletDialogOpen: false,
  lastError: null,
  circuitBusy: false,
  circuitStatus: null,

  portfolio: null,
  mandates: [],
  offers: [],
  postedOffers: [],
  executions: [],
  audits: [],
  activity: [],
  agentStatus: null,
  agentStatusError: null,
  syncStatus: "idle",
  syncedAt: null,

  executionStage: "idle",
  lastExecution: null,

  enterWorkspace: () => {
    set({ mode: "workspace", appView: "overview" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    void get().syncWorkspace();
  },

  returnToLanding: () => {
    set({ mode: "landing", executionStage: "idle" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },

  setAppView: (view) => {
    set({ appView: view });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },

  setRole: (role) => set({ role }),

  openWalletDialog: (open) => set({ walletDialogOpen: open }),

  connectWallet: async (walletProvider) => {
    set({ wallet: { ...get().wallet, status: "connecting", lastError: null }, lastError: null });
    try {
      const previous = get().wallet.address;
      const wallet = await provider.connectWallet(walletProvider);
      if (wallet.status !== "connected" || !wallet.address) {
        throw new Error("connector did not report connected");
      }
      const identityChanged = Boolean(previous && wallet.address !== previous);
      set({
        wallet,
        walletDialogOpen: false,
        lastError: null,
        ...(identityChanged
          ? { postedOffers: [], lastExecution: null, mandates: [], circuitStatus: null }
          : {}),
      });
      if (identityChanged) await get().syncWorkspace();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "wallet connect failed";
      set({ wallet: { ...initialWallet, lastError: message }, lastError: message });
      return false;
    }
  },

  restoreWalletSession: async () => {
    if (typeof provider.restoreWallet !== "function") return;
    const current = get().wallet;
    if (current.status === "connected" || current.status === "connecting" || current.status === "reconnecting") {
      return;
    }
    set({
      wallet: { ...current, status: "reconnecting", lastError: null },
      postedOffers: [],
      lastExecution: null,
      mandates: [],
      lastError: null,
    });
    try {
      const wallet = await provider.restoreWallet();
      set({ wallet, lastError: wallet.lastError ?? null });
      if (wallet.status === "connected") await get().syncWorkspace();
    } catch (error) {
      const message = error instanceof Error ? error.message : "wallet reconnect failed";
      set({
        wallet: { ...initialWallet, lastError: message },
        lastError: message,
        postedOffers: [],
        lastExecution: null,
        mandates: [],
      });
    }
  },

  disconnectWallet: async () => {
    const wallet = await provider.disconnectWallet();
    set({
      wallet,
      postedOffers: [],
      lastExecution: null,
      mandates: [],
      circuitStatus: null,
      lastError: null,
    });
    await get().syncWorkspace();
  },

  syncWorkspace: async () => {
    set({ syncStatus: "loading" });
    try {
      const [portfolio, mandates, offers, executions, audits, activity] =
        await Promise.all([
          provider.getPortfolio(),
          provider.getMandates(),
          provider.getOffers(),
          provider.getExecutions(),
          provider.getAudit(),
          provider.getActivity(),
        ]);
      let agentStatus: RemitAgentStatus | null = get().agentStatus;
      let agentStatusError: string | null = get().agentStatusError;
      const apiUrl = process.env.NEXT_PUBLIC_REMIT_API_URL ?? "";
      if (!apiUrl) {
        agentStatus = null;
        agentStatusError = "API URL not configured — GET /agent/status was not called.";
      } else {
        try {
          agentStatus = publicAgentView(await fetchRemitAgentStatus(apiUrl));
          agentStatusError = null;
        } catch (err: unknown) {
          agentStatusError = err instanceof Error ? err.message : "GET /agent/status failed";
        }
      }
      const posted = get().postedOffers;
      const seen = new Set(offers.map((o) => o.txHash || o.id));
      const mergedOffers = [
        ...offers,
        ...posted.filter((o) => (o.txHash ? !seen.has(o.txHash) : !seen.has(o.id))),
      ];
      set({
        portfolio,
        mandates,
        offers: mergedOffers,
        executions,
        audits,
        activity,
        agentStatus,
        agentStatusError,
        syncStatus: "ready",
        syncedAt: Date.now(),
        lastExecution:
          agentStatus?.last?.submitted && agentStatus.last.txHash
            ? executions.find((e) => e.txHash === agentStatus.last?.txHash) ?? get().lastExecution
            : get().lastExecution,
        executionStage:
          agentStatus?.last?.submitted && agentStatus.last.txHash
            ? "done"
            : get().executionStage,
      });
    } catch (error) {
      set({
        syncStatus: "error",
        lastError: error instanceof Error ? error.message : "workspace sync failed",
      });
    }
  },

  createMandate: async (input) => {
    set({ circuitBusy: true, circuitStatus: "Proving deposit and createMandate on Preprod", lastError: null });
    try {
      const mandate = await provider.createMandate(input);
      await get().syncWorkspace();
      set({
        mandates: get().mandates.map((m) =>
          m.id === mandate.id
            ? {
                ...m,
                maxFill: mandate.maxFill || m.maxFill,
                limitPrice: mandate.limitPrice || m.limitPrice,
                totalBudget: mandate.totalBudget || m.totalBudget,
                intent: mandate.intent || m.intent,
              }
            : m,
        ),
      });
      return mandate;
    } catch (error) {
      const message = explainCircuitError(error instanceof Error ? error.message : "Compact circuit-call required");
      set({ lastError: message });
      throw error;
    } finally {
      set({ circuitBusy: false, circuitStatus: null });
    }
  },

  placeOffer: async (input) => {
    set({ circuitBusy: true, circuitStatus: "Proving deposit, placeOffer, and posting encrypted RFQ", lastError: null });
    try {
      const offer = await provider.placeOffer(input);
      set({ postedOffers: [offer, ...get().postedOffers.filter((o) => o.id !== offer.id)] });
      await get().syncWorkspace();
      return offer;
    } catch (error) {
      const message = explainCircuitError(error instanceof Error ? error.message : "Compact circuit-call required");
      set({ lastError: message });
      throw error;
    } finally {
      set({ circuitBusy: false, circuitStatus: null });
    }
  },

  executeFill: async (input) => {
    set({ executionStage: "evaluating", lastExecution: null });
    try {
      const execution = await provider.executeFill(input);
      if (execution.status === "rejected") {
        set({ executionStage: "idle", lastExecution: execution });
      } else if (isIndexerSettled(execution)) {
        set({ executionStage: "done", lastExecution: execution });
      } else if (execution.status === "proof-pending" || execution.status === "settled") {
        set({
          executionStage: execution.status === "settled" ? "settling" : "proving",
          lastExecution: execution,
        });
      } else {
        set({ executionStage: "checking", lastExecution: execution });
      }
      await get().syncWorkspace();
      return execution;
    } catch (error) {
      set({ executionStage: "idle" });
      throw error;
    }
  },

  declineOffer: (offerId) => {
    set({
      offers: get().offers.map((o) =>
        o.id === offerId ? { ...o, state: "declined" } : o,
      ),
      lastError: "Local hide only — on-chain cancelOffer is required to remove a pool offer",
    });
  },

  revokeMandates: async () => {
    set({ circuitBusy: true, circuitStatus: "Proving revokeMandate on Preprod", lastError: null });
    try {
      await provider.revokeMandates();
      await get().syncWorkspace();
    } catch (error) {
      const message = explainCircuitError(error instanceof Error ? error.message : "revokeMandate required Compact circuit-call");
      set({ lastError: message });
      throw error;
    } finally {
      set({ circuitBusy: false, circuitStatus: null });
    }
  },

  withdrawLeftover: async () => {
    set({ circuitBusy: true, circuitStatus: "Proving withdraw on Preprod", lastError: null });
    try {
      await provider.withdrawLeftover();
      await get().syncWorkspace();
    } catch (error) {
      const message = explainCircuitError(error instanceof Error ? error.message : "withdraw required Compact circuit-call");
      set({ lastError: message });
      throw error;
    } finally {
      set({ circuitBusy: false, circuitStatus: null });
    }
  },

  revealFact: async (auditId, disclosureId) => {
    const disclosure = await provider.revealFact(auditId, disclosureId);
    set({
      audits: get().audits.map((a) =>
        a.id !== auditId
          ? a
          : {
              ...a,
              proofStatus: disclosure.state === "verified" ? "verified" : a.proofStatus,
              disclosures: a.disclosures.map((d) =>
                d.id === disclosure.id ? disclosure : d,
              ),
            },
      ),
    });
  },

  probeForgedDisclosure: async () => {
    return provider.probeForgedDisclosure();
  },
}));
