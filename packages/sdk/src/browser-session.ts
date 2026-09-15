import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { createBrowserProviders } from "../../core/src/browser-providers.ts";
import { HttpZkConfigProvider } from "../../core/src/http-zk.ts";
import { RemitError } from "../../core/src/errors.ts";
import { remitSetNetworkId } from "../../core/src/network-id.ts";
import { connectorAsWalletProvider } from "./connector-wallet.js";
import { capabilitiesOf, classifyWallet, provingPathFor, type WalletKind } from "./wallet.js";

export type BrowserSessionOpts = {
  wallet: ConnectedAPI;
  apiUrl: string;
  indexerHttp: string;
  indexerWs: string;
  proofServer?: string;
  zkScope?: "pool" | "quote";
  walletName?: string;
  walletRdns?: string;
  network?: string;
};

/**
 * Build midnight-js providers from an already-connected connector v4 wallet.
 * 1AM proves in-tab via getProvingProvider. Lace uses proof-server 8.1.0.
 */
export async function createRemitBrowserProviders(opts: BrowserSessionOpts) {
  let network = remitSetNetworkId(opts.network ?? "preprod");
  try {
    const status = await opts.wallet.getConnectionStatus();
    if (status.networkId) network = remitSetNetworkId(status.networkId);
  } catch {
    /* keep the configured network */
  }
  const kind: WalletKind = classifyWallet(opts.walletName ?? "", opts.walletRdns);
  const caps = capabilitiesOf(opts.wallet);
  const provingPath = provingPathFor(kind, caps);
  const wrapped = await connectorAsWalletProvider(opts.wallet);
  const midnightProvider = { submitTx: wrapped.submitTx.bind(wrapped) };
  const zk = new HttpZkConfigProvider(opts.apiUrl, opts.zkScope ?? "pool");

  if (provingPath === "lace-http") {
    return createBrowserProviders({
      indexerHttp: opts.indexerHttp,
      indexerWs: opts.indexerWs,
      apiUrl: opts.apiUrl,
      zkScope: opts.zkScope,
      walletProvider: wrapped,
      midnightProvider,
      proof: "lace-http",
      proofServer: opts.proofServer ?? "http://localhost:6300",
      network,
    });
  }

  if (typeof opts.wallet.getProvingProvider !== "function") {
    throw new RemitError("WALLET", "1AM must expose getProvingProvider for in-tab proving", "no proving provider");
  }
  const provingProvider = await opts.wallet.getProvingProvider(zk.asKeyMaterialProvider());
  return createBrowserProviders({
    indexerHttp: opts.indexerHttp,
    indexerWs: opts.indexerWs,
    apiUrl: opts.apiUrl,
    zkScope: opts.zkScope,
    walletProvider: wrapped,
    midnightProvider,
    proof: "1am-intab",
    provingProvider,
    network,
  });
}
