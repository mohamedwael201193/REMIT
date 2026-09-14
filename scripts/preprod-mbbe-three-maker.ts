/**
 * Preprod 3-maker MBBE fill on the existing K=3 pool.
 * Places three live private offers (distinct maker ownerKeys), then one fill
 * whose witness book contains all three. Compact selects the best eligible
 * candidate; the winning size is a legal slice (partial + residual).
 *
 * Does not replace the v1 pool. Does not create a second wallet or faucet.
 * Success is indexer contractAction, never submitTx resolving.
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
  managedDir,
  pendingCreateMandate,
  pendingDeposit,
  pendingPlaceOffer,
  poolLedgerFromStateHex,
  randomBytes32,
  requireContractAction,
  residualOf,
  submitCircuit,
  submitStagedCircuit,
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
    const ns = walletNamespace("preprod", session.addr, "mbbe-k3");
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
    record({ name: "pool-bound", ok: true, detail: "mbbe-k3 private-state namespace" });

    async function poolState() {
      const hit = requireContractAction(
        await fetchContractAction(session.indexerHttpUrl, deployed.pool.address),
        "pool",
      );
      if (!hit.stateHex) throw new Error("indexer contractAction missing state");
      return { hit, ld: poolLedgerFromStateHex(hit.stateHex) };
    }

    const principalSk = randomBytes32();
    const makerASk = randomBytes32();
    const makerBSk = randomBytes32();
    const makerCSk = randomBytes32();
    const esk = envSk("REMIT_EXECUTOR_SECRET_HEX");
    const nightNote = {
      asset: 0n,
      amount: 5_000_000n,
      owner: pureCircuits.ownerKey(principalSk),
      nonce: randomBytes32(),
    };

    type QNote = { asset: bigint; amount: bigint; owner: Uint8Array; nonce: Uint8Array };
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

    const offerA = {
      side: 1n,
      baseAmount: 60n,
      quoteAmount: 1920n,
      maker: pureCircuits.ownerKey(makerASk),
      payNonce: randomBytes32(),
      expiry: 4_000_000_000n,
      minFillBase: 60n,
    };
    const offerB = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: pureCircuits.ownerKey(makerBSk),
      payNonce: randomBytes32(),
      expiry: 4_000_000_000n,
      minFillBase: 1n,
    };
    const offerC = {
      side: 1n,
      baseAmount: 80n,
      quoteAmount: 3200n,
      maker: pureCircuits.ownerKey(makerCSk),
      payNonce: randomBytes32(),
      expiry: 4_000_000_000n,
      minFillBase: 10n,
    };
    const randA = randomBytes32();
    const randB = randomBytes32();
    const randC = randomBytes32();

    const noteA: QNote = {
      asset: 1n,
      amount: offerA.quoteAmount,
      owner: offerA.maker,
      nonce: randomBytes32(),
    };
    const noteB: QNote = {
      asset: 1n,
      amount: offerB.quoteAmount,
      owner: offerB.maker,
      nonce: randomBytes32(),
    };
    const noteC: QNote = {
      asset: 1n,
      amount: offerC.quoteAmount,
      owner: offerC.maker,
      nonce: randomBytes32(),
    };

    await depositAsset("pool-deposit-quote-a", makerASk, noteA);
    await depositAsset("pool-deposit-quote-b", makerBSk, noteB);
    await depositAsset("pool-deposit-quote-c", makerCSk, noteC);

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

    async function place(name: string, sk: Uint8Array, note: QNote, offer: typeof offerA, rand: Uint8Array) {
      try {
        const { ld } = await poolState();
        const placed = await submitStagedCircuit(poolProviders, {
          contractAddress: deployed.pool.address,
          compiledContract: compiledPool(),
          privateStateId: "remit-pool",
          circuitId: "placeOffer",
          circuitArgs: [],
          pending: pendingPlaceOffer(ld, sk, note, offer, rand, randomBytes32()),
          fallback: emptyPrivateState(ns),
        });
        const after = (await poolState()).hit;
        record({ name, ok: true, txHash: after.txHash, block: after.blockHeight, detail: placed.status });
        return true;
      } catch (e) {
        record({
          name,
          ok: false,
          detail: e instanceof Error ? e.message.slice(0, 180) : "placeOffer failed",
        });
        return false;
      }
    }

    await place("pool-place-maker-a-ineligible", makerASk, noteA, offerA, randA);
    await place("pool-place-maker-b-eligible", makerBSk, noteB, offerB, randB);
    await place("pool-place-maker-c-best-partial", makerCSk, noteC, offerC, randC);

    const remaining = nightNote.amount;
    const candidates: Candidate[] = [
      { id: "maker-a", offer: offerA, remaining, receivedAt: 1, rand: randA, live: true },
      { id: "maker-b", offer: offerB, remaining, receivedAt: 2, rand: randB, live: true },
      { id: "maker-c", offer: offerC, remaining, receivedAt: 3, rand: randC, live: true },
    ];
    const decision = decideFill({
      esk,
      mandate,
      remaining,
      nowBound,
      revoked: false,
      candidates,
      allowCounterparty: () => true,
    });
    record({
      name: "agent-rank",
      ok: decision.action === "fill" && decision.id === "maker-c",
      detail:
        decision.action === "fill"
          ? `selected=${decision.id} chosenIndex=${decision.chosenIndex} fillBase=${decision.fillBase} fillQuote=${decision.fillQuote} eligible=${decision.ranked.filter((r) => r.ok).length}`
          : `rejected:${"reason" in decision ? decision.reason : "unknown"}`,
    });

    const fillsBefore = (await poolState()).ld.fills;
    const nextStateNonce = randomBytes32();
    try {
      if (decision.action !== "fill") throw new Error("agent did not select a fill");
      const slice = legalSlice(decision.offer, mandate, remaining);
      if (slice.fillBase !== decision.fillBase || slice.fillQuote !== decision.fillQuote) {
        throw new Error("agent slice drifted from Compact legalSlice");
      }
      const { ld } = await poolState();
      const built = constructFillK({
        ledger: ld,
        esk,
        mandate,
        remaining,
        nowBound,
        revoked: false,
        offer: offerA,
        mandateRand,
        stateNonce,
        offerRand: randA,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce,
        candidates,
      });
      if (built.decision.action !== "fill" || built.decision.id !== "maker-c") {
        throw new Error("constructFillK did not bind the best eligible candidate");
      }
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
      const residual = residualOf(decision.offer, decision.offerRand ?? randC, decision.fillBase, decision.fillQuote);
      record({
        name: "pool-k3-fill",
        ok: after.ld.fills === fillsBefore + 1n,
        txHash: after.hit.txHash,
        block: after.hit.blockHeight,
        detail: `${filled.status} · chosenIndex private · residualBase=${residual.offer.baseAmount}`,
      });
    } catch (e) {
      record({
        name: "pool-k3-fill",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 220) : "k3 fill failed",
      });
    }

    mkdirSync(resolve(root, "deployments"), { recursive: true });
    const body = {
      network: "preprod",
      protocolVersion: block.protocolVersion,
      semantics: "mbbe-k3",
      globalBest: false,
      mpc: false,
      quote: deployed.quote,
      pool: deployed.pool,
      steps,
    };
    writeFileSync(resolve(root, "deployments", "three-maker.json"), JSON.stringify(body, null, 2));
    console.log("wrote deployments/three-maker.json");
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
  console.error("mbbe three-maker failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
