import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { RemitError } from "@remit/core";
import {
  assertLaceProofServer,
  capabilitiesOf,
  classifyWallet,
  requireClickHandler,
  requireConnectorV4,
  type RemitClientState,
  type WalletKind,
} from "./wallet.js";

export type MidnightWindow = Window & {
  midnight?: { [rdns: string]: InitialAPI };
};

export async function discoverWallets(win: MidnightWindow): Promise<{ rdns: string; name: string; kind: WalletKind; apiVersion: string }[]> {
  const midnight = win.midnight ?? {};
  const out: { rdns: string; name: string; kind: WalletKind; apiVersion: string }[] = [];
  for (const [rdns, api] of Object.entries(midnight)) {
    const name = api.name ?? rdns;
    out.push({ rdns: api.rdns ?? rdns, name, kind: classifyWallet(name, api.rdns ?? rdns), apiVersion: api.apiVersion ?? "" });
  }
  return out;
}

export async function readConnectedPublicState(wallet: ConnectedAPI): Promise<{
  unshieldedAddress?: string;
  dustAddress?: string;
  dust?: RemitClientState["dust"];
  networkId?: string;
}> {
  let unshieldedAddress: string | undefined;
  let dustAddress: string | undefined;
  let dust: RemitClientState["dust"];
  let networkId: string | undefined;
  try {
    unshieldedAddress = (await wallet.getUnshieldedAddress()).unshieldedAddress;
  } catch {
    unshieldedAddress = undefined;
  }
  try {
    dustAddress = (await wallet.getDustAddress()).dustAddress;
  } catch {
    dustAddress = undefined;
  }
  try {
    const d = await wallet.getDustBalance();
    dust = { balance: d.balance, cap: d.cap, spendableKnown: false };
  } catch {
    dust = undefined;
  }
  try {
    const cfg = await wallet.getConfiguration();
    networkId = cfg.networkId;
  } catch {
    networkId = undefined;
  }
  return { unshieldedAddress, dustAddress, dust, networkId };
}

function networkMatches(expected: string, actual: string | undefined): boolean {
  if (!actual) return false;
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  if (a === e) return true;
  return e === "preprod" && a.includes("preprod");
}

export async function connectWallet(
  api: InitialAPI,
  expectedNetwork: string,
  gesture: { fromClickHandler: boolean },
): Promise<{ wallet: ConnectedAPI; state: RemitClientState }> {
  requireClickHandler(gesture);
  requireConnectorV4(api.apiVersion);
  const wallet = await api.connect(expectedNetwork);
  const status = await wallet.getConnectionStatus();
  if (status.status !== "connected") {
    throw new RemitError("WALLET", "connector did not report connected", "not connected");
  }
  if (!networkMatches(expectedNetwork, status.networkId)) {
    throw new RemitError("NETWORK_MISMATCH", "wallet network does not match Preprod", "wrong network");
  }
  const caps = capabilitiesOf(wallet);
  const kind = classifyWallet(api.name ?? "", api.rdns ?? api.name);
  let proverServerUri: string | undefined;
  try {
    proverServerUri = (await wallet.getConfiguration())?.proverServerUri;
  } catch {
    proverServerUri = undefined;
  }
  if (kind === "lace") {
    if (caps.getProvingProvider) {
      throw new RemitError("WALLET", "Lace must not be treated as in-tab proving", "lace needs proof server");
    }
    await assertLaceProofServer(proverServerUri ?? "http://localhost:6300");
  }
  try {
    await wallet.hintUsage([
      "getUnshieldedAddress",
      "getDustAddress",
      "getDustBalance",
      "getUnshieldedBalances",
      "balanceUnsealedTransaction",
      "submitTransaction",
      "getConnectionStatus",
      "getConfiguration",
    ]);
  } catch {
    // hintUsage is advisory; some wallets resolve permissions on the first call instead.
  }
  const pub = await readConnectedPublicState(wallet);
  const state: RemitClientState = {
    phase: "connected",
    kind,
    networkId: status.networkId,
    unshieldedAddress: pub.unshieldedAddress,
    dustAddress: pub.dustAddress,
    dust: pub.dust,
    capabilities: caps,
  };
  return { wallet, state };
}

export function assertNoPrivateStateMixing(nsA: string, nsB: string): void {
  if (nsA === nsB) throw new RemitError("UNAUTHORIZED", "wallet private-state namespaces collided");
}

export async function reconnectWallet(
  api: InitialAPI,
  expectedNetwork: string,
  gesture: { fromClickHandler: boolean },
): Promise<{ wallet: ConnectedAPI; state: RemitClientState }> {
  return connectWallet(api, expectedNetwork, gesture);
}

export function assertDisconnected(status: { status: string }): void {
  if (status.status !== "disconnected") {
    throw new RemitError("WALLET", "wallet is still connected", "expected disconnected");
  }
}
