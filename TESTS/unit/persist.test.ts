import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decryptPrivateState,
  encryptPrivateState,
  loadOrCreateState,
  saveState,
} from "../../packages/core/src/persist.ts";
import { emptyPrivateState, walletNamespace } from "../../packages/core/src/state.ts";
import { CIRCUIT_CALL_PATH } from "../../packages/core/src/tx.ts";
import { compiledPool, compiledQuote, managedDir } from "../../packages/core/src/compiled.ts";

describe("encrypted private state", () => {
  it("round-trips and isolates namespaces", () => {
    const dir = mkdtempSync(join(tmpdir(), "remit-ps-"));
    const password = "sixteen-chars-min-password";
    const a = loadOrCreateState(join(dir, "a.bin"), password, "ns-a");
    a.notes.push({ asset: "0", amount: "1", owner: Array(32).fill(1), nonce: Array(32).fill(2) });
    saveState(join(dir, "a.bin"), password, a);
    const raw = readFileSync(join(dir, "a.bin"));
    expect(raw.subarray(0, 4).toString()).toBe("RMT1");
    const loaded = decryptPrivateState(raw, password);
    expect(loaded.namespace).toBe("ns-a");
    expect(loaded.notes[0]?.amount).toBe("1");
    expect(() => loadOrCreateState(join(dir, "a.bin"), password, "ns-b")).toThrow(/namespace/);
    const blob = encryptPrivateState(emptyPrivateState("x"), password);
    expect(decryptPrivateState(blob, password).notes).toEqual([]);
  });
});

describe("canonical circuit-call path", () => {
  it("is intent through indexer-truth-gate", () => {
    expect(CIRCUIT_CALL_PATH).toEqual([
      "intent",
      "build",
      "prove",
      "balance",
      "submit",
      "finalize",
      "indexer-truth-gate",
    ]);
  });
});

describe("compiled contract wrappers", () => {
  it("points at managed artifacts", () => {
    expect(existsSync(join(managedDir("remit_quote"), "contract", "index.js"))).toBe(true);
    expect(existsSync(join(managedDir("remit_pool"), "contract", "index.js"))).toBe(true);
    const q = compiledQuote();
    const p = compiledPool();
    expect(q.tag).toBe("remit_quote");
    expect(p.tag).toBe("remit_pool");
  });
});

describe("wallet namespace helper", () => {
  it("differs across wallets", () => {
    expect(walletNamespace("preprod", "a", "c")).not.toBe(walletNamespace("preprod", "b", "c"));
  });
});
