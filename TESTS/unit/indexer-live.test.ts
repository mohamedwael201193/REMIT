import { describe, it, expect } from "vitest";
import { fetchBlock, assertLedger8, requireContractAction } from "../../packages/core/src/indexer.ts";

describe("live Preprod indexer", () => {
  it("is ledger-8 era", async () => {
    const block = await fetchBlock("https://indexer.preprod.midnight.network/api/v4/graphql");
    expect(block.height).toBeGreaterThan(1_000_000);
    expect(block.protocolVersion).toBe(1_000_000);
    expect(() => assertLedger8(block)).not.toThrow();
    expect(() => requireContractAction(null, "quote")).toThrow(/indexer contractAction/);
    expect(() =>
      requireContractAction({ address: "aa", txHash: undefined, blockHeight: 1 }, "quote"),
    ).toThrow(/indexer contractAction/);
  });
});
