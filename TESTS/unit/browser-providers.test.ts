import { describe, it, expect } from "vitest";
import { inMemoryPrivateStateProvider } from "../../packages/core/src/memory-state.ts";
import { createBrowserProviders } from "../../packages/core/src/browser-providers.ts";
import { createRemitBrowserProviders } from "../../packages/sdk/src/browser-session.ts";
import { connectorTxHex, bytesToHex } from "../../packages/sdk/src/connector-wallet.ts";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";

function fakeConnected(over: Partial<ConnectedAPI> = {}): ConnectedAPI {
  return {
    getShieldedBalances: async () => ({}),
    getUnshieldedBalances: async () => ({ night: 1000n }),
    getDustBalance: async () => ({ balance: 1n, cap: 2n }),
    getShieldedAddresses: async () => ({
      shieldedAddress: "mn_shield_addr_preprod1test",
      shieldedCoinPublicKey: "aa".repeat(32),
      shieldedEncryptionPublicKey: "bb".repeat(32),
    }),
    getUnshieldedAddress: async () => ({ unshieldedAddress: "mn_addr_preprod1test" }),
    getDustAddress: async () => ({ dustAddress: "mn_dust_preprod1test" }),
    getTxHistory: async () => [],
    balanceUnsealedTransaction: async (tx: string) => ({ tx }),
    balanceSealedTransaction: async () => ({ tx: "00" }),
    makeTransfer: async () => ({ tx: "00" }),
    makeIntent: async () => ({ tx: "00" }),
    signData: async () => ({ data: "", signature: "", verifyingKey: "" }),
    submitTransaction: async () => undefined,
    getProvingProvider: async () => ({
      check: async () => [],
      prove: async () => new Uint8Array(),
    }),
    getConfiguration: async () => ({
      indexerUri: "https://indexer.preprod.midnight.network/api/v4/graphql",
      indexerWsUri: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
      substrateNodeUri: "wss://rpc.preprod.midnight.network",
      networkId: "preprod",
    }),
    getConnectionStatus: async () => ({ status: "connected" as const, networkId: "preprod" }),
    hintUsage: async () => undefined,
    ...over,
  };
}

describe("in-memory private state", () => {
  it("scopes get/set to the contract address and does not invent exports", async () => {
    const ps = inMemoryPrivateStateProvider<string, { n: number }>();
    await expect(ps.get("remit-pool")).rejects.toThrow(/contract address/);
    ps.setContractAddress("pool-a" as never);
    await ps.set("remit-pool", { n: 1 });
    expect(await ps.get("remit-pool")).toEqual({ n: 1 });
    ps.setContractAddress("pool-b" as never);
    expect(await ps.get("remit-pool")).toBeNull();
    await expect(ps.exportPrivateStates()).rejects.toThrow(/not exported/);
  });
});

describe("browser providers (no WalletFacade)", () => {
  it("hex-encodes connector transactions", () => {
    expect(bytesToHex(Uint8Array.from([0xab, 0xcd]))).toBe("abcd");
    expect(connectorTxHex({ serialize: () => Uint8Array.from([0x01, 0xff]) })).toBe("01ff");
    expect(connectorTxHex("0xAA")).toBe("AA");
  });

  it("builds 1AM in-tab providers from getProvingProvider", async () => {
    let provingCalls = 0;
    const wallet = fakeConnected({
      getProvingProvider: async () => {
        provingCalls += 1;
        return { check: async () => [], prove: async () => new Uint8Array() };
      },
    });
    const providers = await createRemitBrowserProviders({
      wallet,
      apiUrl: "https://remit-api-node.onrender.com",
      indexerHttp: "https://indexer.preprod.midnight.network/api/v4/graphql",
      indexerWs: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
      walletName: "1AM",
      walletRdns: "xyz.1am",
    });
    expect(provingCalls).toBe(1);
    expect(providers.zkConfigProvider).toBeDefined();
    expect(providers.proofProvider).toBeDefined();
    expect(providers.walletProvider).toBeDefined();
  });

  it("refuses Lace in-tab proving and requires a proof server path", () => {
    expect(() =>
      createBrowserProviders({
        indexerHttp: "https://indexer.preprod.midnight.network/api/v4/graphql",
        indexerWs: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
        apiUrl: "https://remit-api-node.onrender.com",
        walletProvider: {},
        midnightProvider: { submitTx: async () => "x" },
        proof: "1am-intab",
      }),
    ).toThrow(/getProvingProvider/);
  });

  it("builds Lace providers against the local proof server without getProvingProvider", async () => {
    const wallet = fakeConnected();
    const { getProvingProvider: _, ...laceWallet } = wallet;
    const providers = await createRemitBrowserProviders({
      wallet: laceWallet as ConnectedAPI,
      apiUrl: "https://remit-api-node.onrender.com",
      indexerHttp: "https://indexer.preprod.midnight.network/api/v4/graphql",
      indexerWs: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
      proofServer: "http://localhost:6300",
      walletName: "Lace",
      walletRdns: "io.lace",
    });
    expect(providers.proofProvider).toBeDefined();
  });
});
