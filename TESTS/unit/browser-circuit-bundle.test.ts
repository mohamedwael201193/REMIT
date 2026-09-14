import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("1AM circuit bundle graph", () => {
  it("does not import the @remit/core barrel from browser-session or connector-wallet", () => {
    for (const rel of ["packages/sdk/src/browser-session.ts", "packages/sdk/src/connector-wallet.ts", "packages/sdk/src/wallet.ts"]) {
      const src = readFileSync(resolve(rel), "utf8");
      expect(src).not.toMatch(/from ["']@remit\/core["']/);
    }
  });

  it("copies Midnight wasm next to remit-circuit.js", () => {
    const src = readFileSync(resolve("scripts/build-browser-circuit.mjs"), "utf8");
    expect(src).toMatch(/midnight_onchain_runtime_wasm_bg\.wasm/);
    expect(src).toMatch(/midnight_ledger_wasm_bg\.wasm/);
    expect(src).toMatch(/browser-wasm-fs/);
  });

  it("fetches Compact prover keys from the public release at build", () => {
    const src = readFileSync(resolve("scripts/fetch-prover-keys.mjs"), "utf8");
    expect(src).toMatch(/zk-provers-compact-0.31.1/);
    expect(src).toMatch(/deposit\.prover/);
    expect(src).toMatch(/createMandate\.prover/);
    expect(src).toMatch(/revokeMandate\.prover/);
    const ignore = readFileSync(resolve(".gitignore"), "utf8");
    expect(ignore).toMatch(/keys\/\*\.prover/);
    expect(ignore).not.toMatch(/managed\/\*\*\/zkir\//);
  });

  it("built bundle exports Compact wallet circuits when present", () => {
    const js = resolve("dist/browser/remit-circuit.js");
    if (!existsSync(js)) return;
    const text = readFileSync(js, "utf8");
    expect(text).toMatch(/createMandateFromWallet/);
    expect(text).toMatch(/revokeMandatesFromWallet/);
    expect(text).not.toMatch(/new WebAssembly\.Module/);
    expect(text).toMatch(/WebAssembly\.instantiate/);
    expect(existsSync(resolve("dist/browser/midnight_ledger_wasm_bg.wasm"))).toBe(true);
  });
});
