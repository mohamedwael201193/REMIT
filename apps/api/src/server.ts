import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT ?? process.env.REMIT_API_PORT ?? 8787);

const { app } = await buildApp({
  cors: process.env.REMIT_API_CORS_ORIGIN ?? "*",
  admin: process.env.REMIT_API_ADMIN_TOKEN ?? "",
  rfqSk: process.env.REMIT_AGENT_RFQ_BOX_SECRET_HEX ?? "",
  execSk: process.env.REMIT_EXECUTOR_SECRET_HEX ?? "",
  pool: process.env.REMIT_POOL_CONTRACT_ADDRESS ?? "",
  quote: process.env.REMIT_TESTQUOTE_CONTRACT_ADDRESS ?? "",
  network: process.env.MIDNIGHT_NETWORK ?? "preprod",
  indexer: process.env.MIDNIGHT_INDEXER_URL ?? "https://indexer.preprod.midnight.network/api/v4/graphql",
  inboxFile: process.env.REMIT_RFQ_INBOX_FILE ?? "private-state/rfq-inbox.rmt1",
  httpSubmit: process.env.REMIT_AGENT_SUBMIT === "1",
});

await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`remit api listening on ${PORT}`);
