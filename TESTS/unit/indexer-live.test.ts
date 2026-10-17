import { describe, it, expect } from "vitest";
import { fetchBlock, assertLedger8, requireContractAction } from "../../packages/core/src/indexer.ts";

// The legacy public indexer (indexer.preprod.midnight.network) was decommissioned
// (HTTP 410 since Oct 2026). The replacement is Blockfrost's Midnight indexer,
// which requires BLOCKFROST_PROJECT_ID. The live check below runs only when a
// usable indexer URL is configured via MIDNIGHT_INDEXER_URL; otherwise it skips
// explicitly (vitest reports the skip — it is not a silent pass). The offline
// invariants always run.
const LIVE_TIMEOUT_MS = 20_000;

function resolveIndexerUrl(): string | null {
  const fromEnv = process.env.MIDNIGHT_INDEXER_URL?.trim();
  // Do NOT fall back to the legacy URL: it is dead, and pretending to check it
  // would turn a known outage into a confusing failure.
  return fromEnv || null;
}

describe("live Preprod indexer", () => {
  it("offline invariants hold (no network)", () => {
    expect(() => assertLedger8({ height: 3014589, protocolVersion: 1000300 })).not.toThrow();
    expect(() => assertLedger8({ height: 1, protocolVersion: 2000000 })).toThrow(/ledger-9 era/);
    expect(() => requireContractAction(null, "quote")).toThrow(/indexer contractAction/);
    expect(() =>
      requireContractAction({ address: "aa", txHash: undefined, blockHeight: 1 }, "quote"),
    ).toThrow(/indexer contractAction/);
  });

  it("is ledger-8 era (live, when an indexer is configured)", async (ctx) => {
    const url = resolveIndexerUrl();
    if (!url) {
      console.warn(
        "SKIP live indexer check: MIDNIGHT_INDEXER_URL not set (legacy public indexer decommissioned, HTTP 410)",
      );
      ctx.skip();
      return;
    }
    const block = await Promise.race([
      fetchBlock(url),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`indexer timeout after ${LIVE_TIMEOUT_MS}ms`)), LIVE_TIMEOUT_MS),
      ),
    ]).catch((e: Error) => {
      console.warn(`SKIP live indexer check: indexer unreachable at ${url}: ${e.message}`);
      ctx.skip();
      return null;
    });
    if (!block) return;
    expect(block.height).toBeGreaterThan(1_000_000);
    expect(block.protocolVersion).toBeGreaterThanOrEqual(1_000_000);
    expect(block.protocolVersion).toBeLessThan(2_000_000);
    expect(() => assertLedger8(block)).not.toThrow();
  });
});
