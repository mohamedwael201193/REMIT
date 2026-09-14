import { describe, expect, it } from "vitest";
import { serializeStateMissingError, truncatePublic } from "../../scripts/lib/operator-wallet.ts";

describe("operator serializeState cache gate", () => {
  it("refuses genesis when the cache is missing", () => {
    const err = serializeStateMissingError(["operator.genesis-partial-171801"]);
    expect(err.message).toContain("wallet-cache/operator");
    expect(err.message).toContain("Refusing genesis replay");
    expect(err.message).not.toContain("cold DUST");
    expect(err.message).not.toContain("id: null");
  });

  it("truncates public addresses without leaking the middle", () => {
    const addr = "mn_addr_preprod1abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnop";
    const t = truncatePublic(addr, 20, 6);
    expect(t.startsWith("mn_addr_preprod1abcd")).toBe(true);
    expect(t.endsWith("lmnop")).toBe(true);
    expect(t.includes("efghijklmnopqrst")).toBe(false);
  });
});
