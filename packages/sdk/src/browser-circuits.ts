/**
 * Browser Compact circuit entry. Bundled to dist/browser/remit-circuit.js.
 * Next must not statically import this file.
 */
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { pureCircuits } from "@remit/contracts/pool";
import { bindDeployed } from "../../core/src/tx.ts";
import { compiledPoolHttp } from "../../core/src/compiled-http.ts";
import { emptyPrivateState, walletNamespace, type RemitPrivateState } from "../../core/src/state.ts";
import { fetchContractAction, requireContractAction } from "../../core/src/indexer.ts";
import { fromHex, randomBytes32 } from "../../core/src/bytes.ts";
import { pendingCreateMandate, pendingDeposit, pendingRevokeMandate } from "../../core/src/pending.ts";
import { poolLedgerFromStateHex } from "../../core/src/paths.ts";
import { submitStagedCircuit } from "../../core/src/stage-call.ts";
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
};

async function poolProviders(args: BrowserCircuitArgs) {
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
  return { providers, compiled, config, ns, initial };
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

export async function createMandateFromWallet(args: BrowserCircuitArgs) {
  const input = args.input;
  if (!input) throw new Error("createMandate requires mandate input");
  const { providers, compiled, config, ns, initial } = await poolProviders(args);
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
  await providers.privateStateProvider.set("remit-pool", {
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
  });
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
  const { providers, compiled, config, ns, initial } = await poolProviders(args);
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
  return { txHash: revoked.txHash ?? hit.txHash, block: revoked.blockHeight ?? hit.blockHeight, ns };
}
