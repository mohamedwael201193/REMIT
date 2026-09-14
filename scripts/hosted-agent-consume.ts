/**
 * Consume one hosted RFQ (default 1789405396428-0) with operator Node + proof-server 8.1.0.
 * Render stays rank-only (httpSubmit false). This process posts the mandate opening,
 * calls authenticated /agent/rank, proves Compact fill, submits, then /agent/settled.
 * Does not reuse historical A/B/C openings. Does not print openings or secrets.
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pureCircuits } from "../CONTRACT/managed/remit_pool/contract/index.js";
import {
  bindDeployed,
  compiledPool,
  createNodeProviders,
  emptyPrivateState,
  fetchBlock,
  fetchContractAction,
  fromHex,
  makeMandateBox,
  managedDir,
  pendingCreateMandate,
  pendingDeposit,
  poolLedgerFromStateHex,
  randomBytes32,
  requireContractAction,
  rfqPublicFromSecret,
  submitStagedCircuit,
  walletNamespace,
  type InboxItem,
} from "../packages/core/src/index.ts";
import {
  constructRankedFill,
  mandateOpeningFromInbox,
  planFillFromInbox,
} from "../packages/agent/src/index.ts";
import {
  closeOperatorWallet,
  ensureOperatorDust,
  openOperatorWallet,
  waitForOperatorWalletUnlocked,
  waitForPreprodDeployFile,
  snapshotOperatorDiagnostics,
  waitUntilSynced,
} from "./lib/operator-wallet.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.env.REMIT_DEPLOY_FILE ??= "deployments/preprod-mbbe.json";

const TARGET_RFQ_ID = process.env.REMIT_TARGET_RFQ_ID ?? "1789405396428-0";
const API = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");

type Step = { name: string; ok: boolean; txHash?: string; block?: number; detail?: string };

function envSk(name: string): Uint8Array {
  const h = process.env[name];
  if (h && /^[0-9a-fA-F]{64}$/.test(h)) return fromHex(h);
  throw new Error(`${name} missing`);
}

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const admin = process.env.REMIT_API_ADMIN_TOKEN ?? "";
  if (!admin) throw new Error("REMIT_API_ADMIN_TOKEN missing");
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${admin}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function proofServerReady(url: string): Promise<boolean> {
  try {
    const res = await fetch(new URL("/health", url));
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const steps: Step[] = [];
  const record = (s: Step) => {
    steps.push(s);
    console.log(s.ok ? "ok" : "fail", s.name, s.txHash ?? "", s.block ?? "", s.detail ?? "");
  };

  const unauthRank = await fetch(`${API}/agent/rank`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  record({
    name: "rank-unauth",
    ok: unauthRank.status === 401,
    detail: `HTTP ${unauthRank.status}`,
  });

  const status0 = (await (await fetch(`${API}/agent/status`)).json()) as {
    httpSubmit?: boolean;
    inbox?: { offers: number; mandates: number };
    last?: { selectedId?: string } | null;
  };
  record({
    name: "status-before",
    ok: status0.httpSubmit === false,
    detail: `offers=${status0.inbox?.offers ?? 0} mandates=${status0.inbox?.mandates ?? 0} httpSubmit=${status0.httpSubmit}`,
  });

  async function loadInbox(): Promise<{ offers: { id: string; box: string }[]; mandates: { id: string; box: string }[] }> {
    const inboxRes = await adminFetch("/inbox");
    if (!inboxRes.ok) throw new Error(`GET /inbox ${inboxRes.status}`);
    return (await inboxRes.json()) as {
      offers: { id: string; box: string }[];
      mandates: { id: string; box: string }[];
    };
  }

  let inbox = await loadInbox();
  let target = inbox.offers.find((o) => o.id === TARGET_RFQ_ID);
  if (!target) {
    const boxFile = resolve(root, "private-state", `${TARGET_RFQ_ID}.box`);
    const sealed =
      (process.env.REMIT_TARGET_RFQ_BOX ?? "").trim() ||
      (existsSync(boxFile) ? readFileSync(boxFile, "utf8").trim() : "");
    if (!sealed) throw new Error(`hosted inbox missing ${TARGET_RFQ_ID} and no local sealed box to restore`);
    const restored = await adminFetch("/inbox/restore", {
      method: "POST",
      body: JSON.stringify({ offers: [{ id: TARGET_RFQ_ID, box: sealed }] }),
    });
    if (!restored.ok) throw new Error(`POST /inbox/restore ${restored.status}`);
    inbox = await loadInbox();
    target = inbox.offers.find((o) => o.id === TARGET_RFQ_ID);
  }
  if (!target) throw new Error(`hosted inbox missing ${TARGET_RFQ_ID}`);
  record({
    name: "inbox-rfq",
    ok: true,
    detail: `id=${TARGET_RFQ_ID} offers=${inbox.offers.length} (no historical A/B/C ids)`,
  });

  const proofUrl = process.env.MIDNIGHT_PROOF_SERVER_URL ?? "http://localhost:6300";
  const proofOk = await proofServerReady(proofUrl);
  record({ name: "proof-server", ok: proofOk, detail: proofUrl });
  if (!proofOk) {
    console.log(JSON.stringify({ ok: false, reason: "proof-server-8.1.0-unreachable", steps }, null, 2));
    process.exit(1);
  }

  const deployed = await waitForPreprodDeployFile();
  await waitForOperatorWalletUnlocked();
  const indexer = process.env.MIDNIGHT_INDEXER_URL!;
  const head = await fetchBlock(indexer);
  console.log("indexer head", head.height, "protocol", head.protocolVersion, "pool", deployed.pool.address);

  const password = process.env.REMIT_AGENT_PRIVATE_STATE_PASSWORD;
  if (!password || password.length < 16) throw new Error("private-state password missing or too short");
  const rfqSk = process.env.REMIT_AGENT_RFQ_BOX_SECRET_HEX ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(rfqSk)) throw new Error("RFQ box secret missing");
  const esk = envSk("REMIT_EXECUTOR_SECRET_HEX");

  const session = await openOperatorWallet();
  try {
    const walletDiag = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    console.log(JSON.stringify({ wallet: walletDiag }));
    if (walletDiag.restored !== true) {
      throw new Error("operator wallet was not restored from serializeState");
    }
    const synced = await waitUntilSynced(session.wallet, 15 * 60_000);
    const walletReady = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    console.log(JSON.stringify({ wallet: walletReady }));
    if (!synced || walletReady.synced !== true) {
      throw new Error("restored serializeState but isSynced=false; refusing prove/submit and refusing genesis");
    }
    await ensureOperatorDust(session);
    const ns = walletNamespace("preprod", session.addr, "hosted-rfq-consume");
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

    const fillsBefore = (await poolState()).ld.fills;
    const principalSk = randomBytes32();
    const maxFill = 50n;
    const nightNote = {
      asset: 0n,
      amount: maxFill,
      owner: pureCircuits.ownerKey(principalSk),
      nonce: randomBytes32(),
    };
    const deposited = await submitStagedCircuit(poolProviders, {
      contractAddress: deployed.pool.address,
      compiledContract: compiledPool(),
      privateStateId: "remit-pool",
      circuitId: "deposit",
      circuitArgs: [0n, maxFill],
      pending: pendingDeposit(principalSk, nightNote.nonce),
      fallback: emptyPrivateState(ns),
    });
    const afterDep = await poolState();
    record({
      name: "mandate-deposit",
      ok: Boolean(deposited.txHash ?? afterDep.hit.txHash),
      txHash: deposited.txHash ?? afterDep.hit.txHash,
      block: deposited.blockHeight ?? afterDep.hit.blockHeight,
    });

    const mandate = {
      principal: nightNote.owner,
      executor: pureCircuits.executorKey(esk),
      side: 0n,
      maxFillBase: maxFill,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const mandateRand = randomBytes32();
    const stateNonce = randomBytes32();
    const created = await submitStagedCircuit(poolProviders, {
      contractAddress: deployed.pool.address,
      compiledContract: compiledPool(),
      privateStateId: "remit-pool",
      circuitId: "createMandate",
      circuitArgs: [],
      pending: pendingCreateMandate(afterDep.ld, principalSk, nightNote, mandate, mandateRand, stateNonce),
      fallback: emptyPrivateState(ns),
    });
    const afterMan = await poolState();
    record({
      name: "createMandate",
      ok: Boolean(created.txHash ?? afterMan.hit.txHash),
      txHash: created.txHash ?? afterMan.hit.txHash,
      block: created.blockHeight ?? afterMan.hit.blockHeight,
    });

    const { boxed: mandateBox } = makeMandateBox(
      rfqPublicFromSecret(rfqSk),
      Array.from(mandate.mandateId),
      7 * 24 * 60 * 60_000,
      {
        mandate: {
          principal: Array.from(mandate.principal),
          executor: Array.from(mandate.executor),
          side: mandate.side.toString(),
          maxFillBase: mandate.maxFillBase.toString(),
          limitNum: mandate.limitNum.toString(),
          limitDen: mandate.limitDen.toString(),
          cpRoot: mandate.cpRoot.toString(),
          expiry: mandate.expiry.toString(),
          mandateId: Array.from(mandate.mandateId),
        },
        mandateRand: Array.from(mandateRand),
        remaining: maxFill.toString(),
        stateNonce: Array.from(stateNonce),
      },
    );
    const mandatePost = await fetch(`${API}/mandate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ box: mandateBox }),
    });
    record({ name: "mandate-inbox", ok: mandatePost.ok || mandatePost.status === 409, detail: `HTTP ${mandatePost.status}` });

    const rankRes = await adminFetch("/agent/rank", { method: "POST", body: "{}" });
    const rankJson = (await rankRes.json()) as {
      selectedId?: string | null;
      constructed?: boolean;
      submitted?: boolean;
      eligibleCount?: number;
      candidateCount?: number;
    };
    const rankText = JSON.stringify(rankJson);
    record({
      name: "agent-rank",
      ok:
        rankRes.ok &&
        rankJson.selectedId === TARGET_RFQ_ID &&
        rankJson.submitted !== true &&
        !rankText.includes("fillBase") &&
        !rankText.includes("chosenIndex"),
      detail: `selectedId=${rankJson.selectedId ?? "null"} constructed=${rankJson.constructed} submitted=${rankJson.submitted} eligible=${rankJson.eligibleCount} candidates=${rankJson.candidateCount}`,
    });

    const offerItems: InboxItem[] = [{ id: target.id, boxed: target.box, receivedAt: Date.now() }];
    const inboxAfter = (await (await adminFetch("/inbox")).json()) as {
      mandates: { id: string; box: string }[];
    };
    const mandateItems: InboxItem[] = inboxAfter.mandates.map((m) => ({
      id: m.id,
      boxed: m.box,
      receivedAt: Date.now(),
    }));
    const opening = mandateOpeningFromInbox(rfqSk, mandateItems);
    if (!opening) throw new Error("mandate opening missing after POST /mandate");
    const nowBound = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const planned = planFillFromInbox({
      rfqSk,
      offers: offerItems,
      esk,
      mandate: opening.mandate,
      remaining: opening.remaining,
      nowBound,
      revoked: false,
    });
    if (planned.receipt.selectedId !== TARGET_RFQ_ID) {
      throw new Error(`rank selected ${planned.receipt.selectedId}, not ${TARGET_RFQ_ID}`);
    }
    const { ld } = await poolState();
    const built = constructRankedFill({
      ledger: ld,
      planned,
      esk,
      mandate: opening.mandate,
      remaining: opening.remaining,
      nowBound,
      mandateRand: opening.mandateRand,
      stateNonce: opening.stateNonce,
    });
    record({
      name: "construct-k3",
      ok: built.chosenMatches && planned.decision.action === "fill",
      detail: `liveCandidates=1 paddedK=3 selected=${TARGET_RFQ_ID}`,
    });

    const filled = await submitStagedCircuit(poolProviders, {
      contractAddress: deployed.pool.address,
      compiledContract: compiledPool(),
      privateStateId: "remit-pool",
      circuitId: "fill",
      circuitArgs: [nowBound],
      pending: built.pending,
      fallback: emptyPrivateState(ns),
    });
    const afterFill = await poolState();
    const fillOk = afterFill.ld.fills === fillsBefore + 1n;
    record({
      name: "pool-fill",
      ok: fillOk,
      txHash: afterFill.hit.txHash,
      block: afterFill.hit.blockHeight,
      detail: `${filled.status} fills ${fillsBefore.toString()}→${afterFill.ld.fills.toString()}`,
    });
    if (!fillOk || !afterFill.hit.txHash || afterFill.hit.blockHeight == null) {
      throw new Error("indexer did not confirm a new fill");
    }

    const settled = await adminFetch("/agent/settled", {
      method: "POST",
      body: JSON.stringify({
        selectedId: TARGET_RFQ_ID,
        txHash: afterFill.hit.txHash,
        block: afterFill.hit.blockHeight,
      }),
    });
    record({ name: "agent-settled", ok: settled.ok, detail: `HTTP ${settled.status}` });

    const status1 = (await (await fetch(`${API}/agent/status`)).json()) as {
      httpSubmit?: boolean;
      last?: { selectedId?: string; txHash?: string; submitted?: boolean; block?: number } | null;
    };
    const last = status1.last;
    record({
      name: "status-after",
      ok:
        status1.httpSubmit === false &&
        last?.selectedId === TARGET_RFQ_ID &&
        last.txHash === afterFill.hit.txHash &&
        last.submitted === true,
      detail: `selectedId=${last?.selectedId} submitted=${last?.submitted} httpSubmit=${status1.httpSubmit}`,
    });
  } finally {
    await closeOperatorWallet(session);
  }

  const failed = steps.filter((s) => !s.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, target: TARGET_RFQ_ID, steps }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
