import { describe, it, expect } from "vitest";
import { emptyPrivateState } from "../../packages/core/src/state.ts";
import {
  freshTabWrapKey,
  openTabPrivateState,
  sealTabPrivateState,
  tabStorageKeys,
  migrateTabPrivateStorage,
} from "../../packages/core/src/tab-seal.ts";

describe("tab private-state seal", () => {
  it("round-trips openings and namespaces wrap/blob keys by wallet", () => {
    const ps = emptyPrivateState("ns");
    ps.ownerSk = Array.from({ length: 32 }, (_, i) => i);
    const wrap = freshTabWrapKey();
    const blob = sealTabPrivateState(ps, wrap);
    expect(blob.startsWith("JSON")).toBe(false);
    expect(blob.includes("ownerSk")).toBe(false);
    const opened = openTabPrivateState(blob, wrap);
    expect(opened.ownerSk).toEqual(ps.ownerSk);
    const a = tabStorageKeys("preprod", "pool", "wallet-a");
    const b = tabStorageKeys("preprod", "pool", "wallet-b");
    expect(a.blob).not.toBe(b.blob);
    expect(a.wrap).not.toBe(b.wrap);
  });

  it("migrates legacy address-keyed wrap/blob onto the hashed namespace and deletes the old keys", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem(k: string) {
        return map.has(k) ? map.get(k)! : null;
      },
      setItem(k: string, v: string) {
        map.set(k, v);
      },
      removeItem(k: string) {
        map.delete(k);
      },
    };
    const wallet = "mn_addr_preprod1aaaaaaaaaaaaaaaa";
    const prev = { wrap: `remit:wrap:preprod:pool:${wallet}`, blob: `remit:blob:preprod:pool:${wallet}` };
    map.set(prev.wrap, "wrap-hex");
    map.set(prev.blob, "sealed-blob");
    migrateTabPrivateStorage(storage, "preprod", "pool", wallet);
    const next = tabStorageKeys("preprod", "pool", wallet);
    expect(map.get(next.wrap)).toBe("wrap-hex");
    expect(map.get(next.blob)).toBe("sealed-blob");
    expect(map.has(prev.wrap)).toBe(false);
    expect(map.has(prev.blob)).toBe(false);
    expect([...map.keys()].some((k) => k.includes("mn_addr"))).toBe(false);
  });
});
