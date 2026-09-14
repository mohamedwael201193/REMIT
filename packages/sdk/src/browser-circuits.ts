/**
 * Browser Compact circuit entry. Bundled to dist/browser/remit-circuit.js.
 * Next must not statically import this file.
 */
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Buffer } from "buffer";
import { pureCircuits } from "@remit/contracts/pool";
import { bindDeployed } from "../../core/src/tx.ts";
import { compiledPoolHttp } from "../../core/src/compiled-http.ts";
import { emptyPrivateState, walletNamespace, type RemitPrivateState } from "../../core/src/state.ts";
import {
  freshTabWrapKey,
  openTabPrivateState,
  sealTabPrivateState,
  tabStorageKeys,
  wrapKeyHex,
  tabWrapKeyFromHex,
} from "../../core/src/tab-seal.ts";
import { fetchContractAction, requireContractAction } from "../../core/src/indexer.ts";
import { fromHex, randomBytes32 } from "../../core/src/bytes.ts";
import { pendingCreateMandate, pendingDeposit, pendingPlaceOffer, pendingRevokeMandate, pendingWithdraw } from "../../core/src/pending.ts";
import { poolLedgerFromStateHex } from "../../core/src/paths.ts";
import { submitStagedCircuit } from "../../core/src/stage-call.ts";
import { FAR_EXPIRY } from "../../core/src/mbbe.ts";
import { makeMandateBox, makeOfferBox } from "../../core/src/rfq.ts";
import { encodeUserAddress } from "@midnight-ntwrk/ledger-v8";
import { createRemitBrowserProviders } from "./browser-session.ts";
import { fetchRemitConfig } from "./public.ts";

export type BrowserCircuitArgs = {
  wallet: ConnectedAPI;
  kind?: string | null;
  apiUrl: string;
  pool: string;
  quote: string;
  network: string;
  input?: {
    maxFill: number;
    limitPrice: number;
    expiryDays: number;
    side: "buy" | "sell";
    intent?: string;
  };
  offer?: PlaceOfferCircuitInput;
};

export type PlaceOfferCircuitInput = {
  side: "buy" | "sell";
  baseAmount: number;
  quoteAmount: number;
  minFillBase?: number;
  expiryDays?: number;
};

async function poolProviders(args: BrowserCircuitArgs) {
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
  const config = await fetchRemitConfig(args.apiUrl);
  if (!config.live || config.pool !== args.pool || config.quote !== args.quote) {
    throw new Error("API does not yet expose indexer-backed pool and quote addresses");
  }
  const indexerWs = config.indexerWs ?? `${config.indexer.replace(/^http/i, "ws")}/ws`;
  const proofServer =
    args.kind === "lace"
      ? (await args.wallet.getConfiguration?.().catch(() => undefined))?.proverServerUri ?? "http://localhost:6300"
      : undefined;
  const providers = await createRemitBrowserProviders({
    wallet: args.wallet,
    apiUrl: args.apiUrl,
    indexerHttp: config.indexer,
    indexerWs,
    proofServer,
    zkScope: "pool",
    walletName: args.kind === "lace" ? "Lace" : "1AM",
    walletRdns: args.kind === "lace" ? "io.lace" : "xyz.1am",
    network: args.network,
  });
  const addr = (await args.wallet.getUnshieldedAddress()).unshieldedAddress;
  const ns = walletNamespace(args.network, addr, "browser-pool");
  const compiled = compiledPoolHttp();
  const initial = emptyPrivateState(ns);
  await bindDeployed(providers, {
    contractAddress: args.pool,
    compiledContract: compiled,
    privateStateId: "remit-pool",
    initialPrivateState: initial,
  });
  providers.privateStateProvider.setContractAddress(args.pool as never);
  const restored = readTabPrivate(args.network, args.pool, addr);
  if (restored) await providers.privateStateProvider.set("remit-pool", restored);
  return { providers, compiled, config, ns, addr, initial: restored ?? initial };
}

async function ledger(indexer: string, pool: string) {
  const hit = requireContractAction(await fetchContractAction(indexer, pool), "pool");
  if (!hit.stateHex) throw new Error("indexer contractAction missing state");
  return { hit, ld: poolLedgerFromStateHex(hit.stateHex) };
}

function ownerSkOf(ps: RemitPrivateState): Uint8Array {
  if (ps.ownerSk?.length === 32) return Uint8Array.from(ps.ownerSk);
  return randomBytes32();
}

function readTabPrivate(network: string, pool: string, wallet: string): RemitPrivateState | null {
  try {
    const keys = tabStorageKeys(network, pool, wallet);
    const wrapHex = globalThis.sessionStorage?.getItem(keys.wrap);
    const blob = globalThis.sessionStorage?.getItem(keys.blob);
    if (!wrapHex || !blob) return null;
    return openTabPrivateState(blob, tabWrapKeyFromHex(wrapHex));
  } catch {
    return null;
  }
}

function writeTabPrivate(network: string, pool: string, wallet: string, ps: RemitPrivateState) {
  try {
    const keys = tabStorageKeys(network, pool, wallet);
    let wrapHex = globalThis.sessionStorage?.getItem(keys.wrap);
    if (!wrapHex) {
      wrapHex = wrapKeyHex(freshTabWrapKey());
      globalThis.sessionStorage?.setItem(keys.wrap, wrapHex);
    }
    const blob = sealTabPrivateState(ps, tabWrapKeyFromHex(wrapHex));
    globalThis.sessionStorage?.setItem(keys.blob, blob);
  } catch {
    /* private mode / quota */
  }
}

export async function createMandateFromWallet(args: BrowserCircuitArgs) {
  const input = args.input;
  if (!input) throw new Error("createMandate requires mandate input");
  const { providers, compiled, config, ns, addr, initial } = await poolProviders(args);
  if (!config.executorKey) throw new Error("API does not expose the public executor key");
  providers.privateStateProvider.setContractAddress(args.pool as never);
  let ps = ((await providers.privateStateProvider.get("remit-pool")) as RemitPrivateState | null) ?? initial;
  const ownerSk = ownerSkOf(ps);
  ps = { ...ps, ownerSk: Array.from(ownerSk) };
  await providers.privateStateProvider.set("remit-pool", ps);

  const depositNonce = randomBytes32();
  const amount = BigInt(Math.max(1, Math.floor(input.maxFill)));
  const deposited = await submitStagedCircuit(providers, {
    contractAddress: args.pool,
    compiledContract: compiled,
    privateStateId: "remit-pool",
    circuitId: "deposit",
    circuitArgs: [0n, amount],
    pending: pendingDeposit(ownerSk, depositNonce),
    fallback: ps,
  });
  if (!deposited.txId && !deposited.txHash) throw new Error("deposit missing tx id");
  const afterDep = await ledger(config.indexer, args.pool);

  const note = {
    asset: 0n,
    amount,
    owner: pureCircuits.ownerKey(ownerSk),
    nonce: depositNonce,
  };
  const mandate = {
    principal: note.owner,
    executor: fromHex(config.executorKey),
    side: input.side === "sell" ? 1n : 0n,
    maxFillBase: amount,
    limitNum: BigInt(Math.max(1, Math.floor(input.limitPrice * 1000))),
    limitDen: 1000n,
    cpRoot: 0n,
    expiry: BigInt(Math.floor(Date.now() / 1000) + Math.max(1, input.expiryDays) * 86400),
    mandateId: randomBytes32(),
  };
  const mandateRand = randomBytes32();
  const stateNonce = randomBytes32();
  const created = await submitStagedCircuit(providers, {
    contractAddress: args.pool,
    compiledContract: compiled,
    privateStateId: "remit-pool",
    circuitId: "createMandate",
    circuitArgs: [],
    pending: pendingCreateMandate(afterDep.ld, ownerSk, note, mandate, mandateRand, stateNonce),
    fallback: ps,
  });
  const nextPs: RemitPrivateState = {
    ...ps,
    ownerSk: Array.from(ownerSk),
    mandates: [
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
        rand: Array.from(mandateRand),
      },
    ],
    mandateStates: [
      {
        state: { mandateId: Array.from(mandate.mandateId), remaining: amount.toString() },
        nonce: Array.from(stateNonce),
      },
    ],
  };
  await providers.privateStateProvider.set("remit-pool", nextPs);
  writeTabPrivate(args.network, args.pool, addr, nextPs);
  if (!config.rfqPublic) throw new Error("API does not expose rfqPublic — mandate box cannot be delivered");
  const jsonMandate = nextPs.mandates[0]!.mandate;
  const { boxed: mandateBox } = makeMandateBox(config.rfqPublic, Array.from(mandate.mandateId), 7 * 24 * 60 * 60_000, {
    mandate: jsonMandate,
    mandateRand: Array.from(mandateRand),
    remaining: amount.toString(),
    stateNonce: Array.from(stateNonce),
  });
  const mandatePost = await fetch(`${args.apiUrl.replace(/\/$/, "")}/mandate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ box: mandateBox }),
  });
  if (!mandatePost.ok && mandatePost.status !== 409) {
    throw new Error(`mandate inbox ${mandatePost.status}`);
  }
  const after = await ledger(config.indexer, args.pool);
  return {
    id: `mandate:${args.pool}`,
    reference: `MD-${args.pool.slice(0, 6)}`,
    asset: "tNIGHT",
    side: input.side,
    maxFill: input.maxFill,
    limitPrice: input.limitPrice,
    totalBudget: input.maxFill,
    spent: 0,
    counterpartyClasses: [],
    counterpartyIds: ["cp-onchain"],
    expiry: new Date(Number(mandate.expiry) * 1000).toISOString(),
    executorId: "ex-remit",
    status: "active" as const,
    createdAt: new Date().toISOString(),
    settledFills: 0,
    intent: input.intent ?? `On-chain mandate. tx ${created.txHash ?? after.hit.txHash ?? created.txId}`,
    txHash: created.txHash ?? after.hit.txHash,
    block: created.blockHeight ?? after.hit.blockHeight,
  };
}

export async function revokeMandatesFromWallet(args: BrowserCircuitArgs) {
  const { providers, compiled, config, ns, addr, initial } = await poolProviders(args);
  providers.privateStateProvider.setContractAddress(args.pool as never);
  const ps = ((await providers.privateStateProvider.get("remit-pool")) as RemitPrivateState | null) ?? initial;
  const ownerSk = ownerSkOf(ps);
  if (!ps.mandates[0]) {
    throw new Error("No private mandate opening in this tab — revokeMandate cannot be proven without the mandate witnesses");
  }
  const { ld, hit } = await ledger(config.indexer, args.pool);
  const stored = ps.mandates[0];
  const mandate = {
    principal: Uint8Array.from(stored.mandate.principal),
    executor: Uint8Array.from(stored.mandate.executor),
    side: BigInt(stored.mandate.side),
    maxFillBase: BigInt(stored.mandate.maxFillBase),
    limitNum: BigInt(stored.mandate.limitNum),
    limitDen: BigInt(stored.mandate.limitDen),
    cpRoot: BigInt(stored.mandate.cpRoot),
    expiry: BigInt(stored.mandate.expiry),
    mandateId: Uint8Array.from(stored.mandate.mandateId),
  };
  const remaining = BigInt(ps.mandateStates[0]?.state.remaining ?? stored.mandate.maxFillBase);
  const stateNonce = Uint8Array.from(ps.mandateStates[0]?.nonce ?? randomBytes32());
  const revoked = await submitStagedCircuit(providers, {
    contractAddress: args.pool,
    compiledContract: compiled,
    privateStateId: "remit-pool",
    circuitId: "revokeMandate",
    circuitArgs: [],
    pending: pendingRevokeMandate(
      ld,
      ownerSk,
      mandate,
      Uint8Array.from(stored.rand),
      remaining,
      stateNonce,
      randomBytes32(),
    ),
    fallback: ps,
  });
  if (!revoked.txId && !revoked.txHash) throw new Error("revokeMandate missing tx id");
  const cleared: RemitPrivateState = { ...ps, mandates: [], mandateStates: [] };
  await providers.privateStateProvider.set("remit-pool", cleared);
  writeTabPrivate(args.network, args.pool, addr, cleared);
  return { txHash: revoked.txHash ?? hit.txHash, block: revoked.blockHeight ?? hit.blockHeight, ns };
}

/**
 * Maker path: deposit escrow → placeOffer → encrypt RFQ → POST /rfq/offer.
 * Openings stay in tab-sealed private state. HTTP sees ciphertext only.
 */
export async function placeOfferFromWallet(args: BrowserCircuitArgs) {
  const input = args.offer;
  if (!input) throw new Error("placeOffer requires offer input");
  const { providers, compiled, config, ns, addr, initial } = await poolProviders(args);
  if (!config.rfqPublic) throw new Error("API does not expose rfqPublic — RFQ box cannot be delivered");
  providers.privateStateProvider.setContractAddress(args.pool as never);
  let ps = ((await providers.privateStateProvider.get("remit-pool")) as RemitPrivateState | null) ?? initial;
  const ownerSk = ownerSkOf(ps);
  ps = { ...ps, ownerSk: Array.from(ownerSk) };
  await providers.privateStateProvider.set("remit-pool", ps);

  const sell = input.side !== "buy";
  const baseAmount = BigInt(Math.max(1, Math.floor(input.baseAmount)));
  const quoteAmount = BigInt(Math.max(1, Math.floor(input.quoteAmount)));
  const minFillBase = BigInt(Math.max(1, Math.floor(input.minFillBase ?? 1)));
  const escrowAsset = sell ? 1n : 0n;
  const escrowAmount = sell ? quoteAmount : baseAmount;
  const depositNonce = randomBytes32();
  const deposited = await submitStagedCircuit(providers, {
    contractAddress: args.pool,
    compiledContract: compiled,
    privateStateId: "remit-pool",
    circuitId: "deposit",
    circuitArgs: [escrowAsset, escrowAmount],
    pending: pendingDeposit(ownerSk, depositNonce),
    fallback: ps,
  });
  if (!deposited.txId && !deposited.txHash) throw new Error("deposit missing tx id");
  const afterDep = await ledger(config.indexer, args.pool);

  const note = {
    asset: escrowAsset,
    amount: escrowAmount,
    owner: pureCircuits.ownerKey(ownerSk),
    nonce: depositNonce,
  };
  const offer = {
    side: sell ? 1n : 0n,
    baseAmount,
    quoteAmount,
    maker: note.owner,
    payNonce: randomBytes32(),
    expiry:
      input.expiryDays && input.expiryDays > 0
        ? BigInt(Math.floor(Date.now() / 1000) + Math.max(1, input.expiryDays) * 86400)
        : FAR_EXPIRY,
    minFillBase,
  };
  const offerRand = randomBytes32();
  const placed = await submitStagedCircuit(providers, {
    contractAddress: args.pool,
    compiledContract: compiled,
    privateStateId: "remit-pool",
    circuitId: "placeOffer",
    circuitArgs: [],
    pending: pendingPlaceOffer(afterDep.ld, ownerSk, note, offer, offerRand, randomBytes32()),
    fallback: ps,
  });
  if (!placed.txId && !placed.txHash) throw new Error("placeOffer missing tx id");

  const jsonOffer = {
    side: offer.side.toString(),
    baseAmount: offer.baseAmount.toString(),
    quoteAmount: offer.quoteAmount.toString(),
    maker: Array.from(offer.maker),
    payNonce: Array.from(offer.payNonce),
    expiry: offer.expiry.toString(),
    minFillBase: offer.minFillBase.toString(),
  };
  const nextPs: RemitPrivateState = {
    ...ps,
    ownerSk: Array.from(ownerSk),
    offers: [...ps.offers, { offer: jsonOffer, rand: Array.from(offerRand) }],
  };
  await providers.privateStateProvider.set("remit-pool", nextPs);
  writeTabPrivate(args.network, args.pool, addr, nextPs);

  const { boxed } = makeOfferBox(config.rfqPublic, jsonOffer, Array.from(offerRand));
  const rfqPost = await fetch(`${args.apiUrl.replace(/\/$/, "")}/rfq/offer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ box: boxed }),
  });
  if (rfqPost.status === 409) throw new Error("RFQ nonce already delivered");
  if (!rfqPost.ok) throw new Error(`rfq/offer ${rfqPost.status}`);
  const rfq = (await rfqPost.json()) as { id?: string };
  if (!rfq.id) throw new Error("rfq/offer did not return an inbox id");
  const after = await ledger(config.indexer, args.pool);
  const txHash = placed.txHash ?? after.hit.txHash;
  const block = placed.blockHeight ?? after.hit.blockHeight;
  return {
    id: `offer:${txHash ?? rfq.id}`,
    reference: txHash ? `OF-${txHash.slice(0, 6)}` : `OF-${rfq.id.slice(0, 6)}`,
    mandateId: `mandate:${args.pool}`,
    asset: "tNIGHT",
    side: input.side,
    price: null,
    size: null,
    amountPrivacy: "sealed" as const,
    counterpartyId: "cp-onchain",
    compatibility: null,
    executionScore: null,
    receivedAt: new Date().toISOString(),
    expiresAt: new Date(Number(offer.expiry) * 1000).toISOString(),
    state: "new" as const,
    frictions: [],
    txHash,
    block,
    rfqId: rfq.id,
    ns,
  };
}

export async function withdrawFromWallet(args: BrowserCircuitArgs) {
  const { providers, compiled, config, ns, addr, initial } = await poolProviders(args);
  providers.privateStateProvider.setContractAddress(args.pool as never);
  const ps = ((await providers.privateStateProvider.get("remit-pool")) as RemitPrivateState | null) ?? initial;
  const ownerSk = ownerSkOf(ps);
  const noteJson = ps.notes[0];
  if (!noteJson) {
    throw new Error("No leftover custody note in this tab — withdraw cannot be proven without the note opening");
  }
  const note = {
    asset: BigInt(noteJson.asset),
    amount: BigInt(noteJson.amount),
    owner: Uint8Array.from(noteJson.owner),
    nonce: Uint8Array.from(noteJson.nonce),
  };
  const { ld, hit } = await ledger(config.indexer, args.pool);
  const recipient = encodeUserAddress(addr);
  if (recipient.length !== 32) {
    throw new Error(`encodeUserAddress produced ${recipient.length} bytes, expected 32`);
  }
  const withdrawn = await submitStagedCircuit(providers, {
    contractAddress: args.pool,
    compiledContract: compiled,
    privateStateId: "remit-pool",
    circuitId: "withdraw",
    circuitArgs: [note.asset, note.amount],
    pending: pendingWithdraw(ld, ownerSk, note, recipient, randomBytes32()),
    fallback: ps,
  });
  if (!withdrawn.txId && !withdrawn.txHash) throw new Error("withdraw missing tx id");
  const nextPs: RemitPrivateState = { ...ps, notes: ps.notes.slice(1) };
  await providers.privateStateProvider.set("remit-pool", nextPs);
  writeTabPrivate(args.network, args.pool, addr, nextPs);
  const after = await ledger(config.indexer, args.pool);
  return {
    txHash: withdrawn.txHash ?? after.hit.txHash ?? hit.txHash,
    block: withdrawn.blockHeight ?? after.hit.blockHeight ?? hit.blockHeight,
    ns,
  };
}
