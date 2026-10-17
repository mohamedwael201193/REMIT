// Verify routes for the public no-wallet verify page (N5).
//
// GET /verify/tx/:hash — server-side lookup of a tx:
//   1. Blockfrost Midnight Preprod indexer (GraphQL), authenticated with the
//      BLOCKFROST_PROJECT_ID env var. The token is server-side ONLY: it is
//      never returned in any response, never logged, never sent to the client.
//   2. Fallback: public node RPC (rpc.preprod.midnight.network) — this RPC
//      exposes NO tx-by-hash method, so the fallback can only report chain
//      liveness / tip height. found stays false there (honest, never faked).
// Every element in the response is labeled verified / linked / unverified:
//   - "verified": confirmed by an on-chain read.
//   - "linked":  a deep link, not a claim (e.g. explorer URL).
//   - "unverified": not confirmed; no claim is made.
//
// GET /verify/disclose/:nullifier — on-ledger presence check for a disclosure
// nullifier. The disclose circuit has NOT shipped, so this honestly returns
// { supported: false } rather than a fabricated answer.
import type { FastifyInstance } from "fastify";

export type VerifyDeps = {
  network: string;
};

const BLOCKFROST_INDEXER_PREPROD = "https://midnight-preprod.blockfrost.io/api/v0";
const EXPLORER_TX_PREPROD = "https://preprod.midnightexplorer.com/transactions/";
const PUBLIC_RPC_PREPROD = "https://rpc.preprod.midnight.network";
const INDEXER_TIMEOUT_MS = 15_000;
const RPC_TIMEOUT_MS = 8_000;

const HEX64 = /^[0-9a-fA-F]{64}$/;

type VerifyLabel = "verified" | "linked" | "unverified";
type VerifyLabels = Record<string, VerifyLabel>;

const LINKED_EXPLORER_LABELS: VerifyLabels = { explorerUrl: "linked" };

async function queryBlockfrostTx(
  indexerUrl: string,
  projectId: string,
  hash: string,
): Promise<{ blockHeight: number } | null> {
  const res = await fetch(indexerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Server-side only. Never echoed back in any response.
      project_id: projectId,
    },
    signal: AbortSignal.timeout(INDEXER_TIMEOUT_MS),
    body: JSON.stringify({
      query: `query ($h: HexEncoded!) { transactions(offset: { hash: $h }) { hash block { height } } }`,
      variables: { h: hash },
    }),
  });
  if (!res.ok) throw new Error(`indexer http ${res.status}`);
  const json = (await res.json()) as {
    errors?: { message?: string }[];
    data?: { transactions?: { hash?: string; block?: { height?: number } }[] };
  };
  if (json.errors?.length) throw new Error(`indexer: ${json.errors[0]?.message ?? "query failed"}`);
  const tx = json.data?.transactions?.[0];
  const height = tx?.block?.height;
  if (!tx?.hash || typeof height !== "number" || !Number.isFinite(height)) return null;
  return { blockHeight: height };
}

async function publicRpcLiveness(rpcUrl: string): Promise<{ alive: boolean; tipHeight: number | null }> {
  const rpc = async (method: string) => {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    });
    if (!res.ok) throw new Error(`rpc http ${res.status}`);
    return (await res.json()) as { result?: unknown };
  };
  try {
    await rpc("system_health");
    const head = await rpc("chain_getHeader");
    const numberHex = (head.result as { number?: string } | undefined)?.number;
    const tipHeight =
      typeof numberHex === "string" && /^0x[0-9a-fA-F]+$/.test(numberHex)
        ? parseInt(numberHex, 16)
        : null;
    return { alive: true, tipHeight };
  } catch {
    return { alive: false, tipHeight: null };
  }
}

export function registerVerifyRoutes(app: FastifyInstance, deps: VerifyDeps): void {
  app.get("/verify/tx/:hash", async (req, reply) => {
    const raw = (req.params as { hash?: string }).hash ?? "";
    const hash = raw.toLowerCase();
    if (!HEX64.test(hash)) {
      return reply.code(400).send({ error: "invalid tx hash: expected 64 hex chars" });
    }
    // Preprod only for Wave 2; explorer deep link is a LINK, never a claim.
    const explorerUrl = `${EXPLORER_TX_PREPROD}${hash}`;

    const projectId = process.env.BLOCKFROST_PROJECT_ID ?? "";
    if (projectId) {
      try {
        const hit = await queryBlockfrostTx(BLOCKFROST_INDEXER_PREPROD, projectId, hash);
        if (hit) {
          return {
            hash,
            found: true,
            blockHeight: hit.blockHeight,
            explorerUrl,
            source: "blockfrost",
            verifiedVsLinked: {
              txExists: "verified" as const,
              blockHeight: "verified" as const,
              ...LINKED_EXPLORER_LABELS,
            },
          };
        }
        return {
          hash,
          found: false,
          blockHeight: null,
          explorerUrl,
          source: "blockfrost",
          verifiedVsLinked: {
            txExists: "unverified" as const,
            blockHeight: "unverified" as const,
            ...LINKED_EXPLORER_LABELS,
          },
          note: "hash not present in the indexer",
        };
      } catch {
        // Fall through to the public-RPC fallback liveness check below.
      }
    }

    // Fallback: the public node RPC has no tx-by-hash method, so it cannot
    // confirm or deny a tx. We report chain liveness only — found stays false.
    const rpc = await publicRpcLiveness(PUBLIC_RPC_PREPROD);
    return {
      hash,
      found: false,
      blockHeight: null,
      explorerUrl,
      source: "none" as const,
      verifiedVsLinked: {
        txExists: "unverified" as const,
        blockHeight: "unverified" as const,
        ...LINKED_EXPLORER_LABELS,
      },
      note: projectId
        ? "indexer lookup failed; public RPC exposes no tx-lookup method, so the tx is unverified"
        : "BLOCKFROST_PROJECT_ID is not configured server-side; public RPC exposes no tx-lookup method, so the tx is unverified",
      rpcAlive: rpc.alive,
      tipHeight: rpc.tipHeight,
      network: deps.network,
    };
  });

  app.get("/verify/disclose/:nullifier", async (req, reply) => {
    const raw = (req.params as { nullifier?: string }).nullifier ?? "";
    const nullifier = raw.toLowerCase();
    if (!HEX64.test(nullifier)) {
      return reply.code(400).send({
        supported: false,
        error: "invalid nullifier: expected 64 hex chars",
      });
    }
    // The disclose circuit has not shipped (N1 is Wave-2 work in progress).
    // There is no disclosure nullifier on ledger to check against, so we say
    // so plainly instead of returning a fabricated verdict.
    return {
      supported: false,
      nullifier,
      onLedger: null,
      note: "disclose circuit not shipped: no disclosure nullifier exists on ledger, nothing to check",
    };
  });
}
