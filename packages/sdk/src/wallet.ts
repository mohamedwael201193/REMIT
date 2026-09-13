import { RemitError } from "@remit/core";

export type WalletKind = "1am" | "lace" | "cli" | "unknown";

export type WalletCapabilities = {
  getProvingProvider: boolean;
  signData: boolean;
  localProofServer: boolean;
};

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
  return {
    getProvingProvider: typeof api.getProvingProvider === "function",
    signData: typeof api.signData === "function",
    localProofServer: typeof api.getProvingProvider !== "function",
  };
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

export async function assertLaceProofServer(url = "http://localhost:6300"): Promise<void> {
  try {
    const res = await fetch(new URL("/health", url));
    if (!res.ok) throw new RemitError("WALLET", "Lace local proof server unhealthy", "lace needs proof server");
  } catch (e) {
    if (e instanceof RemitError) throw e;
    throw new RemitError("WALLET", "Lace local proof server unreachable", "lace needs proof server");
  }
}
