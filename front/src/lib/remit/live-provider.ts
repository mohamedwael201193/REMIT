/**
 * Live Preprod provider. Wallet connect uses injected connector v4.
 * Workspace data comes from the public API + indexer, never from catalog fiction.
 */
import {
  fetchRemitAgentStatus,
  fetchRemitAuditHead,
  fetchRemitAuditPackage,
  fetchRemitChain,
  fetchRemitConfig,
  fetchRemitEvidence,
  mapPublicWorkspace,
  postRemitAuditVerify,
  type MappedExecution,
  type MappedWorkspace,
} from "./public-client";
import { connectInjectedWallet, clearPrivateVault, clearWalletVault, forgetAdapter, rememberedAdapter, markManualDisconnect, isManualDisconnect, assertLaceProofServer, type ConnectedAPI, type MidnightWindow } from "./midnight-connector";
import { chainAuditRootFromHead } from "./audit-flow";
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
  NewOfferInput,
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
  methodsReady: null,
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
    const [chain, evidence, agent] = await Promise.all([
      fetchRemitChain(this.cfg.apiUrl),
      fetchRemitEvidence(this.cfg.apiUrl),
      fetchRemitAgentStatus(this.cfg.apiUrl).catch(() => null),
    ]);
    this.cache = mapPublicWorkspace({
      chain,
      evidence,
      principalName: this.wallet.address ?? "",
      lastSettlement: agent?.last ?? null,
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
    await this.ensureProvingSession();
    const circuit = await loadRemitCircuitModule(this.cfg.apiUrl);
    const created = (await circuit.createMandateFromWallet({
      wallet: this.connected,
      kind: this.wallet.provider,
      apiUrl: this.cfg.apiUrl,
      pool: this.cfg.pool,
      quote: this.cfg.quote,
      network: this.cfg.network,
      input,
    })) as Mandate & { txHash?: string };
    if (!created?.id || !created.txHash) {
      throw new Error("createMandate did not return an indexer-backed mandate");
    }
    return created;
  }
  async placeOffer(input: NewOfferInput): Promise<Offer> {
    await this.ensureProvingSession();
    const circuit = await loadRemitCircuitModule(this.cfg.apiUrl);
    const created = (await circuit.placeOfferFromWallet({
      wallet: this.connected,
      kind: this.wallet.provider,
      apiUrl: this.cfg.apiUrl,
      pool: this.cfg.pool,
      quote: this.cfg.quote,
      network: this.cfg.network,
      offer: input,
    })) as Offer;
    if (!created?.id || !created.rfqId) {
      throw new Error("placeOffer did not deliver an encrypted RFQ to the durable inbox");
    }
    if (!created.txHash) {
      throw new Error("placeOffer did not return an indexer-backed transaction");
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
      chainRoot = chainAuditRootFromHead(head.auditRoot, fillHashes);
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
  async revealFact(auditId: string, disclosureId: string): Promise<Disclosure> {
    await this.load();
    if (disclosureId !== "fill-amount") {
      throw new Error("Unauthorized field — executor authorized a fill-amount opening only");
    }
    const pkg = await fetchRemitAuditPackage(this.cfg.apiUrl);
    const field = pkg.openings[0]?.field;
    if (field !== "baseAmount") {
      throw new Error("Authorized package is not a fill-amount opening");
    }
    const bound = typeof pkg.executionTxHash === "string" ? pkg.executionTxHash : "";
    const idTx = auditId.replace(/^audit:/, "");
    if (bound && idTx !== bound) {
      throw new Error("Authorized package is not for this execution");
    }
    const verified = await postRemitAuditVerify(this.cfg.apiUrl, pkg);
    if (!verified.ok) {
      throw new Error(`verifyDisclosure rejected (${(verified.failed ?? []).join(",") || "failed"})`);
    }
    return {
      id: "fill-amount",
      fact: "fill-amount",
      label: "Fill amount",
      state: "verified",
      value: pkg.openings[0]?.valueDec ?? "REVEALED",
    };
  }
  async probeForgedDisclosure(): Promise<{ ok: boolean; failed: string[]; auditRoot?: string }> {
    const pkg = await fetchRemitAuditPackage(this.cfg.apiUrl);
    const forged = {
      ...pkg,
      openings: pkg.openings.map((o) => ({ ...o, valueDec: "999" })),
    };
    return postRemitAuditVerify(this.cfg.apiUrl, forged);
  }
  async getActivity(): Promise<ActivityItem[]> {
    return (await this.load()).activity;
  }
  async connectWallet(provider: WalletProviderKind): Promise<WalletState> {
    if (typeof window === "undefined") {
      throw new Error("Wallet connect only runs in the browser");
    }
    const previous = this.wallet.address;
    const connected = await connectInjectedWallet(provider, this.cfg.network, window);
    if (previous && connected.state.address && previous !== connected.state.address) {
      clearPrivateVault(window);
    }
    this.connected = connected.api;
    this.wallet = connected.state;
    return this.wallet;
  }
  private async ensureProvingSession(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Wallet connect only runs in the browser");
    }
    const kind = this.wallet.provider;
    if (kind !== "1am" && kind !== "lace") {
      throw new Error("Connect 1AM or Lace in a click handler before Compact circuit-call");
    }
    // Lace: a second connect() has no user-activation and hangs. Reuse ConnectedAPI.
    // 1AM: re-bind on the circuit click so in-tab getProvingProvider still works after reload.
    if (kind === "lace" && this.connected && this.wallet.status === "connected") {
      if (this.wallet.methodsReady === false) {
        throw new Error(this.wallet.lastError ?? "Lace connected. Wallet session unavailable for proving.");
      }
      await assertLaceProofServer("http://localhost:6300");
      return;
    }
    await this.connectWallet(kind);
    if (this.wallet.status !== "connected" || !this.connected) {
      throw new Error("Connect 1AM or Lace in a click handler before Compact circuit-call");
    }
    if (kind === "lace") {
      await assertLaceProofServer("http://localhost:6300");
    }
  }
  async restoreWallet(): Promise<WalletState> {
    if (typeof window === "undefined") return disconnected();
    if (isManualDisconnect(window)) return disconnected();
    const kind = rememberedAdapter(window);
    if (!kind) return disconnected();
    if (kind === "lace") {
      return {
        ...disconnected(),
        provider: "lace",
        provingPath: "lace-http",
        methodsReady: false,
        lastError: "Reconnect wallet",
      };
    }
    this.wallet = {
      ...disconnected(),
      provider: kind,
      status: "reconnecting",
      lastError: null,
    };
    try {
      const statusProbe = (window as MidnightWindow).midnight;
      if (!statusProbe || Object.keys(statusProbe).length === 0) {
        this.wallet = {
          ...disconnected(),
          provider: kind,
          status: "disconnected",
          lastError: "Reconnect wallet — the connector is not injected yet",
        };
        return this.wallet;
      }
      return await this.connectWallet(kind);
    } catch (error) {
      const message = error instanceof Error ? error.message : "wallet reconnect failed";
      this.connected = null;
      this.wallet = {
        ...disconnected(),
        provider: kind,
        status: "disconnected",
        lastError: /gesture|popup|user|activation|rejected/i.test(message)
          ? "Reconnect wallet — the connector requires a user gesture"
          : message,
      };
      return this.wallet;
    }
  }
  async disconnectWallet(): Promise<WalletState> {
    this.connected = null;
    if (typeof window !== "undefined") {
      markManualDisconnect(window);
      clearWalletVault(window);
      forgetAdapter(window);
    }
    this.wallet = disconnected();
    return this.wallet;
  }
  async revokeMandates(): Promise<void> {
    await this.ensureProvingSession();
    const circuit = await loadRemitCircuitModule(this.cfg.apiUrl);
    const before = await this.load();
    const previous = before.portfolio.activeMandates;
    const revoked = (await circuit.revokeMandatesFromWallet({
      wallet: this.connected,
      kind: this.wallet.provider,
      apiUrl: this.cfg.apiUrl,
      pool: this.cfg.pool,
      quote: this.cfg.quote,
      network: this.cfg.network,
    })) as { txHash?: string; block?: number };
    if (!revoked?.txHash) {
      throw new Error("revokeMandate did not return an indexer-backed transaction");
    }
    const after = await this.load();
    if (after.portfolio.activeMandates >= previous) {
      throw new Error(
        `revokeMandate ${revoked.txHash} settled but indexer activeMandates did not decrease (${previous} → ${after.portfolio.activeMandates})`,
      );
    }
  }
  async withdrawLeftover(): Promise<{ txHash?: string; block?: number }> {
    await this.ensureProvingSession();
    const circuit = await loadRemitCircuitModule(this.cfg.apiUrl);
    if (typeof circuit.withdrawFromWallet !== "function") {
      throw new Error("Hosted circuit bundle does not export withdrawFromWallet");
    }
    const withdrawn = (await circuit.withdrawFromWallet({
      wallet: this.connected,
      kind: this.wallet.provider,
      apiUrl: this.cfg.apiUrl,
      pool: this.cfg.pool,
      quote: this.cfg.quote,
      network: this.cfg.network,
    })) as { txHash?: string; block?: number };
    if (!withdrawn?.txHash) {
      throw new Error("withdraw did not return an indexer-backed transaction");
    }
    return withdrawn;
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
