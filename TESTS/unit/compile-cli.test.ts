import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Compact compile CLI for a clean judge checkout", () => {
  const src = readFileSync(resolve("scripts/compile.mjs"), "utf8");

  it("compiles the real pool and quote sources", () => {
    expect(src).toContain("CONTRACT/src/remit_pool.compact");
    expect(src).toContain("CONTRACT/src/remit_quote.compact");
    expect(src).toContain("CONTRACT/managed/remit_pool");
    expect(src).toContain("CONTRACT/managed/remit_quote");
  });

  it("invokes compact compile on Unix and keeps a Windows WSL fallback", () => {
    expect(src).toContain('spawnSync("compact"');
    expect(src).toContain("win32");
    expect(src).toContain("wsl");
    expect(src).toContain("--skip-zk");
  });
});
