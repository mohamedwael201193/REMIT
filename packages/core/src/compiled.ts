import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { Contract as PoolContract } from "@remit/contracts/pool";
import { Contract as QuoteContract } from "@remit/contracts/quote";
import { quoteWitnesses } from "./quote-witnesses.js";
import { witnesses } from "./witnesses.js";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

export function managedDir(name: "remit_pool" | "remit_quote"): string {
  return resolve(repoRoot, "CONTRACT", "managed", name);
}

export function compiledQuote(dir = managedDir("remit_quote")) {
  return CompiledContract.make("remit_quote", QuoteContract).pipe(
    CompiledContract.withWitnesses(quoteWitnesses),
    CompiledContract.withCompiledFileAssets(dir),
  );
}

export function compiledPool(dir = managedDir("remit_pool")) {
  return CompiledContract.make("remit_pool", PoolContract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(dir),
  );
}
