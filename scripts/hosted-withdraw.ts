/**
 * Real Preprod withdraw of a leftover custody note to the canonical operator address.
 * Same operator wallet. No genesis. No second wallet. No mocked tx.
 */
import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeUserAddress } from "@midnight-ntwrk/ledger-v8";
import { pureCircuits } from "../CONTRACT/managed/remit_pool/contract/index.js";
import {
  bindDeployed,
  compiledPool,
  createNodeProviders,
  emptyPrivateState,
  fetchBlock,
  fetchContractAction,
  managedDir,
  pendingDeposit,
  pendingWithdraw,
  poolLedgerFromStateHex,
  randomBytes32,
  requireContractAction,
  submitStagedCircuit,
  walletNamespace,
} from "../packages/core/src/index.ts";
import {
  closeOperatorWallet,
  ensureOperatorDust,
  openOperatorWallet,
  snapshotOperatorDiagnostics,
  waitForOperatorWalletUnlocked,
  waitForPreprodDeployFile,
  waitUntilSynced,
} from "./lib/operator-wallet.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.env.REMIT_DEPLOY_FILE ??= "deployments/preprod-mbbe.json";

const API = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");

type Step = { name: string; ok: boolean; txHash?: string; block?: number; detail?: string };

async function proofServerReady(url: string): Promise<boolean> {
  try {
    const res = await fetch(new URL("/health", url));
    return res.ok;
  } catch {
    return false;
  }
}

function userAddressBytes(address: string): Uint8Array {
  const encoded = encodeUserAddress(address);
  if (encoded.length !== 32) {
    throw new Error(`encodeUserAddress produced ${encoded.length} bytes, expected 32`);
  }
  return encoded;
}

async function main() {
  const steps: Step[] = [];
  const record = (s: Step) => {
    steps.push(s);
    console.log(s.ok ? "ok" : "fail", s.name, s.txHash ?? "", s.block ?? "", s.detail ?? "");
  };

  const proofUrl = process.env.MIDNIGHT_PROOF_SERVER_URL ?? "http://localhost:6300";
  record({ name: "proof-server", ok: await proofServerReady(proofUrl), detail: proofUrl });
  if (!steps[0]!.ok) process.exit(1);

  const deployed = await waitForPreprodDeployFile();
  await waitForOperatorWalletUnlocked();
  const indexer = process.env.MIDNIGHT_INDEXER_URL!;
  const head = await fetchBlock(indexer);
  console.log("indexer head", head.height, "protocol", head.protocolVersion);

  const password = process.env.REMIT_AGENT_PRIVATE_STATE_PASSWORD;
  if (!password || password.length < 16) throw new Error("private-state password missing or too short");

  const session = await openOperatorWallet();
  try {
    const walletDiag = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    console.log(JSON.stringify({ wallet: { restored: walletDiag.restored, synced: walletDiag.synced } }));
    if (walletDiag.restored !== true) throw new Error("operator wallet was not restored from serializeState");
    const synced = await waitUntilSynced(session.wallet, 15 * 60_000);
    const walletReady = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    if (!synced || walletReady.synced !== true) {
      throw new Error("restored serializeState but isSynced=false; refusing prove/submit");
    }
    await ensureOperatorDust(session);

    const ns = walletNamespace("preprod", session.addr, "hosted-withdraw");
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

    async function poolState() {
      const hit = requireContractAction(
        await fetchContractAction(session.indexerHttpUrl, deployed.pool.address),
        "pool",
      );
      if (!hit.stateHex) throw new Error("indexer contractAction missing state");
      return { hit, ld: poolLedgerFromStateHex(hit.stateHex) };
    }

    const ownerSk = randomBytes32();
    const amount = 1n;
    const note = {
      asset: 0n,
      amount,
      owner: pureCircuits.ownerKey(ownerSk),
      nonce: randomBytes32(),
    };
    const deposited = await submitStagedCircuit(poolProviders, {
      contractAddress: deployed.pool.address,
      compiledContract: compiledPool(),
      privateStateId: "remit-pool",
      circuitId: "deposit",
      circuitArgs: [0n, amount],
      pending: pendingDeposit(ownerSk, note.nonce),
      fallback: emptyPrivateState(ns),
    });
    const afterDep = await poolState();
    record({
      name: "pool-deposit-withdraw-source",
      ok: Boolean(deposited.txHash ?? afterDep.hit.txHash),
      txHash: deposited.txHash ?? afterDep.hit.txHash,
      block: deposited.blockHeight ?? afterDep.hit.blockHeight,
      detail: deposited.status,
    });

    const { ld } = await poolState();
    const withdrawn = await submitStagedCircuit(poolProviders, {
      contractAddress: deployed.pool.address,
      compiledContract: compiledPool(),
      privateStateId: "remit-pool",
      circuitId: "withdraw",
      circuitArgs: [0n, amount],
      pending: pendingWithdraw(ld, ownerSk, note, userAddressBytes(session.addr), randomBytes32()),
      fallback: emptyPrivateState(ns),
    });
    const after = await poolState();
    record({
      name: "pool-withdraw",
      ok: Boolean(withdrawn.txHash ?? after.hit.txHash) && after.hit.txHash !== afterDep.hit.txHash,
      txHash: after.hit.txHash,
      block: after.hit.blockHeight,
      detail: withdrawn.status,
    });
  } finally {
    await closeOperatorWallet(session);
  }

  mkdirSync(join(root, "deployments"), { recursive: true });
  writeFileSync(join(root, "deployments", "hosted-withdraw.json"), JSON.stringify({ network: "preprod", steps }, null, 2));

  const admin = process.env.REMIT_API_ADMIN_TOKEN ?? "";
  if (admin) {
    const { publishPublicEvidence } = await import("./lib/public-evidence.ts");
    const evidence = (await (await fetch(`${API}/evidence`)).json()) as {
      pool?: { address?: string; txHash?: string; block?: number };
      quote?: { address?: string; txHash?: string; block?: number };
      steps?: Step[];
    };
    const merged = [...(evidence.steps ?? [])];
    for (const s of steps) {
      if (!merged.some((m) => m.name === s.name && m.txHash === s.txHash)) merged.push(s);
    }
    await publishPublicEvidence(API, admin, {
      present: true,
      network: "preprod",
      pool: evidence.pool?.address
        ? { address: evidence.pool.address, txHash: evidence.pool.txHash, block: evidence.pool.block }
        : undefined,
      quote: evidence.quote?.address
        ? { address: evidence.quote.address, txHash: evidence.quote.txHash, block: evidence.quote.block }
        : undefined,
      steps: merged,
      mpc: false,
    });
  }

  const failed = steps.filter((s) => !s.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, steps }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
