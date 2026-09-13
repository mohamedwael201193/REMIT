import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { RemitError } from "./errors.js";

export type WalletLike = {
  coinPublicKey: string;
  encryptionPublicKey: string;
  balanceTx: (...args: never[]) => Promise<unknown>;
  submitTx: (...args: never[]) => Promise<unknown>;
};

export type NodeProviderOpts = {
  indexerHttp: string;
  indexerWs: string;
  proofServer: string;
  zkConfigDir: string;
  privateStateDir: string;
  accountId: string;
  password: string;
  walletProvider: unknown;
};

/**
 * Shared provider bundle. Node executor and browser adapters both pass this
 * into `deployCompiled` / `submitCircuit`.
 */
export function createNodeProviders(opts: NodeProviderOpts) {
  if (!opts.password || opts.password.length < 16) {
    throw new RemitError("CONFIG", "private-state password too short");
  }
  const zkConfigProvider = new NodeZkConfigProvider(opts.zkConfigDir);
  return {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: opts.privateStateDir,
      privateStoragePasswordProvider: () => opts.password,
      accountId: opts.accountId,
    }),
    publicDataProvider: indexerPublicDataProvider(opts.indexerHttp, opts.indexerWs),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(opts.proofServer, zkConfigProvider),
    walletProvider: opts.walletProvider,
    midnightProvider: opts.walletProvider as { submitTx: (tx: unknown) => Promise<unknown> },
  };
}
