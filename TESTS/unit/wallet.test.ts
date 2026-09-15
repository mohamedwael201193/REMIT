import { describe, it, expect } from "vitest";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { walletNamespace } from "../../packages/core/src/state.ts";
import {
  classifyWallet,
  capabilitiesOf,
  requireClickHandler,
  pauseForUserGesture,
  markUserApproved,
  assertApproved,
  assertLaceProofServer,
  provingPathFor,
  requireConnectorV4,
  assertSpendableDust,
} from "../../packages/sdk/src/wallet.ts";
import { assertNoPrivateStateMixing, connectWallet, discoverWallets, reconnectWallet, assertDisconnected } from "../../packages/sdk/src/adapter.ts";
import { connectorAsWalletProvider } from "../../packages/sdk/src/connector-wallet.ts";

function fakeConnected(over: Partial<ConnectedAPI> = {}): ConnectedAPI {
  return {
    getShieldedBalances: async () => ({}),
    getUnshieldedBalances: async () => ({ night: 1000n }),
    getDustBalance: async () => ({ balance: 113_920_000_000_000_000n, cap: 5_000_000_000_000_000_000n }),
    getShieldedAddresses: async () => ({
      shieldedAddress: "mn_shield_addr_preprod1test",
      shieldedCoinPublicKey: "x",
      shieldedEncryptionPublicKey: "y",
    }),
    getUnshieldedAddress: async () => ({
      unshieldedAddress: "mn_addr_preprod1km3m0xdxcvurflvwv0vq6v9f647rae9r4sllzdd6ddk47khhw6wqkkfddp",
    }),
    getDustAddress: async () => ({
      dustAddress: "mn_dust_preprod1wdmsssf9kpgerd33vfhv7mzn9fwyzrnr02wqs9wexj3k60dxlahyzmptlgj",
    }),
    getTxHistory: async () => [],
    balanceUnsealedTransaction: async () => ({ tx: "00" }),
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

function fakeInitial(over: Partial<InitialAPI> = {}, connected: ConnectedAPI = fakeConnected()): InitialAPI {
  return {
    rdns: "xyz.1am",
    name: "1AM",
    icon: "",
    apiVersion: "4.0.1",
    connect: async () => connected,
    ...over,
  };
}

describe("wallet isolation + capability detection", () => {
  it("namespaces differ across wallets and networks", () => {
    const a = walletNamespace("preprod", "mn_addr_preprod1aaa", "contract");
    const b = walletNamespace("preprod", "mn_addr_preprod1bbb", "contract");
    const c = walletNamespace("undeployed", "mn_addr_preprod1aaa", "contract");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("classifies 1AM vs Lace proving paths honestly", () => {
    expect(classifyWallet("1AM", "xyz.1am")).toBe("1am");
    expect(classifyWallet("Lace", "io.lace")).toBe("lace");
    expect(capabilitiesOf({ getProvingProvider: () => undefined }).getProvingProvider).toBe(true);
    expect(capabilitiesOf({}).getProvingProvider).toBe(false);
    expect(capabilitiesOf({}).localProofServer).toBe(true);
    expect(provingPathFor("lace", capabilitiesOf({ getProvingProvider: () => undefined }))).toBe("lace-http");
    expect(provingPathFor("1am", capabilitiesOf({ getProvingProvider: () => undefined }))).toBe("1am-intab");
  });

  it("refuses colliding private-state namespaces", () => {
    const a = walletNamespace("preprod", "mn_addr_preprod1aaa", "contract");
    const b = walletNamespace("preprod", "mn_addr_preprod1bbb", "contract");
    expect(() => assertNoPrivateStateMixing(a, a)).toThrow();
    expect(() => assertNoPrivateStateMixing(a, b)).not.toThrow();
  });

  it("does not proceed without a user gesture and does not fake Lace proving", async () => {
    expect(() => requireClickHandler({ fromClickHandler: false })).toThrow(/click handler/);
    requireClickHandler({ fromClickHandler: true });
    const gate = pauseForUserGesture();
    expect(() => assertApproved(gate)).toThrow(/user gesture required/);
    markUserApproved(gate);
    assertApproved(gate);
    await expect(assertLaceProofServer("http://127.0.0.1:1")).rejects.toThrow(/proof-server 8\.1\.0 is not reachable/);
  });
});

describe("DApp connector v4 + DUST honesty", () => {
  it("refuses connector v3 and connect() outside a click handler", async () => {
    expect(() => requireConnectorV4("3.0.0")).toThrow(/v4/);
    requireConnectorV4("4.0.1");
    const api = fakeInitial();
    await expect(connectWallet(api, "preprod", { fromClickHandler: false })).rejects.toThrow(/click handler/);
  });

  it("connects 1AM on Preprod and treats getDustBalance as display-only", async () => {
    const api = fakeInitial();
    const { state } = await connectWallet(api, "preprod", { fromClickHandler: true });
    expect(state.phase).toBe("connected");
    expect(state.kind).toBe("1am");
    expect(state.unshieldedAddress).toContain("mn_addr_preprod1km3m0xdxcvurflvwv0vq6v9f647rae9r4sllzdd6ddk47khhw6wqkkfddp");
    expect(state.dust?.balance).toBeGreaterThan(0n);
    expect(state.dust?.spendableKnown).toBe(false);
    expect(() => assertSpendableDust({})).toThrow(/getDustBalance is not a spendable-coin gate/);
    expect(() => assertSpendableDust({ availableCoins: 0 })).toThrow(/no spendable DUST coin/);
    assertSpendableDust({ availableCoins: 1 });
  });

  it("blocks network mismatch and a disconnected connector", async () => {
    const wrongNet = fakeConnected({
      getConnectionStatus: async () => ({ status: "connected", networkId: "mainnet" }),
    });
    await expect(connectWallet(fakeInitial({}, wrongNet), "preprod", { fromClickHandler: true })).rejects.toThrow(
      /does not match Preprod/,
    );
    const lost = fakeConnected({
      getConnectionStatus: async () => ({ status: "disconnected" }),
    });
    await expect(connectWallet(fakeInitial({}, lost), "preprod", { fromClickHandler: true })).rejects.toThrow(
      /did not report connected/,
    );
  });

  it("connects Lace on the local proof-server path even if getProvingProvider is a stub", async () => {
    const lace = fakeInitial({ name: "Lace", rdns: "io.lace" });
    const { state } = await connectWallet(lace, "preprod", { fromClickHandler: true });
    expect(state.phase).toBe("connected");
    expect(state.kind).toBe("lace");
    expect(state.provingPath).toBe("lace-http");
    expect(state.capabilities.localProofServer).toBe(true);
    expect(state.unshieldedAddress).toContain("mn_addr_preprod1");
  });

  it("requires a fresh user gesture to reconnect and accepts a disconnected status", async () => {
    const api = fakeInitial();
    const first = await connectWallet(api, "preprod", { fromClickHandler: true });
    expect(first.state.phase).toBe("connected");
    await expect(reconnectWallet(api, "preprod", { fromClickHandler: false })).rejects.toThrow(/click handler/);
    const second = await reconnectWallet(api, "preprod", { fromClickHandler: true });
    expect(second.state.phase).toBe("connected");
    expect(() => assertDisconnected({ status: "connected" })).toThrow(/still connected/);
    assertDisconnected({ status: "disconnected" });
  });

  it("discovers injected InitialAPI entries", async () => {
    const found = await discoverWallets({ midnight: { "xyz.1am": fakeInitial() } } as never);
    expect(found).toEqual([{ rdns: "xyz.1am", name: "1AM", kind: "1am", apiVersion: "4.0.1" }]);
  });

  it("wraps connector v4 as a WalletProvider without opening a WalletFacade", async () => {
    let seen = "";
    const connected = fakeConnected({
      balanceUnsealedTransaction: async (tx: string) => {
        seen = tx;
        return { tx };
      },
    });
    const provider = await connectorAsWalletProvider(connected);
    expect(provider.getCoinPublicKey?.()).toBe("x");
    expect(provider.encryptionPublicKey).toBe("y");
    await expect(
      provider.balanceTx({ serialize: () => Uint8Array.from([0xab, 0xcd]) } as never),
    ).rejects.toThrow();
    expect(seen).toBe("abcd");
  });
});
