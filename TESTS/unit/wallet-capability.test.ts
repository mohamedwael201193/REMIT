import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { classifyWalletMethodError, sanitizeConnectorError } from "../../front/src/lib/remit/wallet-diag.ts";
import {
  beginConnect,
  connectInjectedWallet,
  injectedApiForKind,
  LACE_CONNECT_TIMEOUT_MESSAGE,
  resetInflightConnect,
} from "../../front/src/lib/remit/midnight-connector.ts";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

afterEach(() => {
  resetInflightConnect();
});

function connectedApi() {
  return {
    getConnectionStatus: async () => ({ status: "connected" as const, networkId: "preprod" }),
    getUnshieldedAddress: async () => ({
      unshieldedAddress: "mn_addr_preprod1km3m0xdxcvurflvwv0vq6v9f647rae9r4sllzdd6ddk47khhw6wqkkfddp",
    }),
  };
}

describe("wallet capability classification", () => {
  it("classifies post-connect Lace failures without treating them as a missed connect()", () => {
    expect(classifyWalletMethodError(new Error("Wallet is unavailable"))).toBe("unavailable");
    expect(classifyWalletMethodError({ message: "midnight-authenticator was shutdown" })).toBe("unavailable");
    expect(classifyWalletMethodError({ code: "Disconnected", message: "Disconnected" })).toBe("unavailable");
    expect(classifyWalletMethodError(new Error("Lace connect() did not resolve"))).toBe("timeout");
    expect(classifyWalletMethodError(new Error(LACE_CONNECT_TIMEOUT_MESSAGE))).toBe("timeout");
    expect(classifyWalletMethodError({ code: "Rejected", message: "Rejected" })).toBe("rejected");
    expect(sanitizeConnectorError(new Error("addr mn_addr_preprod1km3m0xdxcvurflvwv0vq6v9f647rae9r4sllzdd6ddk47khhw6wqkkfddp"))).toEqual(
      expect.objectContaining({ err: expect.not.stringMatching(/mn_addr_preprod1km3/) }),
    );
  });

  it("reuses an in-flight Lace connect() instead of opening a second popup", async () => {
    let calls = 0;
    const connected = {
      getConnectionStatus: async () => ({ status: "connected" as const, networkId: "preprod" }),
      getUnshieldedAddress: async () => ({
        unshieldedAddress: "mn_addr_preprod1km3m0xdxcvurflvwv0vq6v9f647rae9r4sllzdd6ddk47khhw6wqkkfddp",
      }),
    };
    const win = {
      midnight: {
        lace: {
          name: "Lace",
          rdns: "io.lace.wallet",
          apiVersion: "4.0.1",
          connect: async () => {
            calls += 1;
            await new Promise((resolve) => setTimeout(resolve, 60));
            return connected;
          },
        },
      },
      sessionStorage: memoryStorage(),
    };
    const [a, b] = await Promise.all([
      connectInjectedWallet("lace", "preprod", win),
      connectInjectedWallet("lace", "preprod", win),
    ]);
    expect(calls).toBe(1);
    expect(a.state.status).toBe("connected");
    expect(b.state.status).toBe("connected");
    expect(a.state.methodsReady).toBe(true);
    expect(a.state.proofServerReady).toBeNull();
  });

  it("keeps connect() success when wallet-backed methods fail", async () => {
    const win = {
      midnight: {
        lace: {
          name: "Lace",
          rdns: "io.lace.wallet",
          apiVersion: "4.0.1",
          connect: async () => ({
            getConnectionStatus: async () => ({ status: "connected" as const, networkId: "preprod" }),
            getUnshieldedAddress: async () => {
              throw new Error("Wallet is unavailable");
            },
          }),
        },
      },
      sessionStorage: memoryStorage(),
    };
    const { state } = await connectInjectedWallet("lace", "preprod", win);
    expect(state.status).toBe("connected");
    expect(state.methodsReady).toBe(false);
    expect(state.address).toBeNull();
    expect(state.lastError).toMatch(/Wallet session unavailable for proving/);
    expect(state.lastError).not.toMatch(/Wallet did not connect/);
  });

  it("invokes connect() before beginConnect returns", () => {
    let entered = false;
    const api = {
      name: "Lace",
      rdns: "io.lace.wallet",
      apiVersion: "4.0.1",
      connect: () => {
        entered = true;
        return new Promise(() => {});
      },
    };
    beginConnect(api, "lace", "preprod");
    expect(entered).toBe(true);
  });

  it("reuses a click-started connect() instead of calling connect() again", async () => {
    let calls = 0;
    const win = {
      midnight: {
        lace: {
          name: "Lace",
          rdns: "io.lace.wallet",
          apiVersion: "4.0.1",
          connect: async () => {
            calls += 1;
            await new Promise((resolve) => setTimeout(resolve, 20));
            return connectedApi();
          },
        },
      },
      sessionStorage: memoryStorage(),
    };
    const api = injectedApiForKind("lace", win);
    beginConnect(api, "lace", "preprod");
    const { state } = await connectInjectedWallet("lace", "preprod", win);
    expect(calls).toBe(1);
    expect(state.status).toBe("connected");
    expect(state.methodsReady).toBe(true);
  });

  it("starts a new connect() after a timed-out Lace click", async () => {
    let calls = 0;
    const win = {
      midnight: {
        lace: {
          name: "Lace",
          rdns: "io.lace.wallet",
          apiVersion: "4.0.1",
          connect: async () => {
            calls += 1;
            if (calls === 1) return new Promise(() => {});
            return connectedApi();
          },
        },
      },
      sessionStorage: memoryStorage(),
    };
    await expect(connectInjectedWallet("lace", "preprod", win, { timeoutMs: 25 })).rejects.toThrow(
      LACE_CONNECT_TIMEOUT_MESSAGE,
    );
    expect(calls).toBe(1);
    const { state } = await connectInjectedWallet("lace", "preprod", win);
    expect(calls).toBe(2);
    expect(state.status).toBe("connected");
  });

  it("keeps the 1AM connect path independent of Lace inflight state", async () => {
    const win = {
      midnight: {
        "1am": {
          name: "1AM",
          rdns: "io.oneam.wallet",
          apiVersion: "4.0.0",
          connect: async () => connectedApi(),
        },
      },
      sessionStorage: memoryStorage(),
    };
    const { state } = await connectInjectedWallet("1am", "preprod", win);
    expect(state.status).toBe("connected");
    expect(state.provider).toBe("1am");
    expect(state.provingPath).toBe("1am-intab");
    expect(state.methodsReady).toBe(true);
  });

  it("starts Lace connect() from the wallet tile click before store work", () => {
    const button = readFileSync(resolve("front/src/components/remit/wallet/wallet-button.tsx"), "utf8");
    expect(button).toMatch(/startConnectInClick\(p\.kind\)/);
    expect(button).toMatch(/beginConnect\(api, kind, CONNECT_NETWORK\)/);
    expect(button).toMatch(/Waiting for Lace authorization/);
    expect(button).toMatch(/LACE_CONNECT_TIMEOUT_MESSAGE/);
    const click = button.slice(button.indexOf("onClick={() => {"), button.indexOf("void connect(p.kind)"));
    expect(click).toMatch(/startConnectInClick/);
    expect(click).not.toMatch(/await /);
  });
});
