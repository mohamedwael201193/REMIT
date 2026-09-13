import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { createBrowserProviders, HttpZkConfigProvider, RemitError } from "@remit/core";
import { connectorAsWalletProvider } from "./connector-wallet.js";
import { capabilitiesOf, classifyWallet, type WalletKind } from "./wallet.js";

export type BrowserSessionOpts = {
  wallet: ConnectedAPI;
  apiUrl: string;
  indexerHttp: string;
  indexerWs: string;
  proofServer?: string;
  zkScope?: "pool" | "quote";
  walletName?: string;
  walletRdns?: string;
};

/**
 * Build midnight-js providers from an already-connected connector v4 wallet.
 * 1AM proves in-tab via getProvingProvider. Lace uses proof-server 8.1.0.
 */
export async function createRemitBrowserProviders(opts: BrowserSessionOpts) {
  const kind: WalletKind = classifyWallet(opts.walletName ?? "", opts.walletRdns);
  const caps = capabilitiesOf(opts.wallet);
  const wrapped = await connectorAsWalletProvider(opts.wallet);
  const midnightProvider = { submitTx: wrapped.submitTx.bind(wrapped) };
  const zk = new HttpZkConfigProvider(opts.apiUrl, opts.zkScope ?? "pool");

  if (kind === "lace" || (!caps.getProvingProvider && kind !== "1am")) {
    if (caps.getProvingProvider && kind === "lace") {
      throw new RemitError("WALLET", "Lace must not be treated as in-tab proving", "lace needs proof server");
    }
    return createBrowserProviders({
      indexerHttp: opts.indexerHttp,
      indexerWs: opts.indexerWs,
      apiUrl: opts.apiUrl,
      zkScope: opts.zkScope,
      walletProvider: wrapped,
      midnightProvider,
      proof: "lace-http",
      proofServer: opts.proofServer ?? "http://localhost:6300",
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
  });
}
