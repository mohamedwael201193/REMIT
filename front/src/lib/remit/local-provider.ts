/**
 * Honest empty provider. Does not invent connected, balance, proof, or settlement.
 * Swap this for the live SDK only after Preprod quote+pool indexer evidence exists.
 */
import type {
  ActivityItem,
  AuditRecord,
  Disclosure,
  Execution,
  FillAttemptInput,
  Mandate,
  NewMandateInput,
  NewOfferInput,
  Offer,
  PortfolioSnapshot,
  RemitProvider,
  WalletProviderKind,
  WalletState,
} from "./types";

const disconnected: WalletState = {
  provider: null,
  address: null,
  network: "Midnight",
  networkId: null,
  dust: null,
  dustHeader: undefined,
  status: "disconnected",
  lastError: null,
};

const emptyPortfolio: PortfolioSnapshot = {
  principalName: "",
  deskName: "",
  activeMandates: 0,
  totalBudget: null,
  committedBudget: null,
  amountPrivacy: "sealed",
  openOffers: 0,
  settledNotional: 0,
  verificationRate: null,
  auditReadyCount: 0,
};

class HonestEmptyProvider implements RemitProvider {
  async getPortfolio(): Promise<PortfolioSnapshot> {
    return emptyPortfolio;
  }
  async getMandates(): Promise<Mandate[]> {
    return [];
  }
  async getOffers(): Promise<Offer[]> {
    return [];
  }
  async createMandate(_input: NewMandateInput): Promise<Mandate> {
    throw new Error("Preprod pool is not live — mandate creation is not available");
  }
  async placeOffer(_input: NewOfferInput): Promise<Offer> {
    throw new Error("Preprod pool is not live — placeOffer is not available");
  }
  async executeFill(_input: FillAttemptInput): Promise<Execution> {
    throw new Error("Preprod pool is not live — fills are not available");
  }
  async getExecutions(): Promise<Execution[]> {
    return [];
  }
  async getAudit(): Promise<AuditRecord[]> {
    return [];
  }
  async revealFact(_auditId: string, _disclosureId: string): Promise<Disclosure> {
    throw new Error("Preprod pool is not live — disclosure is not available");
  }
  async probeForgedDisclosure(): Promise<{ ok: boolean; failed: string[]; auditRoot?: string }> {
    throw new Error("Preprod pool is not live — disclosure is not available");
  }
  async getActivity(): Promise<ActivityItem[]> {
    return [];
  }
  async connectWallet(_provider: WalletProviderKind): Promise<WalletState> {
    throw new Error("Wallet connect waits for live Preprod contracts and a real 1AM/Lace gesture");
  }
  async disconnectWallet(): Promise<WalletState> {
    return disconnected;
  }
  async revokeMandates(): Promise<void> {
    throw new Error("Preprod pool is not live — revokeMandate is not available");
  }
  async withdrawLeftover(): Promise<{ txHash?: string; block?: number }> {
    throw new Error("Preprod pool is not live — withdraw is not available");
  }
}

let singleton: RemitProvider | undefined;

export function getRemitProvider(): RemitProvider {
  singleton ??= new HonestEmptyProvider();
  return singleton;
}
