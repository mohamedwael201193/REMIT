/**
 * DApp connector v4 — same rules as packages/sdk adapter.
 * Kept browser-local so Next does not bundle compact-runtime / wallet-sdk.
 */
import type { WalletProviderKind, WalletState } from "./types";
import {
  classifyWalletMethodError,
  sanitizeConnectorError,
  walletDiag,
  withBudget,
} from "./wallet-diag";

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
    const res = await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(400),
    });
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

const inflightConnect = new Map<WalletProviderKind, Promise<ConnectedAPI>>();

export const LACE_CONNECT_TIMEOUT_MS = 25_000;
export const ONEAM_CONNECT_TIMEOUT_MS = 45_000;
export const LACE_CONNECT_TIMEOUT_MESSAGE =
  "Having trouble connecting with Lace? We recommend using 1AM for the Preprod demo.";

export function injectedApiForKind(kind: WalletProviderKind, win: MidnightWindow): InitialAPI {
  const midnight = win.midnight ?? {};
  const entry = Object.entries(midnight).find(([rdns, api]) => classify(api.name ?? "", api.rdns ?? rdns) === kind);
  if (!entry) {
    throw new Error(kind === "1am" ? "1AM is not injected in this Chrome tab" : "Lace is not injected in this Chrome tab");
  }
  requireConnectorV4(entry[1].apiVersion);
  return entry[1];
}

/**
 * Call from the click handler before any await. Lace opens its authorization
 * popup only if connect(networkId) runs in the same user-gesture turn.
 * A later finish path may await this promise; it must not start a second connect().
 */
export function beginConnect(
  api: InitialAPI,
  kind: WalletProviderKind,
  expectedNetwork: string,
): Promise<ConnectedAPI> {
  requireConnectorV4(api.apiVersion);
  inflightConnect.delete(kind);
  walletDiag({ event: "T2-connect-start", kind, networkId: expectedNetwork });
  const started = Date.now();
  const connectPromise = api.connect(expectedNetwork).then(
    (wallet) => {
      walletDiag({ event: "T3-connect-resolved", kind, networkId: expectedNetwork, ms: Date.now() - started, ok: true });
      return wallet;
    },
    (error) => {
      const { err, code } = sanitizeConnectorError(error);
      walletDiag({ event: "T3-connect-resolved", kind, networkId: expectedNetwork, ms: Date.now() - started, ok: false, err, code });
      throw error;
    },
  );
  inflightConnect.set(kind, connectPromise);
  void connectPromise.finally(() => {
    if (inflightConnect.get(kind) === connectPromise) inflightConnect.delete(kind);
  });
  return connectPromise;
}

export function resetInflightConnect(): void {
  inflightConnect.clear();
}

export async function connectInjectedWallet(
  kind: WalletProviderKind,
  expectedNetwork: string,
  win: MidnightWindow,
  options?: { timeoutMs?: number },
): Promise<ConnectedWallet> {
  const discovered = discoverInjected(win);
  walletDiag({
    event: "T1-discovery",
    kind,
    flags: {
      count: String(discovered.length),
      hasLace: String(discovered.some((w) => w.kind === "lace")),
      has1am: String(discovered.some((w) => w.kind === "1am")),
    },
  });
  const api = injectedApiForKind(kind, win);
  const lace = kind === "lace";
  const connectMs = options?.timeoutMs ?? (lace ? LACE_CONNECT_TIMEOUT_MS : ONEAM_CONNECT_TIMEOUT_MS);
  let connectPromise = inflightConnect.get(kind);
  if (!connectPromise) {
    connectPromise = beginConnect(api, kind, expectedNetwork);
  } else {
    walletDiag({ event: "T2-connect-reuse", kind, networkId: expectedNetwork });
  }
  let wallet: ConnectedAPI;
  try {
    wallet = await Promise.race([
      connectPromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                lace
                  ? LACE_CONNECT_TIMEOUT_MESSAGE
                  : "1AM connect() did not resolve in this click.",
              ),
            ),
          connectMs,
        ),
      ),
    ]);
  } catch (error) {
    if (inflightConnect.get(kind) === connectPromise) inflightConnect.delete(kind);
    void connectPromise.catch(() => undefined);
    throw error;
  }

  let status: ConnectionStatus = { status: "connected", networkId: expectedNetwork };
  try {
    status = await withBudget("T4-getConnectionStatus", 2000, () => wallet.getConnectionStatus());
  } catch (error) {
    if (classifyWalletMethodError(error) === "timeout" || classifyWalletMethodError(error) === "unavailable") {
      return connectedWithoutMethods(kind, expectedNetwork, wallet, win, error);
    }
    throw error;
  }
  if (status.status !== "connected") {
    throw new Error("connector did not report connected");
  }
  if (!networkMatches(expectedNetwork, status.networkId)) {
    throw new Error("wallet network does not match Preprod");
  }

  let address: string | null = null;
  try {
    address =
      (await withBudget("T6-getUnshieldedAddress", 3000, () =>
        wallet.getUnshieldedAddress?.() ?? Promise.reject(new Error("getUnshieldedAddress missing")),
      ))?.unshieldedAddress ?? null;
  } catch (error) {
    return connectedWithoutMethods(kind, status.networkId ?? expectedNetwork, wallet, win, error);
  }
  if (!address) {
    return connectedWithoutMethods(
      kind,
      status.networkId ?? expectedNetwork,
      wallet,
      win,
      new Error("wallet did not return an unshielded address"),
    );
  }

  clearManualDisconnect(win);
  rememberAdapter(kind, win);
  void wallet.hintUsage?.(["getUnshieldedAddress", "balanceUnsealedTransaction", "submitTransaction"]).catch(() => undefined);
  let dustHeader: string | undefined;
  try {
    const d = await Promise.race([
      wallet.getDustBalance?.() ?? Promise.resolve(undefined),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 250)),
    ]);
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
      provingPath: lace ? "lace-http" : "1am-intab",
      proofServerReady: lace ? null : true,
      methodsReady: true,
    },
    api: wallet,
  };
}

function connectedWithoutMethods(
  kind: WalletProviderKind,
  networkId: string,
  wallet: ConnectedAPI,
  win: MidnightWindow,
  error: unknown,
): ConnectedWallet {
  const { err } = sanitizeConnectorError(error);
  const lace = kind === "lace";
  clearManualDisconnect(win);
  rememberAdapter(kind, win);
  return {
    state: {
      provider: kind,
      address: null,
      network: "Midnight",
      networkId,
      dust: null,
      status: "connected",
      lastError: lace
        ? `Lace connected. Wallet session unavailable for proving (${err}).`
        : `1AM connected. Wallet methods unavailable (${err}).`,
      provingPath: lace ? "lace-http" : "1am-intab",
      proofServerReady: lace ? null : false,
      methodsReady: false,
    },
    api: wallet,
  };
}
