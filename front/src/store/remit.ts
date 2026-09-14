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
import type {
  ActivityItem,
  AuditRecord,
  Execution,
  FillAttemptInput,
  Mandate,
  NewMandateInput,
  Offer,
  PortfolioSnapshot,
  RemitProvider,
  Role,
  WalletProviderKind,
  WalletState,
} from "@/lib/remit/types";

export type AppView =
  | "overview"
  | "mandates"
  | "offers"
  | "executions"
  | "audit"
  | "settings";

export type SyncStatus = "idle" | "loading" | "ready" | "error";

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
  executions: Execution[];
  audits: AuditRecord[];
  activity: ActivityItem[];
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
  disconnectWallet: () => Promise<void>;
  lastError: string | null;
  circuitBusy: boolean;
  circuitStatus: string | null;

  syncWorkspace: () => Promise<void>;
  createMandate: (input: NewMandateInput) => Promise<Mandate>;
  executeFill: (input: FillAttemptInput) => Promise<Execution>;
  declineOffer: (offerId: string) => void;
  revokeMandates: () => Promise<void>;
  revealFact: (auditId: string, disclosureId: string) => Promise<void>;
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
  executions: [],
  audits: [],
  activity: [],
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
      const wallet = await provider.connectWallet(walletProvider);
      if (wallet.status !== "connected" || !wallet.address) {
        throw new Error("connector did not report connected");
      }
      set({ wallet, walletDialogOpen: false, lastError: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "wallet connect failed";
      set({ wallet: { ...initialWallet, lastError: message }, lastError: message });
      return false;
    }
  },

  disconnectWallet: async () => {
    const wallet = await provider.disconnectWallet();
    set({ wallet });
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
      set({
        portfolio,
        mandates,
        offers,
        executions,
        audits,
        activity,
        syncStatus: "ready",
        syncedAt: Date.now(),
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
      return mandate;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Compact circuit-call required";
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
      } else if (execution.status === "settled") {
        set({ executionStage: "done", lastExecution: execution });
      } else if (execution.status === "proof-pending") {
        set({ executionStage: "proving", lastExecution: execution });
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
      const message = error instanceof Error ? error.message : "revokeMandate required Compact circuit-call";
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
              disclosures: a.disclosures.map((d) =>
                d.id === disclosure.id ? disclosure : d,
              ),
            },
      ),
    });
  },
}));
