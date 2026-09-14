import { fetchContractAction, requireContractAction } from "../packages/core/src/indexer.ts";

const idx = "https://indexer.preprod.midnight.network/api/v4/graphql";
const quote = requireContractAction(
  await fetchContractAction(idx, "7559e38693725dafef73486f2ee3aa30ee0b5b543e22d0aa5ad7303c37b55e3f"),
  "quote",
);
const pool = requireContractAction(
  await fetchContractAction(idx, "e82dea02b2397332df0bb10e2df6d9e257c8ceba696415ed3c10f639f68d43d4"),
  "pool",
);
console.log(
  JSON.stringify({
    quote: { address: quote.address, txHash: quote.txHash, block: quote.blockHeight, hasState: Boolean(quote.stateHex) },
    pool: { address: pool.address, txHash: pool.txHash, block: pool.blockHeight, hasState: Boolean(pool.stateHex) },
  }),
);
