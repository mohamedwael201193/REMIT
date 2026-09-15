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

  it("sets Midnight network id before browser circuit-calls", () => {
    const session = readFileSync(resolve("packages/sdk/src/browser-session.ts"), "utf8");
    const providers = readFileSync(resolve("packages/core/src/browser-providers.ts"), "utf8");
    const helper = readFileSync(resolve("packages/core/src/network-id.ts"), "utf8");
    expect(helper).toMatch(/setNetworkId/);
    expect(session).toMatch(/remitSetNetworkId/);
    expect(providers).toMatch(/remitSetNetworkId/);
    const call = readFileSync(resolve("front/src/lib/remit/circuit-call.ts"), "utf8");
    expect(call).toMatch(/v=ps4/);
    const build = readFileSync(resolve("scripts/build-browser-circuit.mjs"), "utf8");
    expect(build).toMatch(/buffer-polyfill/);
    expect(build).toMatch(/from "buffer"/);
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
    expect(src).toMatch(/withdraw\.prover/);
    expect(src).toMatch(/placeOffer\.prover/);
    const ignore = readFileSync(resolve(".gitignore"), "utf8");
    expect(ignore).toMatch(/keys\/\*\.prover/);
    expect(ignore).not.toMatch(/managed\/\*\*\/zkir\//);
  });

  it("keeps tab-local mandate openings in sessionStorage for revoke", () => {
    const src = readFileSync(resolve("packages/sdk/src/browser-circuits.ts"), "utf8");
    expect(src).toMatch(/sessionStorage/);
    expect(src).toMatch(/writeTabPrivate/);
    expect(src).toMatch(/readTabPrivate/);
    expect(src).toMatch(/postCiphertext/);
    expect(src).toMatch(/circuitId: "withdraw"/);
    expect(src).toMatch(/if \(!note\)/);
    expect(src).toMatch(/compactRecipient/);
    expect(src).toMatch(/MidnightBech32m/);
    expect(src).toMatch(/http:\/\/localhost:6300/);
    expect(src).not.toMatch(/getConfiguration/);
    const live = readFileSync(resolve("front/src/lib/remit/live-provider.ts"), "utf8");
    expect(live).toMatch(/did not decrease/);
    expect(live).toMatch(/ensureProvingSession/);
    expect(live).not.toMatch(/indexer still reports activeMandates > 0/);
    expect(live).toMatch(/kind === "lace" && this.connected/);
    expect(live).toMatch(/await this.connectWallet\(kind\)/);
    expect(live).toMatch(/Lace requires a click/);
    expect(live).not.toMatch(/await this.load\(\);\s*await this.ensureProvingSession/);
    const connect = live.slice(live.indexOf("async connectWallet"), live.indexOf("private async ensureProvingSession"));
    expect(connect).toMatch(/connectInjectedWallet/);
    expect(connect).not.toMatch(/this\.load\(/);
    const connector = readFileSync(resolve("front/src/lib/remit/midnight-connector.ts"), "utf8");
    expect(connector).not.toMatch(/await wallet\.hintUsage/);
    expect(connector).not.toMatch(/await .*getConfiguration/);
    expect(connector).toMatch(/inflightConnect/);
    expect(connector).toMatch(/T2-connect-start/);
    expect(connector).toMatch(/beginConnect/);
    expect(connector).toMatch(/LACE_CONNECT_TIMEOUT_MESSAGE/);
    expect(connector).toMatch(/methodsReady: false/);
    const button = readFileSync(resolve("front/src/components/remit/wallet/wallet-button.tsx"), "utf8");
    expect(button).toMatch(/beginConnect/);
    expect(button).toMatch(/startConnectInClick/);
    const settings = readFileSync(resolve("front/src/components/remit/app/view-settings.tsx"), "utf8");
    expect(settings).toMatch(/deposits 1 then withdraws/);
  });

  it("built bundle exports Compact wallet circuits when present", () => {
    const js = resolve("dist/browser/remit-circuit.js");
    if (!existsSync(js)) return;
    const text = readFileSync(js, "utf8");
    expect(text).toMatch(/createMandateFromWallet/);
    expect(text).toMatch(/revokeMandatesFromWallet/);
    expect(text).toMatch(/placeOfferFromWallet/);
    expect(text).toMatch(/withdrawFromWallet/);
    expect(text).not.toMatch(/new WebAssembly\.Module/);
    expect(text).toMatch(/WebAssembly\.instantiate/);
    expect(text).toMatch(/Buffer/);
    expect(text).toMatch(/globalThis\.Buffer = require_buffer\(\)\.Buffer/);
    expect(existsSync(resolve("dist/browser/midnight_ledger_wasm_bg.wasm"))).toBe(true);
  });
});
