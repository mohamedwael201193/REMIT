import type { DAppConnectorAPI, DAppConnectorWalletAPI } from "@midnight-ntwrk/dapp-connector-api";
import { RemitError } from "@remit/core";
import { capabilitiesOf, classifyWallet, requireClickHandler, type RemitClientState, type WalletKind } from "./wallet.js";

export type MidnightWindow = Window & {
  midnight?: { [rdns: string]: DAppConnectorAPI };
};

export async function discoverWallets(win: MidnightWindow): Promise<{ rdns: string; name: string; kind: WalletKind }[]> {
  const midnight = win.midnight ?? {};
  const out: { rdns: string; name: string; kind: WalletKind }[] = [];
  for (const [rdns, api] of Object.entries(midnight)) {
    const name = (api as DAppConnectorAPI).name ?? rdns;
    out.push({ rdns, name, kind: classifyWallet(name, rdns) });
  }
  return out;
}

export async function connectWallet(
  api: DAppConnectorAPI,
  expectedNetwork: string,
  gesture: { fromClickHandler: boolean },
): Promise<{ wallet: DAppConnectorWalletAPI; state: RemitClientState }> {
  requireClickHandler(gesture);
  const service = await api.enable();
  const status = await api.service.connectorAPI().then((c) => c.getConnectionStatus?.()).catch(() => undefined);
  const wallet = (service as { wallet?: DAppConnectorWalletAPI }).wallet ?? (service as unknown as DAppConnectorWalletAPI);
  const caps = capabilitiesOf(wallet as unknown as { getProvingProvider?: unknown; signData?: unknown });
  let networkId: string | undefined;
  try {
    const cfg = await (wallet as unknown as { getConfiguration?: () => Promise<{ networkId?: string; proverServerUri?: string }> }).getConfiguration?.();
    networkId = cfg?.networkId;
  } catch {
    networkId = undefined;
  }
  if (networkId && networkId !== expectedNetwork && !(expectedNetwork === "preprod" && networkId.toLowerCase().includes("preprod"))) {
    throw new RemitError("NETWORK_MISMATCH", "wallet network does not match Preprod", "wrong network");
  }
  const kind = classifyWallet(api.name ?? "", api.name);
  if (kind === "lace" && caps.getProvingProvider) {
    // Lace must not be treated as in-tab proving.
  }
  if (kind === "lace" && !caps.localProofServer) {
    throw new RemitError("WALLET", "Lace proving requires a local proof server", "lace needs proof server");
  }
  const state: RemitClientState = {
    phase: "connected",
    kind,
    networkId,
    capabilities: caps,
  };
  void status;
  return { wallet, state };
}

export function assertNoPrivateStateMixing(nsA: string, nsB: string): void {
  if (nsA === nsB) throw new RemitError("UNAUTHORIZED", "wallet private-state namespaces collided");
}
