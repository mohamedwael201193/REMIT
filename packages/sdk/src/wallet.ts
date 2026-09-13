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

export type RemitClientState = {
  phase: ConnectionPhase;
  kind: WalletKind;
  networkId?: string;
  unshieldedAddress?: string;
  dust?: { balance: bigint; cap: bigint };
  capabilities: WalletCapabilities;
  lastError?: string;
};

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
