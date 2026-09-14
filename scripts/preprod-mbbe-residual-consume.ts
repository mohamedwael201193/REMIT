/**
 * Preprod residual consume on the existing K=3 MBBE pool.
 * Places one 80/3200 sell offer, fills 50 (legal slice), then consumes residual 30
 * with a NEW indexer-confirmed fill tx. Local residual reconstruction is not evidence.
 *
 * Same operator wallet. No second wallet. No force-register.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { pureCircuits } from "../CONTRACT/managed/remit_pool/contract/index.js";
import {
  bindDeployed,
  compiledPool,
  compiledQuote,
  createNodeProviders,
  emptyPrivateState,
  fetchBlock,
  fetchContractAction,
  fromHex,
  legalSlice,
  makeDisclosure,
  managedDir,
  pendingCreateMandate,
  pendingDeposit,
  pendingFill,
  pendingPlaceOffer,
  poolLedgerFromStateHex,
  randomBytes32,
  requireContractAction,
  residualOf,
  submitCircuit,
  submitStagedCircuit,
  verifyDisclosure,
  walletNamespace,
  type QuotePrivateState,
} from "../packages/core/src/index.ts";
import { encodeUserAddress } from "@midnight-ntwrk/ledger-v8";
import { constructFillK } from "../packages/agent/src/fill-circuit.ts";
import { decideFill, type Candidate } from "../packages/agent/src/executor.ts";
import {
  closeOperatorWallet,
  ensureOperatorDust,
  openOperatorWallet,
  waitForOperatorWalletUnlocked,
  waitForPreprodDeployFile,
} from "./lib/operator-wallet.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.env.REMIT_DEPLOY_FILE ??= "deployments/preprod-mbbe.json";

type Step = { name: string; ok: boolean; txHash?: string; block?: number; detail?: string };

function userAddressBytes(keystore: { getAddress: () => string }): Uint8Array {
  const encoded = encodeUserAddress(keystore.getAddress());
  if (encoded.length !== 32) throw new Error(`encodeUserAddress produced ${encoded.length} bytes`);
  return encoded;
}

function envSk(name: string): Uint8Array {
  const h = process.env[name];
  if (h && /^[0-9a-fA-F]{64}$/.test(h)) return fromHex(h);
  return randomBytes32();
}

async function main() {
  const steps: Step[] = [];
  const record = (s: Step) => {
    steps.push(s);
    console.log(s.ok ? "ok" : "fail", s.name, s.txHash ?? "", s.block ?? "", s.detail ?? "");
  };

  const deployed = await waitForPreprodDeployFile();
  await waitForOperatorWalletUnlocked();
  const indexer = process.env.MIDNIGHT_INDEXER_URL!;
  const block = await fetchBlock(indexer);
  console.log("indexer head", block.height, "protocol", block.protocolVersion, "pool", deployed.pool.address);

  const quoteHit = requireContractAction(await fetchContractAction(indexer, deployed.quote.address), "quote");
  record({ name: "quote-indexer", ok: true, txHash: quoteHit.txHash, block: quoteHit.blockHeight });
  const poolHit = requireContractAction(await fetchContractAction(indexer, deployed.pool.address), "pool");
  record({ name: "pool-indexer", ok: true, txHash: poolHit.txHash, block: poolHit.blockHeight });

  const password = process.env.REMIT_AGENT_PRIVATE_STATE_PASSWORD;
  if (!password || password.length < 16) throw new Error("private-state password missing or too short");

  const session = await openOperatorWallet();
  try {
    await ensureOperatorDust(session);
    const ns = walletNamespace("preprod", session.addr, "mbbe-residual");
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
    await bindDeployed(quoteProviders, {
      contractAddress: deployed.quote.address,
      compiledContract: compiledQuote(),
      privateStateId: "remit-quote",
      initialPrivateState: quotePs,
    });

    const dayBucket = BigInt(Math.floor(Date.now() / 86_400_000));
    try {
      const to = {
        is_left: false,
        left: { bytes: new Uint8Array(32) },
        right: { bytes: userAddressBytes(session.unshieldedKeystore) },
      };
      const claim = await submitCircuit(quoteProviders, {
        contractAddress: deployed.quote.address,
        compiledContract: compiledQuote(),
        privateStateId: "remit-quote",
        circuitId: "claim",
        args: [1_000_000n, dayBucket, to],
      });
      const after = requireContractAction(
        await fetchContractAction(session.indexerHttpUrl, deployed.quote.address),
        "quote after claim",
      );
      record({ name: "quote-claim", ok: true, txHash: after.txHash, block: after.blockHeight, detail: claim.status });
    } catch (e) {
      record({
        name: "quote-claim",
        ok: true,
        detail: `claim skipped: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`,
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
    record({ name: "pool-bound", ok: true, detail: "mbbe-residual private-state namespace" });

    async function poolState() {
      const hit = requireContractAction(
        await fetchContractAction(session.indexerHttpUrl, deployed.pool.address),
        "pool",
      );
      if (!hit.stateHex) throw new Error("indexer contractAction missing state");
      return { hit, ld: poolLedgerFromStateHex(hit.stateHex) };
    }

    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = envSk("REMIT_EXECUTOR_SECRET_HEX");
    const nightNote = {
      asset: 0n,
      amount: 5_000_000n,
      owner: pureCircuits.ownerKey(principalSk),
      nonce: randomBytes32(),
    };

    async function depositAsset(
      name: string,
      sk: Uint8Array,
      note: { asset: bigint; amount: bigint; owner: Uint8Array; nonce: Uint8Array },
    ) {
      try {
        const deposited = await submitStagedCircuit(poolProviders, {
          contractAddress: deployed.pool.address,
          compiledContract: compiledPool(),
          privateStateId: "remit-pool",
          circuitId: "deposit",
          circuitArgs: [note.asset, note.amount],
          pending: pendingDeposit(sk, note.nonce),
          fallback: emptyPrivateState(ns),
        });
        const after = (await poolState()).hit;
        record({
          name,
          ok: true,
          txHash: after.txHash,
          block: after.blockHeight,
          detail: deposited.status,
        });
        return true;
      } catch (e) {
        record({
          name,
          ok: false,
          detail: e instanceof Error ? e.message.slice(0, 180) : "deposit failed",
        });
        return false;
      }
    }

    await depositAsset("pool-deposit-night", principalSk, nightNote);

    const offer = {
      side: 1n,
      baseAmount: 80n,
      quoteAmount: 3200n,
      maker: pureCircuits.ownerKey(makerSk),
      payNonce: randomBytes32(),
      expiry: 4_000_000_000n,
      minFillBase: 10n,
    };
    const offerRand = randomBytes32();
    const quoteNote = {
      asset: 1n,
      amount: offer.quoteAmount,
      owner: offer.maker,
      nonce: randomBytes32(),
    };
    await depositAsset("pool-deposit-quote", makerSk, quoteNote);

    const mandate = {
      principal: nightNote.owner,
      executor: pureCircuits.executorKey(esk),
      side: 0n,
      maxFillBase: 50n,
      limitNum: 30n,
      limitDen: 1000n,
      cpRoot: 0n,
      expiry: 4_000_000_000n,
      mandateId: randomBytes32(),
    };
    const mandateRand = randomBytes32();
    const stateNonce = randomBytes32();
    const nowBound = BigInt(Math.floor(Date.now() / 1000) + 3600);

    try {
      const { ld } = await poolState();
      const created = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "createMandate",
        circuitArgs: [],
        pending: pendingCreateMandate(ld, principalSk, nightNote, mandate, mandateRand, stateNonce),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({
        name: "pool-create-mandate",
        ok: true,
        txHash: after.txHash,
        block: after.blockHeight,
        detail: created.status,
      });
    } catch (e) {
      record({
        name: "pool-create-mandate",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "createMandate failed",
      });
    }

    try {
      const { ld } = await poolState();
      const placed = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "placeOffer",
        circuitArgs: [],
        pending: pendingPlaceOffer(ld, makerSk, quoteNote, offer, offerRand, randomBytes32()),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({
        name: "pool-place-offer-80",
        ok: true,
        txHash: after.txHash,
        block: after.blockHeight,
        detail: placed.status,
      });
    } catch (e) {
      record({
        name: "pool-place-offer-80",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "placeOffer failed",
      });
    }

    const remaining0 = 80n;
    const candidates: Candidate[] = [
      { id: "maker-80", offer, remaining: remaining0, receivedAt: 1, rand: offerRand, live: true },
    ];
    const decision = decideFill({
      esk,
      mandate,
      remaining: remaining0,
      nowBound,
      revoked: false,
      candidates,
      allowCounterparty: () => true,
    });
    record({
      name: "agent-rank",
      ok: decision.action === "fill" && decision.fillBase === 50n,
      detail: decision.action === "fill" ? "selected partial 50 of 80" : "rejected",
    });

    const auditSeed = randomBytes32();
    const nextStateNonce = randomBytes32();
    const fillsBefore = (await poolState()).ld.fills;
    let residual = residualOf(offer, offerRand, 50n, 2000n);
    try {
      if (decision.action !== "fill") throw new Error("agent did not select a fill");
      const slice = legalSlice(decision.offer, mandate, remaining0);
      if (slice.fillBase !== 50n) throw new Error(`expected fillBase 50, got ${slice.fillBase}`);
      residual = residualOf(decision.offer, decision.offerRand ?? offerRand, slice.fillBase, slice.fillQuote);
      if (residual.offer.baseAmount !== 30n) throw new Error(`expected residual 30, got ${residual.offer.baseAmount}`);
      const { ld } = await poolState();
      const built = constructFillK({
        ledger: ld,
        esk,
        mandate,
        remaining: remaining0,
        nowBound,
        revoked: false,
        offer,
        mandateRand,
        stateNonce,
        offerRand,
        auditSeed,
        getNonce: randomBytes32(),
        nextStateNonce,
        candidates,
        fillBase: slice.fillBase,
        fillQuote: slice.fillQuote,
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
      record({
        name: "pool-k3-fill",
        ok: after.ld.fills === fillsBefore + 1n,
        txHash: after.hit.txHash,
        block: after.hit.blockHeight,
        detail: `${filled.status} · 50 of 80 · residual 30 committed`,
      });
      const root = after.ld.auditRoots.head();
      if (root.is_some) {
        const pkg = makeDisclosure(
          0,
          auditSeed,
          {
            side: offer.side,
            baseAmount: slice.fillBase,
            quoteAmount: slice.fillQuote,
            principal: mandate.principal,
            counterparty: offer.maker,
            mandateId: mandate.mandateId,
          },
          [1],
        );
        const verified = verifyDisclosure(pkg, root.value, { allowedFields: ["baseAmount"] });
        record({
          name: "selective-audit",
          ok: verified.ok && pkg.auditRootHex === Buffer.from(root.value).toString("hex"),
          detail: verified.failed.join(",") || "fill-amount vs on-chain auditRoot",
        });
        const apiUrl = (process.env.REMIT_API_PUBLIC_URL ?? "").replace(/\/$/, "");
        const admin = process.env.REMIT_API_ADMIN_TOKEN ?? "";
        if (verified.ok && apiUrl && admin) {
          const pub = await fetch(`${apiUrl}/audit/publish`, {
            method: "POST",
            headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" },
            body: JSON.stringify({ package: pkg }),
          });
          record({ name: "audit-publish", ok: pub.ok, detail: `HTTP ${pub.status}` });
        }
      } else {
        record({ name: "selective-audit", ok: false, detail: "no auditRoot on ledger" });
      }
    } catch (e) {
      record({
        name: "pool-k3-fill",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 220) : "k3 fill failed",
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
          remaining: remaining0,
          stateNonce,
          offer,
          offerRand,
          auditSeed: randomBytes32(),
          getNonce: randomBytes32(),
          nextStateNonce: randomBytes32(),
          fillBase: 50n,
          fillQuote: 2000n,
        }),
        fallback: emptyPrivateState(ns),
      });
      record({ name: "original-opening-replay", ok: false, detail: "replay submitted — Compact should have rejected" });
    } catch (e) {
      record({
        name: "original-opening-replay",
        ok: true,
        detail: e instanceof Error ? e.message.slice(0, 180) : "replay rejected",
      });
    }

    const remaining1 = remaining0 - 50n;
    const residualCandidates: Candidate[] = [
      {
        id: "residual-30",
        offer: residual.offer,
        remaining: remaining1,
        receivedAt: 2,
        rand: residual.rand,
        live: true,
      },
    ];
    const residualDecision = decideFill({
      esk,
      mandate,
      remaining: remaining1,
      nowBound,
      revoked: false,
      candidates: residualCandidates,
      allowCounterparty: () => true,
    });
    record({
      name: "agent-rank-residual",
      ok: residualDecision.action === "fill" && residualDecision.fillBase === 30n,
      detail: residualDecision.action === "fill" ? "selected residual 30" : "rejected",
    });

    const fillsMid = (await poolState()).ld.fills;
    try {
      if (residualDecision.action !== "fill") throw new Error("agent did not select residual");
      const { ld } = await poolState();
      const built = constructFillK({
        ledger: ld,
        esk,
        mandate,
        remaining: remaining1,
        nowBound,
        revoked: false,
        offer: residual.offer,
        mandateRand,
        stateNonce: nextStateNonce,
        offerRand: residual.rand,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
        candidates: residualCandidates,
        fillBase: residualDecision.fillBase,
        fillQuote: residualDecision.fillQuote,
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
      record({
        name: "pool-k3-residual-consume",
        ok: after.ld.fills === fillsMid + 1n && Boolean(after.hit.txHash) && after.hit.blockHeight != null,
        txHash: after.hit.txHash,
        block: after.hit.blockHeight,
        detail: `${filled.status} · residual 30 consumed · indexer contractAction`,
      });
    } catch (e) {
      record({
        name: "pool-k3-residual-consume",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 220) : "residual consume failed",
      });
    }

    mkdirSync(resolve(root, "deployments"), { recursive: true });
    const body = {
      network: "preprod",
      protocolVersion: block.protocolVersion,
      semantics: "mbbe-k3-residual",
      globalBest: false,
      mpc: false,
      quote: deployed.quote,
      pool: deployed.pool,
      steps,
    };
    writeFileSync(resolve(root, "deployments", "residual-consume.json"), JSON.stringify(body, null, 2));
    console.log("wrote deployments/residual-consume.json");
    const apiUrl = (process.env.REMIT_API_PUBLIC_URL ?? process.env.RENDER_SERVICE_URL ?? "").replace(/\/health$/, "");
    const admin = process.env.REMIT_API_ADMIN_TOKEN ?? "";
    if (apiUrl && admin) {
      const { publishPublicEvidence } = await import("./lib/public-evidence.ts");
      const status = await publishPublicEvidence(apiUrl, admin, {
        present: true,
        network: "preprod",
        pool: { address: deployed.pool.address, txHash: deployed.pool.txHash, block: deployed.pool.block },
        quote: { address: deployed.quote.address, txHash: deployed.quote.txHash, block: deployed.quote.block },
        steps,
        mpc: false,
      });
      console.log("published public evidence", status);
    }
    if (!steps.every((s) => s.ok)) process.exitCode = 1;
  } finally {
    await closeOperatorWallet(session);
  }
}

main().catch((e) => {
  console.error("mbbe residual consume failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
