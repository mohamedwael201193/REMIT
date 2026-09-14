const url = "https://indexer.preprod.midnight.network/api/v4/graphql";
const hash = process.argv[2] ?? "22c76487e28d09b1bd1150fe7ba2f3e8007b81ebe48b65ff276ef62455bafe8e";

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    query: `query ($h: HexEncoded!) { transactions(offset: { hash: $h }) { hash raw } }`,
    variables: { h: hash },
  }),
});
const json = await res.json();
if (json.errors) {
  console.error(json.errors[0]?.message ?? "indexer error");
  process.exit(1);
}
const tx = json.data?.transactions?.[0];
if (!tx?.raw) {
  console.error("no raw transaction");
  process.exit(1);
}
const raw = String(tx.raw);
const bytes = Buffer.from(raw, "hex").length;
const BROADCAST = 200_000;
const TX_MAX = 1_048_576;
console.log(
  JSON.stringify({
    hash: tx.hash,
    rawHexChars: raw.length,
    txBytes: bytes,
    broadcastBudget: BROADCAST,
    txMax: TX_MAX,
    underBroadcast: bytes < BROADCAST,
    underTxMax: bytes < TX_MAX,
    note: "v1 historical fill — not MBBE fill evidence",
  }),
);
