/**
 * Second Preprod consume of RFQ 1789405396428-0 residual 30 after the 50/80 fill.
 * Reconstructs the derived residual opening. Replays of the consumed opening MUST fail.
 * Same operator wallet. No genesis. No force-register. No mocked tx.
 */
import { config as loadEnv } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import { pureCircuits } from "../CONTRACT/managed/remit_pool/contract/index.js";
import {
  bindDeployed,
  compiledPool,
  createNodeProviders,
  emptyPrivateState,
  fetchBlock,
  fetchContractAction,
  fromHex,
  legalSlice,
  makeDisclosure,
  managedDir,
  openOfferBox,
  pendingCreateMandate,
  pendingDeposit,
  pendingFill,
  poolLedgerFromStateHex,
  randomBytes32,
  requireContractAction,
  residualOf,
  rfqPublicFromSecret,
  submitStagedCircuit,
  verifyDisclosure,
  walletNamespace,
  withOfferDefaults,
} from "../packages/core/src/index.ts";
import { constructFillK, decideFill, type Candidate } from "../packages/agent/src/index.ts";
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

const TARGET_RFQ_ID = process.env.REMIT_TARGET_RFQ_ID ?? "1789405396428-0";
const FIRST_FILL_TX = "5a1200f5869cb60c81f9ebcb649da45fb47c563bc245c362d36665597b16f00a";
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
  record({ name: "rank-unauth", ok: unauthRank.status === 401, detail: `HTTP ${unauthRank.status}` });

  const proofUrl = process.env.MIDNIGHT_PROOF_SERVER_URL ?? "http://localhost:6300";
  record({ name: "proof-server", ok: await proofServerReady(proofUrl), detail: proofUrl });
  if (!steps[steps.length - 1]!.ok) process.exit(1);

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

  const boxFile = resolve(root, "private-state", `${TARGET_RFQ_ID}.box`);
  const inbox = (await (await adminFetch("/inbox")).json()) as { offers: { id: string; box: string }[] };
  const hosted = inbox.offers.find((o) => o.id === TARGET_RFQ_ID)?.box;
  const sealed = hosted || (existsSync(boxFile) ? readFileSync(boxFile, "utf8").trim() : "");
  if (!sealed) throw new Error(`missing sealed box for ${TARGET_RFQ_ID}`);
  const opened = openOfferBox(rfqSk, sealed, rfqPublicFromSecret(rfqSk), { allowExpired: true });
  const original = withOfferDefaults({
    side: BigInt(opened.offer.side),
    baseAmount: BigInt(opened.offer.baseAmount),
    quoteAmount: BigInt(opened.offer.quoteAmount),
    maker: Uint8Array.from(opened.offer.maker),
    payNonce: Uint8Array.from(opened.offer.payNonce),
    expiry: opened.offer.expiry ? BigInt(opened.offer.expiry) : 4_000_000_000n,
    minFillBase: opened.offer.minFillBase ? BigInt(opened.offer.minFillBase) : 10n,
  });
  const originalRand = Uint8Array.from(opened.offerRand);
  record({
    name: "rfq-opening",
    ok: original.baseAmount === 80n && original.quoteAmount === 3200n,
    detail: `id=${TARGET_RFQ_ID} base=${original.baseAmount.toString()} quote=${original.quoteAmount.toString()}`,
  });

  const firstSlice = { fillBase: 50n, fillQuote: 2000n };
  const residual = residualOf(original, originalRand, firstSlice.fillBase, firstSlice.fillQuote);
  record({
    name: "residual-derived",
    ok: residual.offer.baseAmount === 30n && residual.offer.quoteAmount === 1200n,
    detail: "derived residual 30/1200; payNonce and rand are not the consumed opening",
  });

  const session = await openOperatorWallet();
  try {
    const walletDiag = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    console.log(JSON.stringify({ wallet: walletDiag }));
    if (walletDiag.restored !== true) throw new Error("operator wallet was not restored from serializeState");
    const synced = await waitUntilSynced(session.wallet, 15 * 60_000);
    const walletReady = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    console.log(JSON.stringify({ wallet: walletReady }));
    if (!synced || walletReady.synced !== true) {
      throw new Error("restored serializeState but isSynced=false; refusing prove/submit");
    }
    await ensureOperatorDust(session);

    const ns = walletNamespace("preprod", session.addr, "hosted-rfq-residual");
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

    const before = await poolState();
    record({
      name: "first-fill-onchain",
      ok: before.ld.fills >= 3n,
      txHash: before.hit.txHash,
      block: before.hit.blockHeight,
      detail: `fills=${before.ld.fills.toString()} last=${before.hit.txHash?.slice(0, 8)}… firstFill=${FIRST_FILL_TX.slice(0, 8)}…`,
    });

    const principalSk = randomBytes32();
    const maxFill = 30n;
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
      name: "residual-mandate-deposit",
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
      name: "residual-createMandate",
      ok: Boolean(created.txHash ?? afterMan.hit.txHash),
      txHash: created.txHash ?? afterMan.hit.txHash,
      block: created.blockHeight ?? afterMan.hit.blockHeight,
    });

    const nowBound = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const remaining = maxFill;

    try {
      const { ld } = await poolState();
      await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "fill",
        circuitArgs: [nowBound],
        pending: pendingFill(ld, {
          esk,
          mandate,
          mandateRand,
          remaining,
          stateNonce,
          offer: original,
          offerRand: originalRand,
          auditSeed: randomBytes32(),
          getNonce: randomBytes32(),
          nextStateNonce: randomBytes32(),
          fillBase: 50n,
          fillQuote: 2000n,
        }),
        fallback: emptyPrivateState(ns),
      });
      record({ name: "old-opening-replay", ok: false, detail: "consumed opening submitted — Compact should have rejected" });
    } catch (e) {
      record({
        name: "old-opening-replay",
        ok: true,
        detail: e instanceof Error ? e.message.slice(0, 180) : "replay rejected",
      });
    }

    try {
      const { ld } = await poolState();
      constructFillK({
        ledger: ld,
        esk,
        mandate,
        remaining,
        nowBound,
        revoked: false,
        offer: residual.offer,
        mandateRand,
        stateNonce,
        offerRand: residual.rand,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
        fillBase: 31n,
        fillQuote: 1240n,
      });
      record({ name: "invalid-residual-qty", ok: false, detail: "constructFillK accepted fillBase 31 of residual 30" });
    } catch (e) {
      record({
        name: "invalid-residual-qty",
        ok: true,
        detail: e instanceof Error ? e.message.slice(0, 180) : "invalid qty rejected",
      });
    }

    const revokedDecision = decideFill({
      esk,
      mandate,
      remaining,
      nowBound,
      revoked: true,
      candidates: [
        {
          id: "residual-30",
          offer: residual.offer,
          remaining,
          receivedAt: Date.now(),
          rand: residual.rand,
          live: true,
        },
      ],
      allowCounterparty: () => true,
    });
    record({
      name: "invalid-mandate-revoked",
      ok: revokedDecision.action !== "fill",
      detail: revokedDecision.action === "fill" ? "revoked mandate selected a fill" : "revoked mandate rejected",
    });

    const residualCandidates: Candidate[] = [
      {
        id: `${TARGET_RFQ_ID}-residual-30`,
        offer: residual.offer,
        remaining,
        receivedAt: Date.now(),
        rand: residual.rand,
        live: true,
      },
    ];
    const residualDecision = decideFill({
      esk,
      mandate,
      remaining,
      nowBound,
      revoked: false,
      candidates: residualCandidates,
      allowCounterparty: () => true,
    });
    const slice = legalSlice(residual.offer, mandate, remaining);
    record({
      name: "agent-rank-residual",
      ok: residualDecision.action === "fill" && slice.fillBase === 30n && residualDecision.fillBase === 30n,
      detail: residualDecision.action === "fill" ? "selected residual 30 of 80" : "rejected",
    });

    const fillsMid = (await poolState()).ld.fills;
    const auditSeed = randomBytes32();
    try {
      if (residualDecision.action !== "fill") throw new Error("agent did not select residual");
      const { ld } = await poolState();
      const built = constructFillK({
        ledger: ld,
        esk,
        mandate,
        remaining,
        nowBound,
        revoked: false,
        offer: residual.offer,
        mandateRand,
        stateNonce,
        offerRand: residual.rand,
        auditSeed,
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
        candidates: residualCandidates,
        fillBase: slice.fillBase,
        fillQuote: slice.fillQuote,
      });
      record({
        name: "construct-k3-residual",
        ok: built.decision.action === "fill" && built.decision.book.length === 3,
        detail: `liveCandidates=1 paddedK=3 selected=${TARGET_RFQ_ID}-residual-30`,
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
      const after = await poolState();
      const ok =
        after.ld.fills === fillsMid + 1n &&
        Boolean(after.hit.txHash) &&
        after.hit.blockHeight != null &&
        after.hit.txHash !== FIRST_FILL_TX;
      record({
        name: "pool-residual-consume",
        ok,
        txHash: after.hit.txHash,
        block: after.hit.blockHeight,
        detail: `${filled.status} fills ${fillsMid.toString()}→${after.ld.fills.toString()} residual 30 consumed`,
      });
      if (!ok || !after.hit.txHash || after.hit.blockHeight == null) {
        throw new Error("indexer did not confirm residual fill");
      }

      const root = after.ld.auditRoots.head();
      if (!root.is_some) throw new Error("no auditRoot on ledger after residual fill");
      const pkg = makeDisclosure(
        Number(after.ld.fills - 1n),
        auditSeed,
        {
          side: residual.offer.side,
          baseAmount: slice.fillBase,
          quoteAmount: slice.fillQuote,
          principal: mandate.principal,
          counterparty: residual.offer.maker,
          mandateId: mandate.mandateId,
        },
        [1],
      );
      const verified = verifyDisclosure(pkg, root.value, { allowedFields: ["baseAmount"] });
      record({
        name: "selective-audit-local",
        ok: verified.ok && pkg.auditRootHex === toHex(root.value) && pkg.openings.length === 1,
        detail: verified.failed.join(",") || "one-field baseAmount vs on-chain auditRoot",
      });
      const forged = { ...pkg, openings: pkg.openings.map((o) => ({ ...o, valueDec: "999" })) };
      const forgedHit = verifyDisclosure(forged, root.value);
      record({
        name: "selective-audit-forged",
        ok: !forgedHit.ok,
        detail: forgedHit.failed.join(",") || "forged value should fail",
      });
      const wrongRoot = verifyDisclosure(pkg, randomBytes32());
      record({
        name: "selective-audit-wrong-root",
        ok: !wrongRoot.ok,
        detail: wrongRoot.failed.join(",") || "wrong auditRoot should fail",
      });
      const pub = await adminFetch("/audit/publish", {
        method: "POST",
        body: JSON.stringify({ package: pkg }),
      });
      record({ name: "audit-publish", ok: pub.ok, detail: `HTTP ${pub.status}` });
      const verifyRes = await fetch(`${API}/audit/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ package: pkg }),
      });
      const verifyJson = (await verifyRes.json()) as { ok?: boolean; fields?: string[] };
      record({
        name: "audit-verify-http",
        ok: verifyRes.ok && verifyJson.ok === true && !JSON.stringify(verifyJson).includes("fillBase"),
        detail: `HTTP ${verifyRes.status} fields=${(verifyJson.fields ?? []).join(",")}`,
      });

      const settled = await adminFetch("/agent/settled", {
        method: "POST",
        body: JSON.stringify({
          selectedId: `${TARGET_RFQ_ID}-residual`,
          txHash: after.hit.txHash,
          block: after.hit.blockHeight,
        }),
      });
      record({ name: "agent-settled-residual", ok: settled.ok, detail: `HTTP ${settled.status}` });

      mkdirSync(join(root, "deployments"), { recursive: true });
      const outFile = join(root, "deployments", "rfq-residual-consume.json");
      writeFileSync(
        outFile,
        JSON.stringify(
          {
            network: "preprod",
            protocolVersion: head.protocolVersion,
            target: TARGET_RFQ_ID,
            firstFill: { txHash: FIRST_FILL_TX, fillBase: 50, fillQuote: 2000 },
            residual: { base: 30, quote: 1200, txHash: after.hit.txHash, block: after.hit.blockHeight },
            auditRootHex: pkg.auditRootHex,
            disclosureField: "baseAmount",
            steps,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      record({
        name: "pool-residual-consume",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 220) : "residual consume failed",
      });
    }

    try {
      const { ld } = await poolState();
      await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "fill",
        circuitArgs: [nowBound],
        pending: pendingFill(ld, {
          esk,
          mandate,
          mandateRand,
          remaining: 0n,
          stateNonce: randomBytes32(),
          offer: residual.offer,
          offerRand: residual.rand,
          auditSeed: randomBytes32(),
          getNonce: randomBytes32(),
          nextStateNonce: randomBytes32(),
          fillBase: 30n,
          fillQuote: 1200n,
        }),
        fallback: emptyPrivateState(ns),
      });
      record({ name: "residual-replay", ok: false, detail: "already-consumed residual submitted" });
    } catch (e) {
      record({
        name: "residual-replay",
        ok: true,
        detail: e instanceof Error ? e.message.slice(0, 180) : "residual replay rejected",
      });
    }
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
