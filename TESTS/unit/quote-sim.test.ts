import { describe, it, expect } from "vitest";
import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits } from "../../CONTRACT/managed/remit_quote/contract/index.js";
import { quoteWitnesses, type QuotePrivateState } from "../../packages/core/src/quote-witnesses.ts";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";

describe("REMIT-Q quote contract (testnet-only, not a stablecoin)", () => {
  it("constructs, exposes a colour, and rejects a second claim in the same day bucket", () => {
    const sk = randomBytes32();
    const ps: QuotePrivateState = { version: 1, callerSk: Array.from(sk) };
    const contract = new Contract(quoteWitnesses);
    const built = contract.initialState(createConstructorContext(ps, "11".repeat(32)));
    let ctx = createCircuitContext(
      dummyContractAddress(),
      "11".repeat(32),
      built.currentContractState,
      built.currentPrivateState,
    );
    const color = contract.impureCircuits.quoteColor(ctx);
    ctx = color.context;
    expect(color.result.length).toBe(32);
    const day = 20000n;
    const to = {
      is_left: false,
      left: { bytes: new Uint8Array(32) },
      right: { bytes: randomBytes32() },
    };
    const claimed = contract.impureCircuits.claim(ctx, 1_000_000n, day, to);
    ctx = claimed.context;
    expect(ledger(ctx.currentQueryContext.state).minted).toBe(1n);
    expect(() => contract.impureCircuits.claim(ctx, 1_000_000n, day, to)).toThrow(/already claimed/i);
    expect(pureCircuits.claimTag(sk, day).length).toBe(32);
  });
});
