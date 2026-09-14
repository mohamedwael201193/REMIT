/**
 * Live Preprod provider. Wallet connect uses injected connector v4.
 * Workspace data comes from the public API + indexer, never from catalog fiction.
 */
import {
  fetchRemitAuditHead,
  fetchRemitChain,
  fetchRemitConfig,
  fetchRemitEvidence,
  mapPublicWorkspace,
  type MappedExecution,
  type MappedWorkspace,
} from "./public-client";
import { connectInjectedWallet, type ConnectedAPI } from "./midnight-connector";
import { openedAuditRoot } from "./audit-flow";
import { loadRemitCircuitModule } from "./circuit-call";
import { getRemitProvider as emptyProvider } from "./local-provider";
import type {
  ActivityItem,
  AuditRecord,
  Disclosure,
  Execution,
  FillAttemptInput,
  Mandate,
  NewMandateInput,
  Offer,
  PortfolioSnapshot,
  RemitProvider,
  WalletProviderKind,
  WalletState,
} from "./types";

export type LiveConfig = {
  apiUrl: string;
  pool: string;
  quote: string;
  network: string;
};

const disconnected = (): WalletState => ({
  provider: null,
  address: null,
  network: "Midnight",
  networkId: null,
  dust: null,
  dustHeader: undefined,
  status: "disconnected",
  lastError: null,
});

function toMandate(m: MappedWorkspace["mandates"][number]): Mandate {
  return { ...m };
}

function toOffer(o: MappedWorkspace["offers"][number]): Offer {
  return { ...o };
}

function toExecution(e: MappedExecution): Execution {
  return {
    id: e.id,
    reference: e.reference,
    mandateId: e.mandateId,
    offerId: e.offerId,
    asset: e.asset,
    side: e.side,
    attemptedFill: e.attemptedFill,
    settledFill: e.settledFill,
    price: e.price,
    counterpartyId: e.counterpartyId,
    status: e.status,
    refusalReason: e.refusalReason,
    checks: e.checks,
    events: e.events,
    proofRef: e.proofRef,
    auditRoot: e.auditRoot,
    receipt: e.receipt,
    executedAt: e.executedAt,
    txHash: e.txHash,
    block: e.block,
    explorerUrl: e.explorerUrl,
  };
}

class LiveRemitProvider implements RemitProvider {
  private wallet: WalletState = disconnected();
  private connected: ConnectedAPI | null = null;
  private cache: MappedWorkspace | null = null;

  constructor(private readonly cfg: LiveConfig) {}

  private async load(): Promise<MappedWorkspace> {
    const config = await fetchRemitConfig(this.cfg.apiUrl);
    if (!config.live || config.pool !== this.cfg.pool || config.quote !== this.cfg.quote) {
      throw new Error("API does not yet expose indexer-backed pool and quote addresses");
    }
    if (config.network !== "preprod" && this.cfg.network === "preprod") {
      throw new Error("API network is not Preprod");
    }
    const [chain, evidence] = await Promise.all([
      fetchRemitChain(this.cfg.apiUrl),
      fetchRemitEvidence(this.cfg.apiUrl),
    ]);
    this.cache = mapPublicWorkspace({
      chain,
      evidence,
      principalName: this.wallet.address ?? "",
    });
    return this.cache;
  }

  async getPortfolio(): Promise<PortfolioSnapshot> {
    const ws = await this.load();
    return ws.portfolio;
  }
  async getMandates(): Promise<Mandate[]> {
    return (await this.load()).mandates.map(toMandate);
  }
  async getOffers(): Promise<Offer[]> {
    return (await this.load()).offers.map(toOffer);
  }
  async createMandate(input: NewMandateInput): Promise<Mandate> {
    await this.load();
    if (this.wallet.status !== "connected" || !this.connected) {
      throw new Error("Connect 1AM or Lace in a click handler before createMandate");
    }
    const circuit = await loadRemitCircuitModule(this.cfg.apiUrl);
    const created = (await circuit.createMandateFromWallet({
      wallet: this.connected,
      kind: this.wallet.provider,
      apiUrl: this.cfg.apiUrl,
      pool: this.cfg.pool,
      quote: this.cfg.quote,
      network: this.cfg.network,
      input,
    })) as Mandate;
    if (!created?.id) {
      throw new Error("createMandate did not return an indexer-backed mandate");
    }
    return created;
  }
  async executeFill(input: FillAttemptInput): Promise<Execution> {
    const ws = await this.load();
    const hit = ws.executions.find((e) => e.offerId === input.offerId);
    if (hit) return toExecution(hit);
    throw new Error(
      "Fill is proven by the executor process on Compact, then confirmed by the indexer. This tab will not simulate settlement.",
    );
  }
  async getExecutions(): Promise<Execution[]> {
    return (await this.load()).executions.map(toExecution);
  }
  async getAudit(): Promise<AuditRecord[]> {
    const ws = await this.load();
    const settled = ws.executions.filter(
      (e) => e.status === "settled" && Boolean(e.txHash) && e.block != null,
    );
    const fillHashes = settled.map((e) => e.txHash ?? "").filter(Boolean);
    let chainRoot = "";
    try {
      const head = await fetchRemitAuditHead(this.cfg.apiUrl);
      if (head.auditRoot && !openedAuditRoot(head.auditRoot, fillHashes)) {
        chainRoot = head.auditRoot;
      }
    } catch {
      chainRoot = "";
    }
    return settled.map((fill) => ({
      id: `audit:${fill.txHash ?? fill.id}`,
      executionRef: fill.reference,
      asset: fill.asset,
      counterpartyClass: "On-chain counterparty",
      proofStatus: "pending",
      auditRoot: chainRoot,
      recordedAt: fill.executedAt,
      disclosures: [
        { id: "fill-amount", fact: "fill-amount" as const, label: "Fill amount", state: "sealed" as const },
        {
          id: "policy-compliance",
          fact: "policy-compliance" as const,
          label: "Price limit satisfied",
          state: "sealed" as const,
        },
        {
          id: "counterparty-class",
          fact: "counterparty-class" as const,
          label: "Counterparty authorized",
          state: "sealed" as const,
        },
        {
          id: "mandate-active",
          fact: "mandate-active" as const,
          label: "Mandate active",
          state: "sealed" as const,
        },
        {
          id: "execution-timestamp",
          fact: "execution-timestamp" as const,
          label: "Execution timestamp",
          state: "sealed" as const,
        },
      ],
    }));
  }
  async revealFact(_auditId: string, _disclosureId: string): Promise<Disclosure> {
    await this.load();
    throw new Error("Field opening requires a real audit package verified against the on-chain auditRoot");
  }
  async getActivity(): Promise<ActivityItem[]> {
    return (await this.load()).activity;
  }
  async connectWallet(provider: WalletProviderKind): Promise<WalletState> {
    await this.load();
    if (typeof window === "undefined") {
      throw new Error("Wallet connect only runs in the browser");
    }
    const connected = await connectInjectedWallet(provider, this.cfg.network, window);
    this.connected = connected.api;
    this.wallet = connected.state;
    return this.wallet;
  }
  async disconnectWallet(): Promise<WalletState> {
    this.connected = null;
    this.wallet = disconnected();
    return this.wallet;
  }
  async revokeMandates(): Promise<void> {
    if (this.wallet.status !== "connected" || !this.connected) {
      throw new Error("Connect 1AM or Lace in a click handler before revokeMandate");
    }
    const circuit = await loadRemitCircuitModule(this.cfg.apiUrl);
    await circuit.revokeMandatesFromWallet({
      wallet: this.connected,
      kind: this.wallet.provider,
      apiUrl: this.cfg.apiUrl,
      pool: this.cfg.pool,
      quote: this.cfg.quote,
      network: this.cfg.network,
    });
    const after = await this.load();
    if (after.portfolio.activeMandates > 0) {
      throw new Error("revokeMandate was submitted but indexer still reports activeMandates > 0");
    }
  }
}

export function getRemitProvider(): RemitProvider {
  const pool = process.env.NEXT_PUBLIC_REMIT_POOL_CONTRACT_ADDRESS ?? "";
  const quote = process.env.NEXT_PUBLIC_REMIT_QUOTE_CONTRACT_ADDRESS ?? "";
  const apiUrl = process.env.NEXT_PUBLIC_REMIT_API_URL ?? "";
  const network = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? "preprod";
  if (pool && quote && apiUrl) return new LiveRemitProvider({ apiUrl, pool, quote, network });
  return emptyProvider();
}
