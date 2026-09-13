import { describe, it, expect } from "vitest";
import { walletNamespace } from "../../packages/core/src/state.ts";
import {
  classifyWallet,
  capabilitiesOf,
  requireClickHandler,
  pauseForUserGesture,
  markUserApproved,
  assertApproved,
  assertLaceProofServer,
} from "../../packages/sdk/src/wallet.ts";
import { assertNoPrivateStateMixing } from "../../packages/sdk/src/adapter.ts";

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
    await expect(assertLaceProofServer("http://127.0.0.1:1")).rejects.toThrow(/Lace local proof server/);
  });
});
