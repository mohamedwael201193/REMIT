import { RemitError } from "../../core/src/errors.ts";

export type WalletKind = "1am" | "lace" | "cli" | "unknown";

export type WalletCapabilities = {
  getProvingProvider: boolean;
  signData: boolean;
  localProofServer: boolean;
};

export type ProvingPath = "1am-intab" | "lace-http";

export type ConnectionPhase =
  | "disconnected"
  | "detecting"
  | "connecting"
  | "connected"
  | "proving"
  | "submitting"
  | "finalizing"
  | "done"
  | "error";

export type ConnectorDustView = {
  balance: bigint;
  cap: bigint;
  /** Connector API has no availableCoins. A positive balance is display-only. */
  spendableKnown: false;
};

export type RemitClientState = {
  phase: ConnectionPhase;
  kind: WalletKind;
  networkId?: string;
  unshieldedAddress?: string;
  dustAddress?: string;
  dust?: ConnectorDustView;
  capabilities: WalletCapabilities;
  provingPath?: ProvingPath;
  proofServerReady?: boolean | null;
  lastError?: string;
};

export function requireConnectorV4(apiVersion: string | undefined): void {
  if (!/^4\./.test(String(apiVersion ?? ""))) {
    throw new RemitError("WALLET", "DApp connector must be v4", "apiVersion");
  }
}

/**
 * Official spendable gate is Wallet SDK `availableCoins >= 1`.
 * `getDustBalance().balance` (1AM header / connector) is not that gate.
 */
export function assertSpendableDust(gate: { availableCoins?: number }): void {
  if (typeof gate.availableCoins === "number") {
    if (gate.availableCoins < 1) {
      throw new RemitError("DUST", "no spendable DUST coin", "availableCoins=0");
    }
    return;
  }
  throw new RemitError(
    "DUST",
    "getDustBalance is not a spendable-coin gate",
    "connector cannot prove spendable DUST",
  );
}

export function capabilitiesOf(api: {
  getProvingProvider?: unknown;
  signData?: unknown;
}): WalletCapabilities {
  const getProvingProvider = typeof api.getProvingProvider === "function";
  return {
    getProvingProvider,
    signData: typeof api.signData === "function",
    localProofServer: !getProvingProvider,
  };
}

/**
 * Identity selects the proving backend. Lace always uses local proof-server
 * 8.1.0, even if a stub `getProvingProvider` exists on ConnectedAPI.
 * 1AM uses in-tab proving and must expose `getProvingProvider`.
 */
export function provingPathFor(kind: WalletKind, caps: WalletCapabilities): ProvingPath {
  if (kind === "lace") return "lace-http";
  if (kind === "1am") {
    if (!caps.getProvingProvider) {
      throw new RemitError("WALLET", "1AM must expose getProvingProvider for in-tab proving", "no proving provider");
    }
    return "1am-intab";
  }
  return caps.getProvingProvider ? "1am-intab" : "lace-http";
}

export function classifyWallet(name: string, rdns?: string): WalletKind {
  const s = `${name} ${rdns ?? ""}`.toLowerCase();
  if (s.includes("1am") || s.includes("oneam")) return "1am";
  if (s.includes("lace")) return "lace";
  if (s.includes("cli") || s.includes("midnight serve")) return "cli";
  return "unknown";
}

export function isConnected(state: RemitClientState): boolean {
  return state.phase !== "disconnected" && state.phase !== "detecting" && state.phase !== "error";
}

export function requireClickHandler(ctx: { fromClickHandler: boolean }): void {
  if (ctx.fromClickHandler !== true) {
    throw new RemitError("WALLET", "connect() must run synchronously in the click handler", "popup would be blocked");
  }
}

export type GestureGate = { approved: boolean };

export function pauseForUserGesture(): GestureGate {
  return { approved: false };
}

export function markUserApproved(gate: GestureGate): void {
  gate.approved = true;
}

export function assertApproved(gate: GestureGate): void {
  if (!gate.approved) {
    throw new RemitError("WALLET", "user gesture required before wallet connect/sign", "waiting for wallet approval");
  }
}

export async function probeLaceProofServer(url = "http://localhost:6300"): Promise<boolean> {
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
    throw new RemitError(
      "WALLET",
      "Lace local proof-server 8.1.0 is not reachable at http://localhost:6300",
      "lace needs proof server",
    );
  }
}
