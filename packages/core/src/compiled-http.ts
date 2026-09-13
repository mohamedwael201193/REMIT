import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { Contract as PoolContract } from "@remit/contracts/pool";
import { Contract as QuoteContract } from "@remit/contracts/quote";
import { quoteWitnesses } from "./quote-witnesses.js";
import { witnesses } from "./witnesses.js";

/** Compiled contract for HTTP ZK keys (no Node filesystem key path). */
export function compiledPoolHttp() {
  return CompiledContract.make("remit_pool", PoolContract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets("http-zk"),
  );
}

export function compiledQuoteHttp() {
  return CompiledContract.make("remit_quote", QuoteContract).pipe(
    CompiledContract.withWitnesses(quoteWitnesses),
    CompiledContract.withCompiledFileAssets("http-zk"),
  );
}
