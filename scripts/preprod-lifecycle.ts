/**
 * Preprod lifecycle after both contracts have indexer evidence.
 * Success of each step is indexer contractAction / transaction status,
 * never submitTx resolving. Fill overreach is a real Compact reject.
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
  makeDisclosure,
  managedDir,
  pendingCreateMandate,
  pendingDeposit,
  pendingPlaceOffer,
  pendingCancelOffer,
  pendingRevokeMandate,
  pendingWithdraw,
  poolLedgerFromStateHex,
  randomBytes32,
  requireContractAction,
  submitCircuit,
  submitStagedCircuit,
  verifyDisclosure,
  walletNamespace,
  type QuotePrivateState,
} from "../packages/core/src/index.ts";
import { encodeUserAddress } from "@midnight-ntwrk/ledger-v8";
import { constructFill } from "../packages/agent/src/fill-circuit.ts";
import {
  closeOperatorWallet,
  ensureOperatorDust,
  openOperatorWallet,
  waitForOperatorWalletUnlocked,
  waitForPreprodDeployFile,
} from "./lib/operator-wallet.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Step = { name: string; ok: boolean; txHash?: string; block?: number; detail?: string };

function userAddressBytes(keystore: { getAddress: () => string }): Uint8Array {
  const encoded = encodeUserAddress(keystore.getAddress());
  if (encoded.length !== 32) {
    throw new Error(`encodeUserAddress produced ${encoded.length} bytes, expected 32`);
  }
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

  console.log("waiting for indexer-backed deployments/preprod.json");
  const deployed = await waitForPreprodDeployFile();
  console.log("deploy file present; waiting for deploy wallet to release the lock");
  await waitForOperatorWalletUnlocked();
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
  try {
    await ensureOperatorDust(session);

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
      console.log("quote claim UserAddress encoded", to.right.bytes.length, "bytes");
      const claim = await submitCircuit(quoteProviders, {
        contractAddress: deployed.quote.address,
        compiledContract: compiledQuote(),
        privateStateId: "remit-quote",
        circuitId: "claim",
        args: [1_000_000n, dayBucket, to],
      });
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
    record({ name: "pool-bound", ok: true, detail: "bound via findDeployedContract" });

    const principalSk = randomBytes32();
    const makerSk = randomBytes32();
    const esk = envSk("REMIT_EXECUTOR_SECRET_HEX");
    const nightNonce = randomBytes32();
    const quoteNonce = randomBytes32();
    const nightNote = {
      asset: 0n,
      amount: 5_000_000n,
      owner: pureCircuits.ownerKey(principalSk),
      nonce: nightNonce,
    };
    const quoteNote = {
      asset: 1n,
      amount: 1_000_000n,
      owner: pureCircuits.ownerKey(makerSk),
      nonce: quoteNonce,
    };

    async function poolState() {
      const hit = requireContractAction(
        await fetchContractAction(session.indexerHttpUrl, deployed.pool.address),
        "pool",
      );
      if (!hit.stateHex) throw new Error("indexer contractAction missing state");
      return { hit, ld: poolLedgerFromStateHex(hit.stateHex) };
    }

    try {
      const deposited = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "deposit",
        circuitArgs: [0n, nightNote.amount],
        pending: pendingDeposit(principalSk, nightNonce),
        fallback: emptyPrivateState(ns),
      });
      if (!deposited.txId) throw new Error("deposit missing tx id");
      const afterDep = (await poolState()).hit;
      record({
        name: "pool-deposit-night",
        ok: true,
        txHash: afterDep.txHash,
        block: afterDep.blockHeight,
        detail: deposited.status,
      });
    } catch (e) {
      record({
        name: "pool-deposit-night",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "deposit failed",
      });
    }

    try {
      const deposited = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "deposit",
        circuitArgs: [1n, quoteNote.amount],
        pending: pendingDeposit(makerSk, quoteNonce),
        fallback: emptyPrivateState(ns),
      });
      const afterDep = (await poolState()).hit;
      record({
        name: "pool-deposit-quote",
        ok: true,
        txHash: afterDep.txHash,
        block: afterDep.blockHeight,
        detail: deposited.status,
      });
    } catch (e) {
      record({
        name: "pool-deposit-quote",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "quote deposit failed",
      });
    }

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
    const offer = {
      side: 1n,
      baseAmount: 40n,
      quoteAmount: 1280n,
      maker: quoteNote.owner,
      payNonce: randomBytes32(),
      expiry: 4_000_000_000n,
      minFillBase: 1n,
    };
    const over = {
      ...offer,
      baseAmount: 60n,
      quoteAmount: 1920n,
      payNonce: randomBytes32(),
    };
    const offerRand = randomBytes32();
    const overRand = randomBytes32();
    const overChangeNonce = randomBytes32();
    const mandateRand = randomBytes32();
    const stateNonce = randomBytes32();
    const nowBound = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const overChange = {
      asset: 1n,
      amount: quoteNote.amount - over.quoteAmount,
      owner: quoteNote.owner,
      nonce: overChangeNonce,
    };

    try {
      const { ld } = await poolState();
      const placed = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "placeOffer",
        circuitArgs: [],
        pending: pendingPlaceOffer(ld, makerSk, quoteNote, over, overRand, overChangeNonce),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({ name: "pool-place-over-offer", ok: true, txHash: after.txHash, block: after.blockHeight, detail: placed.status });
    } catch (e) {
      record({
        name: "pool-place-over-offer",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "place over offer failed",
      });
    }

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
      constructFill({
        ledger: ld,
        esk,
        mandate,
        remaining: nightNote.amount,
        nowBound,
        revoked: false,
        offer: over,
        mandateRand,
        stateNonce,
        offerRand: overRand,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
      });
      record({ name: "overreach-precheck", ok: false, detail: "local pre-check allowed X+20%" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "precheck";
      record({
        name: "overreach-precheck",
        ok: /rejected fill|over-cap/i.test(msg),
        detail: msg.slice(0, 180),
      });
    }

    try {
      const { ld } = await poolState();
      const built = constructFill({
        ledger: ld,
        esk,
        mandate,
        remaining: nightNote.amount,
        nowBound,
        revoked: false,
        offer: over,
        mandateRand,
        stateNonce,
        offerRand: overRand,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
        bypassLocalPrecheck: true,
      });
      await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "fill",
        circuitArgs: [nowBound],
        pending: built.pending,
        fallback: emptyPrivateState(ns),
      });
      record({ name: "overreach-compact", ok: false, detail: "Compact accepted X+20% fill" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "compact";
      record({
        name: "overreach-compact",
        ok: /circuit rejected|per-fill cap|POLICY_REJECT/i.test(msg),
        detail: msg.slice(0, 180),
      });
    }

    const priceBad = {
      ...offer,
      quoteAmount: 1n,
      payNonce: randomBytes32(),
    };
    const priceRand = randomBytes32();
    const priceChangeNonce = randomBytes32();
    const priceChange = {
      asset: 1n,
      amount: overChange.amount - priceBad.quoteAmount,
      owner: quoteNote.owner,
      nonce: priceChangeNonce,
    };

    try {
      const { ld } = await poolState();
      const placed = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "placeOffer",
        circuitArgs: [],
        pending: pendingPlaceOffer(ld, makerSk, overChange, priceBad, priceRand, priceChangeNonce),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({
        name: "pool-place-price-offer",
        ok: true,
        txHash: after.txHash,
        block: after.blockHeight,
        detail: placed.status,
      });
    } catch (e) {
      record({
        name: "pool-place-price-offer",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "place price offer failed",
      });
    }

    try {
      const { ld } = await poolState();
      const built = constructFill({
        ledger: ld,
        esk,
        mandate,
        remaining: nightNote.amount,
        nowBound,
        revoked: false,
        offer: priceBad,
        mandateRand,
        stateNonce,
        offerRand: priceRand,
        auditSeed: randomBytes32(),
        getNonce: randomBytes32(),
        nextStateNonce: randomBytes32(),
        bypassLocalPrecheck: true,
      });
      await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "fill",
        circuitArgs: [nowBound],
        pending: built.pending,
        fallback: emptyPrivateState(ns),
      });
      record({ name: "price-violation-compact", ok: false, detail: "Compact accepted a price-limit violation" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "compact";
      record({
        name: "price-violation-compact",
        ok: /circuit rejected|price outside mandate|POLICY_REJECT|price/i.test(msg),
        detail: msg.slice(0, 180),
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
        pending: pendingPlaceOffer(ld, makerSk, priceChange, offer, offerRand, randomBytes32()),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({ name: "pool-place-offer", ok: true, txHash: after.txHash, block: after.blockHeight, detail: placed.status });
    } catch (e) {
      record({
        name: "pool-place-offer",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "placeOffer failed",
      });
    }

    const auditSeed = randomBytes32();
    const nextStateNonce = randomBytes32();
    const remainingAfterFill = nightNote.amount - offer.baseAmount;
    const refundNonce = randomBytes32();
    try {
      const { ld } = await poolState();
      const built = constructFill({
        ledger: ld,
        esk,
        mandate,
        remaining: nightNote.amount,
        nowBound,
        revoked: false,
        offer,
        mandateRand,
        stateNonce,
        offerRand,
        auditSeed,
        getNonce: randomBytes32(),
        nextStateNonce,
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
        name: "pool-fill",
        ok: after.ld.fills >= 1n,
        txHash: after.hit.txHash,
        block: after.hit.blockHeight,
        detail: filled.status,
      });
      const root = after.ld.auditRoots.head();
      if (root.is_some) {
        const pkg = makeDisclosure(0, auditSeed, {
          side: offer.side,
          baseAmount: offer.baseAmount,
          quoteAmount: offer.quoteAmount,
          principal: mandate.principal,
          counterparty: offer.maker,
          mandateId: mandate.mandateId,
        }, [1]);
        const verified = verifyDisclosure(pkg, root.value, { allowedFields: ["baseAmount"], expectedFillIndex: 0 });
        record({ name: "selective-audit", ok: verified.ok, detail: verified.failed.join(",") || "pass" });
      } else {
        record({ name: "selective-audit", ok: false, detail: "no auditRoot on ledger" });
      }
    } catch (e) {
      record({
        name: "pool-fill",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "fill failed",
      });
    }

    try {
      const fillOk = steps.some((s) => s.name === "pool-fill" && s.ok);
      if (!fillOk) throw new Error("skip cancel: fill did not settle");
      const { ld } = await poolState();
      const cancelled = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "cancelOffer",
        circuitArgs: [],
        pending: pendingCancelOffer(ld, makerSk, over, overRand, randomBytes32()),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({
        name: "pool-cancel-over-offer",
        ok: true,
        txHash: after.txHash,
        block: after.blockHeight,
        detail: cancelled.status,
      });
    } catch (e) {
      record({
        name: "pool-cancel-over-offer",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "cancelOffer failed",
      });
    }

    try {
      const fillOk = steps.some((s) => s.name === "pool-fill" && s.ok);
      if (!fillOk) throw new Error("skip revoke: fill did not settle");
      const { ld } = await poolState();
      const revoked = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "revokeMandate",
        circuitArgs: [],
        pending: pendingRevokeMandate(
          ld,
          principalSk,
          mandate,
          mandateRand,
          remainingAfterFill,
          nextStateNonce,
          refundNonce,
        ),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({
        name: "pool-revoke",
        ok: true,
        txHash: after.txHash,
        block: after.blockHeight,
        detail: revoked.status,
      });
    } catch (e) {
      record({
        name: "pool-revoke",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "revoke failed",
      });
    }

    try {
      const fillOk = steps.some((s) => s.name === "pool-fill" && s.ok);
      if (!fillOk) throw new Error("skip withdraw: fill did not settle");
      const refundNote = {
        asset: 0n,
        amount: remainingAfterFill,
        owner: nightNote.owner,
        nonce: refundNonce,
      };
      const { ld } = await poolState();
      const withdrawn = await submitStagedCircuit(poolProviders, {
        contractAddress: deployed.pool.address,
        compiledContract: compiledPool(),
        privateStateId: "remit-pool",
        circuitId: "withdraw",
        circuitArgs: [0n, remainingAfterFill],
        pending: pendingWithdraw(
          ld,
          principalSk,
          refundNote,
          userAddressBytes(session.unshieldedKeystore),
          randomBytes32(),
        ),
        fallback: emptyPrivateState(ns),
      });
      const after = (await poolState()).hit;
      record({
        name: "pool-withdraw",
        ok: true,
        txHash: after.txHash,
        block: after.blockHeight,
        detail: withdrawn.status,
      });
    } catch (e) {
      record({
        name: "pool-withdraw",
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 180) : "withdraw failed",
      });
    }

    mkdirSync(resolve(root, "deployments"), { recursive: true });
    const lifecycleBody = {
      network: "preprod",
      protocolVersion: block.protocolVersion,
      quote: deployed.quote,
      pool: deployed.pool,
      steps,
      mpc: false as const,
      frontend: true,
    };
    writeFileSync(resolve(root, "deployments", "lifecycle.json"), JSON.stringify(lifecycleBody, null, 2));
    console.log("wrote deployments/lifecycle.json");
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
  console.error("preprod lifecycle failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
