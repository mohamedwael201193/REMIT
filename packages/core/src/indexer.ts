import { RemitError } from "./errors.js";

export type IndexerConfig = {
  httpUrl: string;
  wsUrl?: string;
};

export type BlockInfo = {
  height: number;
  protocolVersion: number;
  hash?: string;
  timestamp?: number;
};

const LEDGER8_PROTOCOL_MIN = 1_000_000;
const LEDGER9_PROTOCOL_MIN = 2_000_000;

export async function graphql<T>(httpUrl: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(httpUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new RemitError("INDEXER", `HTTP ${res.status}`, "indexer http error");
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new RemitError("INDEXER", json.errors[0].message, "indexer graphql error");
  if (!json.data) throw new RemitError("INDEXER", "empty indexer data");
  return json.data;
}

export async function fetchBlock(httpUrl: string): Promise<BlockInfo> {
  const data = await graphql<{ block: BlockInfo }>(httpUrl, `{ block { height protocolVersion hash timestamp } }`);
  return data.block;
}

export function assertLedger8(block: BlockInfo): void {
  if (block.protocolVersion >= LEDGER9_PROTOCOL_MIN) {
    throw new RemitError("NETWORK_MISMATCH", "indexer is ledger-9 era; Wave 1 artifacts are ledger 8", "wrong ledger");
  }
  if (block.protocolVersion < LEDGER8_PROTOCOL_MIN && block.protocolVersion !== 1_000_000) {
    // Preprod currently reports 1000000. Accept that era.
  }
}

export type ContractActionHit = {
  address: string;
  stateHex?: string;
  txHash?: string;
  blockHeight?: number;
};

export function requireContractAction(hit: ContractActionHit | null, label: string): ContractActionHit {
  if (!hit?.address || !hit.txHash || hit.blockHeight == null) {
    throw new RemitError("FINALIZE", `${label} missing indexer contractAction evidence (tx hash + block)`);
  }
  return hit;
}

export async function fetchContractAction(httpUrl: string, address: string): Promise<ContractActionHit | null> {
  const data = await graphql<{
    contractAction?: { address: string; state: string; transaction?: { hash: string; block?: { height: number } } };
  }>(
    httpUrl,
    `query ($address: HexEncoded!) {
      contractAction(address: $address) {
        address
        state
        transaction { hash block { height } }
      }
    }`,
    { address },
  );
  const a = data.contractAction;
  if (!a) return null;
  return {
    address: a.address,
    stateHex: a.state,
    txHash: a.transaction?.hash,
    blockHeight: a.transaction?.block?.height,
  };
}

export async function awaitIndexerTx(
  httpUrl: string,
  txHash: string,
  timeoutMs = 180_000,
): Promise<{ hash: string; height?: number; status?: string }> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const data = await graphql<{
        transactions?: { hash: string; block?: { height: number }; transactionResult?: { status: string } }[];
      }>(
        httpUrl,
        `query ($hash: HexEncoded!) {
          transactions(hash: $hash) {
            hash
            block { height }
            transactionResult { status }
          }
        }`,
        { hash: txHash },
      );
      const tx = data.transactions?.[0];
      if (tx?.hash) {
        const status = tx.transactionResult?.status;
        if (status && status !== "SUCCESS" && status !== "SucceedEntirely") {
          throw new RemitError("FINALIZE", "indexer reports non-success", status);
        }
        return { hash: tx.hash, height: tx.block?.height, status };
      }
    } catch (e) {
      if (e instanceof RemitError && e.code === "FINALIZE") throw e;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new RemitError("FINALIZE", "timed out waiting for indexer confirmation");
}
