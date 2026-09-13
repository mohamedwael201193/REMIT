import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { createProofProvider, type ProofProvider } from "@midnight-ntwrk/midnight-js-types";
import type { ProvingProvider } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { RemitError } from "./errors.js";
import { HttpZkConfigProvider } from "./http-zk.js";
import { inMemoryPrivateStateProvider } from "./memory-state.js";

export type BrowserProofKind = "1am-intab" | "lace-http";

export type BrowserProviderOpts = {
  indexerHttp: string;
  indexerWs: string;
  apiUrl: string;
  zkScope?: "pool" | "quote";
  walletProvider: unknown;
  midnightProvider: { submitTx: (tx: never) => Promise<unknown> };
  proof: BrowserProofKind;
  provingProvider?: ProvingProvider;
  proofServer?: string;
};

/**
 * MidnightProviders for a browser tab. Keys come from HTTP; proving is either
 * 1AM getProvingProvider or Lace's local proof-server 8.1.0. No WalletFacade.
 */
export function createBrowserProviders(opts: BrowserProviderOpts) {
  const zkConfigProvider = new HttpZkConfigProvider(opts.apiUrl, opts.zkScope ?? "pool");
  let proofProvider: ProofProvider;
  if (opts.proof === "1am-intab") {
    if (!opts.provingProvider) {
      throw new RemitError("WALLET", "1AM must expose getProvingProvider for in-tab proving", "no proving provider");
    }
    proofProvider = createProofProvider(opts.provingProvider);
  } else {
    const url = opts.proofServer ?? "http://localhost:6300";
    proofProvider = httpClientProofProvider(url, zkConfigProvider);
  }
  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    publicDataProvider: indexerPublicDataProvider(opts.indexerHttp, opts.indexerWs),
    zkConfigProvider,
    proofProvider,
    walletProvider: opts.walletProvider,
    midnightProvider: opts.midnightProvider,
  };
}
