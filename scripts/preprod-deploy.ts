/**
 * Preprod deploy: quote contract then pool.
 * Requires spendable DUST, local proof-server 8.1.0, and compiled ZK keys.
 * Success is indexer contractAction, not submitTx resolving.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import {
  CIRCUIT_CALL_PATH,
  compiledPool,
  compiledQuote,
  createNodeProviders,
  deployCompiled,
  emptyPrivateState,
  fetchBlock,
  fetchContractAction,
  managedDir,
  walletNamespace,
  type QuotePrivateState,
} from "../packages/core/src/index.ts";
import { randomBytes32 } from "../packages/core/src/bytes.ts";
import {
  closeOperatorWallet,
  ensureOperatorDust,
  openOperatorWallet,
  persistOperatorWallet,
} from "./lib/operator-wallet.ts";
import { requireContractAction } from "../packages/core/src/indexer.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function requireKeys(name: "remit_pool" | "remit_quote") {
  const dir = managedDir(name);
  const sample = name === "remit_pool" ? "fill.prover" : "claim.prover";
  const p = resolve(dir, "keys", sample);
  if (!existsSync(p)) throw new Error(`missing ZK key ${p} — run compact compile with keys first`);
}

async function proofServerOk(url: string) {
  const res = await fetch(new URL("/health", url));
  if (!res.ok) throw new Error(`proof server unhealthy ${res.status}`);
}

async function main() {
  console.log("preprod deploy gate");
  console.log("circuit-call path", CIRCUIT_CALL_PATH.join(" → "));
  console.log("network", process.env.MIDNIGHT_NETWORK);
  requireKeys("remit_quote");
  requireKeys("remit_pool");

  const password = process.env.REMIT_AGENT_PRIVATE_STATE_PASSWORD;
  if (!password || password.length < 16) throw new Error("private-state password missing or too short");

  console.log("opening the SAME operator wallet; DUST wait and deploy share one WalletFacade");
  const session = await openOperatorWallet();
  try {
  const state = await ensureOperatorDust(session);
  console.log("spendable DUST coins", state.dust?.availableCoins?.length ?? 0);
  await persistOperatorWallet(session.wallet);

  await proofServerOk(session.proofServer);
  const block = await fetchBlock(session.indexerHttpUrl);
  console.log("indexer head", block.height, "protocol", block.protocolVersion);

  const ns = walletNamespace("preprod", session.addr, "deploy");
  const privateDir = resolve(root, "private-state", ns);
  mkdirSync(privateDir, { recursive: true });

  const quotePs: QuotePrivateState = { version: 1, callerSk: Array.from(randomBytes32()) };
  const quoteProviders = createNodeProviders({
    indexerHttp: session.indexerHttpUrl,
    indexerWs: process.env.MIDNIGHT_INDEXER_WS!,
    proofServer: session.proofServer,
    zkConfigDir: managedDir("remit_quote"),
    privateStateDir: resolve(privateDir, "quote"),
    accountId: `${ns}:quote`,
    password,
    walletProvider: session.provider,
  });

  console.log("deploying remit_quote");
  const quote = await deployCompiled(quoteProviders, {
    compiledContract: compiledQuote(),
    privateStateId: "remit-quote",
    initialPrivateState: quotePs,
  });
  console.log("quote address", quote.contractAddress, "tx", quote.evidence.txId, "status", quote.evidence.status);
  const quoteAction = requireContractAction(
    await fetchContractAction(session.indexerHttpUrl, quote.contractAddress),
    "quote deploy",
  );
  console.log("quote indexer tx", quoteAction.txHash, "block", quoteAction.blockHeight);

  const colorCall = await quote.deployed.callTx.quoteColor();
  const color = (colorCall as { private?: { result?: Uint8Array } }).private?.result
    ?? (colorCall as { result?: Uint8Array }).result;
  if (!(color instanceof Uint8Array) || color.length !== 32) {
    throw new Error("quoteColor did not return 32 bytes");
  }
  console.log("quoteColor obtained (32 bytes)");

  const poolProviders = createNodeProviders({
    indexerHttp: session.indexerHttpUrl,
    indexerWs: process.env.MIDNIGHT_INDEXER_WS!,
    proofServer: session.proofServer,
    zkConfigDir: managedDir("remit_pool"),
    privateStateDir: resolve(privateDir, "pool"),
    accountId: `${ns}:pool`,
    password,
    walletProvider: session.provider,
  });

  console.log("deploying remit_pool");
  const pool = await deployCompiled(poolProviders, {
    compiledContract: compiledPool(),
    privateStateId: "remit-pool",
    initialPrivateState: emptyPrivateState(ns),
    args: [color],
  } as never);
  console.log("pool address", pool.contractAddress, "tx", pool.evidence.txId, "status", pool.evidence.status);
  const poolAction = requireContractAction(
    await fetchContractAction(session.indexerHttpUrl, pool.contractAddress),
    "pool deploy",
  );
  console.log("pool indexer tx", poolAction.txHash, "block", poolAction.blockHeight);

  mkdirSync(resolve(root, "deployments"), { recursive: true });
  const out = {
    network: "preprod",
    protocolVersion: block.protocolVersion,
    quote: {
      address: quote.contractAddress,
      txId: quote.evidence.txId,
      txHash: quoteAction.txHash,
      block: quoteAction.blockHeight,
    },
    pool: {
      address: pool.contractAddress,
      txId: pool.evidence.txId,
      txHash: poolAction.txHash,
      block: poolAction.blockHeight,
    },
    asset: { base: "tNIGHT", quote: "REMIT-Q", stablecoin: false },
  };
  writeFileSync(resolve(root, "deployments", "preprod.json"), JSON.stringify(out, null, 2));
  console.log("wrote deployments/preprod.json");
  } finally {
    await closeOperatorWallet(session);
  }
}

main().catch((e) => {
  console.error("preprod deploy failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
