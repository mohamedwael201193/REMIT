/**
 * DApp connector v4 — same rules as packages/sdk adapter.
 * Kept browser-local so Next does not bundle compact-runtime / wallet-sdk.
 */
import type { WalletProviderKind, WalletState } from "./types";

type ConnectionStatus = { status: string; networkId?: string };
type DustBalance = { balance: bigint | number; cap: bigint | number };
type UnshieldedAddress = { unshieldedAddress: string };
type DustAddress = { dustAddress: string };
type WalletConfig = { networkId?: string; proverServerUri?: string };

export type ConnectedAPI = {
  getConnectionStatus: () => Promise<ConnectionStatus>;
  getConfiguration?: () => Promise<WalletConfig>;
  getUnshieldedAddress?: () => Promise<UnshieldedAddress>;
  getDustAddress?: () => Promise<DustAddress>;
  getDustBalance?: () => Promise<DustBalance>;
  getUnshieldedBalances?: () => Promise<unknown>;
  hintUsage?: (methods: string[]) => Promise<void>;
  getProvingProvider?: unknown;
  getShieldedAddresses?: () => Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  balanceUnsealedTransaction?: (tx: string) => Promise<{ tx: string }>;
  submitTransaction?: (tx: string) => Promise<void>;
  signData?: unknown;
};

export type ConnectedWallet = {
  state: WalletState;
  api: ConnectedAPI;
};

export type InitialAPI = {
  name?: string;
  rdns?: string;
  apiVersion?: string;
  connect: (networkId: string) => Promise<ConnectedAPI>;
};

export type MidnightWindow = Window & {
  midnight?: { [rdns: string]: InitialAPI };
};

function requireConnectorV4(apiVersion: string | undefined): void {
  if (!/^4\./.test(String(apiVersion ?? ""))) {
    throw new Error("DApp connector must be v4");
  }
}

function networkMatches(expected: string, actual: string | undefined): boolean {
  if (!actual) return false;
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  if (a === e) return true;
  return e === "preprod" && a.includes("preprod");
}

function classify(name: string, rdns?: string): WalletProviderKind | "unknown" {
  const s = `${name} ${rdns ?? ""}`.toLowerCase();
  if (s.includes("1am") || s.includes("oneam")) return "1am";
  if (s.includes("lace")) return "lace";
  return "unknown";
}

async function assertLaceProofServer(url = "http://localhost:6300"): Promise<void> {
  try {
    const res = await fetch(new URL("/health", url));
    if (!res.ok) throw new Error("Lace local proof server unhealthy");
  } catch {
    throw new Error("Lace must use a local proof-server 8.1.0 at http://localhost:6300");
  }
}

export function discoverInjected(win: MidnightWindow): { rdns: string; name: string; kind: WalletProviderKind | "unknown"; apiVersion: string }[] {
  const midnight = win.midnight ?? {};
  return Object.entries(midnight).map(([rdns, api]) => ({
    rdns: api.rdns ?? rdns,
    name: api.name ?? rdns,
    kind: classify(api.name ?? "", api.rdns ?? rdns),
    apiVersion: api.apiVersion ?? "",
  }));
}

export async function connectInjectedWallet(
  kind: WalletProviderKind,
  expectedNetwork: string,
  win: MidnightWindow,
): Promise<ConnectedWallet> {
  const midnight = win.midnight ?? {};
  const entry = Object.entries(midnight).find(([rdns, api]) => classify(api.name ?? "", api.rdns ?? rdns) === kind);
  if (!entry) {
    throw new Error(kind === "1am" ? "1AM is not injected in this Chrome tab" : "Lace is not injected in this Chrome tab");
  }
  const api = entry[1];
  requireConnectorV4(api.apiVersion);
  const wallet = await api.connect(expectedNetwork);
  const status = await wallet.getConnectionStatus();
  if (status.status !== "connected") {
    throw new Error("connector did not report connected");
  }
  if (!networkMatches(expectedNetwork, status.networkId)) {
    throw new Error("wallet network does not match Preprod");
  }
  const inTabProving = typeof wallet.getProvingProvider === "function";
  if (kind === "lace") {
    if (inTabProving) {
      throw new Error("Lace must not be treated as in-tab proving");
    }
    let prover = "http://localhost:6300";
    try {
      prover = (await wallet.getConfiguration?.())?.proverServerUri ?? prover;
    } catch {
      /* keep default */
    }
    await assertLaceProofServer(prover);
  }
  try {
    await wallet.hintUsage?.([
      "getUnshieldedAddress",
      "getDustAddress",
      "getDustBalance",
      "getUnshieldedBalances",
      "balanceUnsealedTransaction",
      "submitTransaction",
      "getConnectionStatus",
      "getConfiguration",
      "getShieldedAddresses",
      "getProvingProvider",
    ]);
  } catch {
    /* hintUsage is advisory */
  }
  let address: string | null = null;
  try {
    address = (await wallet.getUnshieldedAddress?.())?.unshieldedAddress ?? null;
  } catch {
    address = null;
  }
  if (!address) throw new Error("wallet did not return an unshielded address");
  let dustHeader: string | undefined;
  try {
    const d = await wallet.getDustBalance?.();
    if (d) dustHeader = "header DUST (not spendable coins)";
  } catch {
    dustHeader = undefined;
  }
  return {
    state: {
      provider: kind,
      address,
      network: "Midnight",
      networkId: status.networkId ?? expectedNetwork,
      dust: null,
      dustHeader,
      status: "connected",
      lastError: null,
    },
    api: wallet,
  };
}
