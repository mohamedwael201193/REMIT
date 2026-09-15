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

export type MidnightWindow = {
  midnight?: { [rdns: string]: InitialAPI };
  sessionStorage?: Storage;
};

function storageOf(win: MidnightWindow | undefined): Storage | undefined {
  return win?.sessionStorage;
}

const ADAPTER_KEY = "remit:adapter";
const MANUAL_DISCONNECT_KEY = "remit:manual-disconnect";

export function rememberedAdapter(win: MidnightWindow = globalThis as MidnightWindow): WalletProviderKind | null {
  try {
    const raw = storageOf(win)?.getItem(ADAPTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { kind?: string };
    if (parsed.kind === "1am" || parsed.kind === "lace") return parsed.kind;
    return null;
  } catch {
    return null;
  }
}

export function rememberAdapter(kind: WalletProviderKind, win: MidnightWindow = globalThis as MidnightWindow) {
  try {
    storageOf(win)?.setItem(ADAPTER_KEY, JSON.stringify({ kind }));
  } catch {
    /* private mode */
  }
}

export function forgetAdapter(win: MidnightWindow = globalThis as MidnightWindow) {
  try {
    storageOf(win)?.removeItem(ADAPTER_KEY);
  } catch {
    /* ignore */
  }
}

export function markManualDisconnect(win: MidnightWindow = globalThis as MidnightWindow) {
  try {
    storageOf(win)?.setItem(MANUAL_DISCONNECT_KEY, "1");
  } catch {
    /* ignore */
  }
  forgetAdapter(win);
}

export function clearManualDisconnect(win: MidnightWindow = globalThis as MidnightWindow) {
  try {
    storageOf(win)?.removeItem(MANUAL_DISCONNECT_KEY);
  } catch {
    /* ignore */
  }
}

export function isManualDisconnect(win: MidnightWindow = globalThis as MidnightWindow): boolean {
  try {
    return storageOf(win)?.getItem(MANUAL_DISCONNECT_KEY) === "1";
  } catch {
    return false;
  }
}

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

async function probeLaceProofServer(url = "http://localhost:6300"): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" });
    return res.type === "opaque" || res.type === "opaqueredirect" || res.ok;
  } catch {
    return false;
  }
}

export async function assertLaceProofServer(url = "http://localhost:6300"): Promise<void> {
  const ok = await probeLaceProofServer(url);
  if (!ok) {
    throw new Error("Lace local proof-server 8.1.0 is not reachable at http://localhost:6300. Start it with npm run proof:up. Private witnesses stay local; they are not sent to Render.");
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

function removePrefixed(storage: Storage, prefixes: string[]) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && prefixes.some((p) => (p.endsWith(":") ? k.startsWith(p) : k === p))) keys.push(k);
  }
  for (const k of keys) storage.removeItem(k);
}

export function clearPrivateVault(win: MidnightWindow = globalThis as MidnightWindow) {
  try {
    const storage = storageOf(win);
    if (!storage) return;
    removePrefixed(storage, ["remit:wrap:", "remit:blob:"]);
  } catch {
    /* ignore */
  }
}

export function clearWalletVault(win: MidnightWindow = globalThis as MidnightWindow) {
  clearPrivateVault(win);
  forgetAdapter(win);
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
  const lace = kind === "lace";
  const inTabProving = typeof wallet.getProvingProvider === "function";
  let prover = "http://localhost:6300";
  try {
    prover = (await wallet.getConfiguration?.())?.proverServerUri ?? prover;
  } catch {
    /* keep default */
  }
  const proofServerReady = lace ? await probeLaceProofServer(prover) : inTabProving;
  const hint = [
    "getUnshieldedAddress",
    "getDustAddress",
    "getDustBalance",
    "getUnshieldedBalances",
    "balanceUnsealedTransaction",
    "submitTransaction",
    "getConnectionStatus",
    "getConfiguration",
    "getShieldedAddresses",
  ];
  if (!lace && inTabProving) hint.push("getProvingProvider");
  try {
    await wallet.hintUsage?.(hint);
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
  clearManualDisconnect(win);
  rememberAdapter(kind, win);
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
      lastError: proofServerReady === false
        ? "Connected. Compact calls need local proof-server 8.1.0 at http://localhost:6300."
        : null,
      provingPath: lace ? "lace-http" : "1am-intab",
      proofServerReady,
    },
    api: wallet,
  };
}
