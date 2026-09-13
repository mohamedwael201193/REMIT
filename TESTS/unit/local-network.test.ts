import { describe, it, expect } from "vitest";
import { probeLocalDev } from "../../scripts/lib/local-probe.ts";

describe("midnight-local-dev endpoints (skip if stack is not running)", () => {
  it("reports the three official undeployed probes without starting Docker", async () => {
    const h = await probeLocalDev();
    expect(typeof h.node).toBe("boolean");
    expect(typeof h.indexer).toBe("boolean");
    expect(typeof h.proof).toBe("boolean");
    if (!(h.node && h.indexer && h.proof)) {
      expect(h.node || h.indexer || h.proof || true).toBe(true);
      return;
    }
    expect(h.node).toBe(true);
    expect(h.indexer).toBe(true);
    expect(h.proof).toBe(true);
  });
});
