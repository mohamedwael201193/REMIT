const url = "https://indexer.preprod.midnight.network/api/v4/graphql";
const address = process.argv[2];
if (!address) {
  console.error("usage: node scripts/indexer-contract-action.mjs <address>");
  process.exit(1);
}
const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    query: `query ($address: HexEncoded!) {
      contractAction(address: $address) {
        address
        transaction { hash block { height } }
      }
    }`,
    variables: { address },
  }),
});
const json = await res.json();
if (json.errors) {
  console.error(json.errors[0]?.message ?? "indexer error");
  process.exit(1);
}
const a = json.data?.contractAction;
console.log(
  JSON.stringify({
    address: a?.address,
    txHash: a?.transaction?.hash,
    block: a?.transaction?.block?.height,
  }),
);
