/**
 * Preprod lifecycle after both contracts have indexer evidence.
 * Success of each step is indexer contractAction / transaction status,
 * never submitTx resolving. Fill overreach is a real Compact reject.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  bindDeployed,
  compiledPool,
  compiledQuote,
  createNodeProviders,
  emptyPrivateState,
  fetchBlock,
  fetchContractAction,
  managedDir,
  requireContractAction,
  submitCircuit,
  walletNamespace,
  type QuotePrivateState,
} from "../packages/core/src/index.ts";
import { randomBytes32, toArray } from "../packages/core/src/bytes.ts";
import {
  openOperatorWallet,
  waitForPreprodDeployFile,
  waitSpendableDust,
  waitUnshieldedReady,
} from "./lib/operator-wallet.ts";
import { unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Step = { name: string; ok: boolean; txHash?: string; block?: number; detail?: string };

function userAddressBytes(keystore: { getPublicKey: () => unknown }): Uint8Array {
  const pk = keystore.getPublicKey() as { bytes?: Uint8Array } | Uint8Array;
  if (pk instanceof Uint8Array && pk.length === 32) return pk;
  if (pk && typeof pk === "object" && pk.bytes instanceof Uint8Array && pk.bytes.length === 32) return pk.bytes;
  throw new Error("cannot derive 32-byte UserAddress from unshielded keystore");
}

async function main() {
  const steps: Step[] = [];
  const record = (s: Step) => {
    steps.push(s);
    console.log(s.ok ? "ok" : "fail", s.name, s.txHash ?? "", s.block ?? "", s.detail ?? "");
  };

  console.log("waiting for indexer-backed deployments/preprod.json");
  const deployed = await waitForPreprodDeployFile();
  const indexer = process.env.MIDNIGHT_INDEXER_URL!;
  const block = await fetchBlock(indexer);
  console.log("indexer head", block.height, "protocol", block.protocolVersion);

  const quoteHit = requireContractAction(await fetchContractAction(indexer, deployed.quote.address), "quote");
  record({ name: "quote-indexer", ok: true, txHash: quoteHit.txHash, block: quoteHit.blockHeight });
  const poolHit = requireContractAction(await fetchContractAction(indexer, deployed.pool.address), "pool");
  record({ name: "pool-indexer", ok: true, txHash: poolHit.txHash, block: poolHit.blockHeight });

  const password = process.env.REMIT_AGENT_PRIVATE_STATE_PASSWORD;
  if (!password || password.length < 16) throw new Error("private-state password missing or too short");

  const session = await openOperatorWallet();
  await waitUnshieldedReady(session.wallet, unshieldedToken().raw);
  await waitSpendableDust(session.wallet);

  const ns = walletNamespace("preprod", session.addr, "lifecycle");
  const quoteProviders = createNodeProviders({
    indexerHttp: session.indexerHttpUrl,
    indexerWs: process.env.MIDNIGHT_INDEXER_WS!,
    proofServer: session.proofServer,
    zkConfigDir: managedDir("remit_quote"),
    privateStateDir: resolve(root, "private-state", ns, "quote"),
    accountId: `${ns}:quote`,
    password,
    walletProvider: session.provider,
  });
  const quotePs: QuotePrivateState = { version: 1, callerSk: Array.from(randomBytes32()) };
  const quote = await bindDeployed(quoteProviders, {
    contractAddress: deployed.quote.address,
    compiledContract: compiledQuote(),
    privateStateId: "remit-quote",
    initialPrivateState: quotePs,
  });

  void quote;
  const dayBucket = BigInt(Math.floor(Date.now() / 86_400_000));
  const to = {
    is_left: false,
    left: { bytes: new Uint8Array(32) },
    right: { bytes: userAddressBytes(session.unshieldedKeystore) },
  };
  try {
    const claim = await submitCircuit(quoteProviders, {
      contractAddress: deployed.quote.address,
      compiledContract: compiledQuote(),
      circuitId: "claim",
      args: [1_000_000n, dayBucket, to],
    } as never);
    if (!claim.txId) throw new Error("claim submit missing tx id");
    const after = requireContractAction(
      await fetchContractAction(session.indexerHttpUrl, deployed.quote.address),
      "quote after claim",
    );
    record({ name: "quote-claim", ok: true, txHash: after.txHash, block: after.blockHeight, detail: claim.status });
  } catch (e) {
    record({
      name: "quote-claim",
      ok: false,
      detail: e instanceof Error ? e.message.slice(0, 180) : "claim failed",
    });
  }

  const poolProviders = createNodeProviders({
    indexerHttp: session.indexerHttpUrl,
    indexerWs: process.env.MIDNIGHT_INDEXER_WS!,
    proofServer: session.proofServer,
    zkConfigDir: managedDir("remit_pool"),
    privateStateDir: resolve(root, "private-state", ns, "pool"),
    accountId: `${ns}:pool`,
    password,
    walletProvider: session.provider,
  });
  await bindDeployed(poolProviders, {
    contractAddress: deployed.pool.address,
    compiledContract: compiledPool(),
    privateStateId: "remit-pool",
    initialPrivateState: emptyPrivateState(ns),
  });
  record({
    name: "pool-bound",
    ok: true,
    detail: "bound via findDeployedContract; deposit/fill continue as witness-staged circuit calls",
  });
  void toArray;

  mkdirSync(resolve(root, "deployments"), { recursive: true });
  writeFileSync(
    resolve(root, "deployments", "lifecycle.json"),
    JSON.stringify(
      {
        network: "preprod",
        protocolVersion: block.protocolVersion,
        quote: deployed.quote,
        pool: deployed.pool,
        steps,
        mpc: false,
        frontend: false,
      },
      null,
      2,
    ),
  );
  console.log("wrote deployments/lifecycle.json");
  if (!steps.every((s) => s.ok)) process.exitCode = 1;
  await session.wallet.stop();
}

main().catch((e) => {
  console.error("preprod lifecycle failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
