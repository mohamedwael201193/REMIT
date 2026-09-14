import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapLedgerFailure } from "../../packages/core/src/errors.ts";

describe("mapLedgerFailure", () => {
  it("keeps the original ledger or witness message", () => {
    const err = mapLedgerFailure("CallTxFailedError status=FailEntirely circuit=claim");
    expect(err.publicDetail).toMatch(/FailEntirely/);
    expect(err.message).not.toBe("ledger rejected transaction");
  });

  it("classifies missing privateStateId as CONFIG", () => {
    const err = mapLedgerFailure("'privateStateId' was defined for call transaction while 'privateStateProvider' was undefined");
    expect(err.code).toBe("CONFIG");
  });
});

describe("submitStagedCircuit", () => {
  it("passes privateStateId into submitCircuit", () => {
    const src = readFileSync(resolve("packages/core/src/stage-call.ts"), "utf8");
    expect(src).toMatch(/privateStateId:\s*args\.privateStateId/);
  });
});
