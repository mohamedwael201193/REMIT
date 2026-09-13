/**
 * Live Preprod UTXO registration flag for the operator unshielded address.
 * Address is public. Never prints secrets.
 */
import { WebSocket } from "ws";
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const ADDR = process.env.REMIT_OPERATOR_UNSHIELDED_ADDR;
const WS = process.env.MIDNIGHT_INDEXER_WS ?? "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";
const HTTP = process.env.MIDNIGHT_INDEXER_URL ?? "https://indexer.preprod.midnight.network/api/v4/graphql";

if (!ADDR) {
  console.error("missing REMIT_OPERATOR_UNSHIELDED_ADDR");
  process.exit(1);
}

const QUERY = `{ block { height protocolVersion hash } }`;
const SUB = `subscription ($address: UnshieldedAddress!) {
  unshieldedTransactions(address: $address) {
    ... on UnshieldedTransaction {
      createdUtxos { value tokenType registeredForDustGeneration intentHash outputIndex }
      spentUtxos { value tokenType registeredForDustGeneration }
      transaction { hash }
    }
    ... on UnshieldedTransactionsProgress { highestTransactionId }
  }
}`;

async function block() {
  const res = await fetch(HTTP, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY }),
  });
  const json = await res.json();
  console.log("preprod block", JSON.stringify(json.data?.block ?? json.errors ?? json));
}

function subscribe(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS, "graphql-transport-ws");
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("indexer utxo subscription timeout"));
    }, 25_000);
    const hits: unknown[] = [];
    ws.on("open", () => ws.send(JSON.stringify({ type: "connection_init" })));
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw)) as {
        type: string;
        payload?: { data?: { unshieldedTransactions?: Record<string, unknown> }; errors?: unknown };
      };
      if (msg.type === "connection_ack") {
        ws.send(JSON.stringify({ id: "1", type: "subscribe", payload: { query: SUB, variables: { address: ADDR } } }));
        return;
      }
      if (msg.type === "error") {
        clearTimeout(timer);
        ws.close();
        reject(new Error(JSON.stringify(msg.payload ?? msg)));
        return;
      }
      if (msg.type !== "next") return;
      const ev = msg.payload?.data?.unshieldedTransactions;
      if (!ev) return;
      hits.push(ev);
      const created = ev.createdUtxos as
        | { registeredForDustGeneration?: boolean; intentHash?: string; value?: string }[]
        | undefined;
      if (Array.isArray(created) && created.length > 0) {
        console.log("unshielded utxos", JSON.stringify(created));
        const flags = created.map((u) => u.registeredForDustGeneration);
        console.log("registeredForDustGeneration", flags);
        if (created.some((u) => u.registeredForDustGeneration === true)) {
          clearTimeout(timer);
          ws.send(JSON.stringify({ id: "1", type: "complete" }));
          ws.close();
          resolve();
        }
      }
    });
    ws.on("close", () => {
      if (hits.length === 0) return;
    });
  });
}

await block();
try {
  await subscribe();
} catch (e) {
  console.error("subscription failed:", e instanceof Error ? e.message : "error");
  process.exit(2);
}
