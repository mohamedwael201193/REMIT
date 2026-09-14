/**
 * Deploy a NEW MBBE pool on Preprod using the existing REMIT-Q quote contract.
 * Keeps v1 pool `e82dea02…` as historical evidence. Same operator wallet. No second faucet.
 *
 * Success is indexer contractAction (tx + block), not submitTx resolving.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  bindDeployed,
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
const V1_FILE = resolve(root, "deployments", "preprod.json");
const MBBE_FILE = resolve(root, "deployments", "preprod-mbbe.json");

function requirePoolKeys() {
  const p = resolve(managedDir("remit_pool"), "keys", "fill.prover");
  if (!existsSync(p)) throw new Error(`missing ZK key ${p} — run compact compile with keys first`);
}

async function proofServerOk(url: string) {
  const res = await fetch(new URL("/health", url));
  if (!res.ok) throw new Error(`proof server unhealthy ${res.status}`);
}

function v1QuoteAddress(): string {
  const fromEnv = process.env.REMIT_QUOTE_ADDRESS?.trim();
  if (fromEnv && /^[0-9a-f]{64}$/i.test(fromEnv)) return fromEnv.toLowerCase();
  if (!existsSync(V1_FILE)) throw new Error("deployments/preprod.json missing; cannot reuse REMIT-Q");
  const j = JSON.parse(readFileSync(V1_FILE, "utf8")) as { quote?: { address?: string } };
  const addr = j.quote?.address?.trim() ?? "";
  if (!/^[0-9a-f]{64}$/i.test(addr)) throw new Error("v1 quote address missing");
  return addr.toLowerCase();
}

async function main() {
  console.log("preprod MBBE pool deploy (reuse existing REMIT-Q)");
  console.log("circuit-call path", CIRCUIT_CALL_PATH.join(" → "));
  console.log("network", process.env.MIDNIGHT_NETWORK);
  requirePoolKeys();
  const quoteAddr = v1QuoteAddress();
  console.log("existing quote", quoteAddr.slice(0, 12) + "…");

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

    const ns = walletNamespace("preprod", session.addr, "mbbe-deploy");
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
    const quoteBound = await bindDeployed(quoteProviders, {
      contractAddress: quoteAddr,
      compiledContract: compiledQuote(),
      privateStateId: "remit-quote",
      initialPrivateState: quotePs,
    });
    const colorCall = await quoteBound.callTx.quoteColor();
    const color =
      (colorCall as { private?: { result?: Uint8Array } }).private?.result ??
      (colorCall as { result?: Uint8Array }).result;
    if (!(color instanceof Uint8Array) || color.length !== 32) {
      throw new Error("quoteColor did not return 32 bytes");
    }
    console.log("quoteColor obtained from existing REMIT-Q (32 bytes)");

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

    console.log("deploying MBBE remit_pool (new address)");
    const pool = await deployCompiled(poolProviders, {
      compiledContract: compiledPool(),
      privateStateId: "remit-pool",
      initialPrivateState: emptyPrivateState(ns),
      args: [color],
    } as never);
    console.log("pool address", pool.contractAddress, "tx", pool.evidence.txId, "status", pool.evidence.status);
    const poolAction = requireContractAction(
      await fetchContractAction(session.indexerHttpUrl, pool.contractAddress),
      "mbbe pool deploy",
    );
    console.log("pool indexer tx", poolAction.txHash, "block", poolAction.blockHeight);

    mkdirSync(resolve(root, "deployments"), { recursive: true });
    const v1 = existsSync(V1_FILE)
      ? (JSON.parse(readFileSync(V1_FILE, "utf8")) as { pool?: { address?: string; txHash?: string; block?: number } })
      : {};
    const out = {
      network: "preprod",
      protocolVersion: block.protocolVersion,
      historicalV1Pool: v1.pool ?? null,
      quote: {
        address: quoteAddr,
        reused: true,
      },
      pool: {
        address: pool.contractAddress,
        txId: pool.evidence.txId,
        txHash: poolAction.txHash,
        block: poolAction.blockHeight,
        semantics: "mbbe-k3",
      },
      asset: { base: "tNIGHT", quote: "REMIT-Q", stablecoin: false },
      mpc: false,
      globalBest: false,
    };
    writeFileSync(MBBE_FILE, JSON.stringify(out, null, 2));
    console.log("wrote deployments/preprod-mbbe.json");
  } finally {
    await closeOperatorWallet(session);
  }
}

main().catch((e) => {
  console.error("mbbe pool deploy failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
