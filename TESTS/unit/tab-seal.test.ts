import { describe, it, expect } from "vitest";
import { emptyPrivateState } from "../../packages/core/src/state.ts";
import {
  freshTabWrapKey,
  openTabPrivateState,
  sealTabPrivateState,
  tabStorageKeys,
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
});
