import { WebSocket } from "ws";
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as Rx from "rxjs";
import { mnemonicToSeedSync } from "@scure/bip39";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { unshieldedToken, LedgerParameters, ZswapSecretKeys, DustSecretKey } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import {
  HDWallet,
  Roles,
  WalletFacade,
  ShieldedWallet,
  UnshieldedWallet,
  DustWallet,
  createKeystore,
  PublicKey,
  NoOpTransactionHistoryStorage,
} from "@midnightntwrk/wallet-sdk";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { RemitNodeWallet } from "../../packages/core/src/node-wallet.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: resolve(repoRoot, ".env.preprod.local") });

export const DUST_READY_FILE = resolve(repoRoot, "deployments", "dust-ready.json");
export const PREPROD_DEPLOY_FILE = resolve(repoRoot, "deployments", "preprod.json");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function writeDustReady(info: Record<string, unknown> = {}) {
  mkdirSync(resolve(repoRoot, "deployments"), { recursive: true });
  writeFileSync(
    DUST_READY_FILE,
    JSON.stringify(
      {
        ready: true,
        gate: "availableCoins>=1",
        at: new Date().toISOString(),
        ...info,
      },
      null,
      2,
    ),
  );
}

function dustLogStatus(logPath: string | undefined): "ready" | "failed" | "wait" {
  if (!logPath || !existsSync(logPath)) return "wait";
  const text = readFileSync(logPath, "utf8");
  if (text.includes("spendable DUST ready")) return "ready";
  if (/dust-register failed|Timeout has occurred/i.test(text) && /status:\s*running/i.test(text.slice(0, 900)) === false) {
    return "failed";
  }
  return "wait";
}

function logProcessRunning(logPath: string): boolean {
  const head = readFileSync(logPath, "utf8").slice(0, 1200);
  return /status:\s*running/i.test(head);
}

/**
 * Do not open a second WalletFacade while dust-register holds the first one.
 * Wait for deployments/dust-ready.json, or for the running register log to
 * report spendable coins and then exit.
 */
export async function waitForDustReadyFile(timeoutMs = 3 * 60 * 60_000) {
  const logPath = process.env.REMIT_DUST_LOG;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(DUST_READY_FILE)) {
      console.log("dust-ready.json present — first wallet may now be stopped");
      return;
    }
    const status = dustLogStatus(logPath);
    if (status === "failed") throw new Error("dust-register failed; refusing to deploy");
    if (status === "ready") {
      const waitStopUntil = Date.now() + 60_000;
      while (logPath && logProcessRunning(logPath) && Date.now() < waitStopUntil) {
        console.log("spendable DUST reported; waiting for dust-register wallet.stop()");
        await sleep(5_000);
      }
      writeDustReady({ source: "dust-register-log" });
      return;
    }
    console.log("waiting for dust-ready.json — not opening a second WalletFacade");
    await sleep(10_000);
  }
  throw new Error("timed out waiting for spendable DUST (availableCoins >= 1)");
}

export async function waitForPreprodDeployFile(timeoutMs = 3 * 60 * 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(PREPROD_DEPLOY_FILE)) {
      const raw = JSON.parse(readFileSync(PREPROD_DEPLOY_FILE, "utf8")) as {
        quote?: { address?: string; txHash?: string; block?: number };
        pool?: { address?: string; txHash?: string; block?: number };
      };
      if (raw.quote?.address && raw.quote.txHash && raw.quote.block != null && raw.pool?.address && raw.pool.txHash && raw.pool.block != null) {
        return raw as {
          quote: { address: string; txHash: string; block: number };
          pool: { address: string; txHash: string; block: number };
        };
      }
      throw new Error("deployments/preprod.json exists but is missing indexer tx hash + block");
    }
    console.log("waiting for deployments/preprod.json (indexer-backed)");
    await sleep(15_000);
  }
  throw new Error("timed out waiting for Preprod deploy evidence");
}

export type OperatorSession = Awaited<ReturnType<typeof openOperatorWallet>>;

function deriveKeys(seed: Buffer) {
  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== "seedOk") throw new Error("hd seed");
  const result = hd.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  if (result.type !== "keysDerived") throw new Error("derive");
  hd.hdWallet.clear();
  return result.keys;
}

export async function openOperatorWallet() {
  const mnemonic = process.env.REMIT_OPERATOR_MNEMONIC;
  const expect = process.env.REMIT_OPERATOR_UNSHIELDED_ADDR;
  if (!mnemonic || !expect) throw new Error("missing operator mnemonic or expected address");
  setNetworkId("preprod");
  const seed = Buffer.from(mnemonicToSeedSync(mnemonic));
  const keys = deriveKeys(seed);
  const shieldedSecretKeys = ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], "preprod");
  const addr = unshieldedKeystore.getBech32Address().asString();
  if (addr !== expect) throw new Error("address mismatch — refusing to operate");

  const indexerHttpUrl = process.env.MIDNIGHT_INDEXER_URL!;
  const indexerWsUrl = process.env.MIDNIGHT_INDEXER_WS!;
  const node = process.env.MIDNIGHT_NODE_URL!;
  const proofServer = process.env.MIDNIGHT_PROOF_SERVER_URL ?? "http://localhost:6300";

  const shieldedConfig = {
    networkId: "preprod" as const,
    indexerClientConnection: { indexerHttpUrl, indexerWsUrl },
    provingServerUrl: new URL(proofServer),
    relayURL: new URL(node.replace(/^http/, "ws")),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
  };
  const unshieldedConfig = {
    networkId: "preprod" as const,
    indexerClientConnection: { indexerHttpUrl, indexerWsUrl },
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
  };
  const dustConfig = {
    ...shieldedConfig,
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };

  const wallet = await WalletFacade.init({
    configuration: { ...shieldedConfig, ...unshieldedConfig, ...dustConfig },
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  const provider = new RemitNodeWallet(wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore);
  return {
    wallet,
    provider,
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
    addr,
    nightRaw: unshieldedToken().raw,
    indexerHttpUrl,
    proofServer,
  };
}

export async function waitUnshieldedReady(wallet: WalletFacade, nightRaw: string, timeoutMs = 3 * 60 * 60_000) {
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(15_000),
      Rx.tap((s) => {
        const night = s.unshielded.balances[nightRaw] ?? 0n;
        console.log(
          "sync tick night=",
          night.toString(),
          "unshieldedCoins=",
          s.unshielded.availableCoins?.length ?? 0,
          "dustCoins=",
          s.dust?.availableCoins?.length ?? 0,
          "unshieldedComplete=",
          s.unshielded.progress?.isStrictlyComplete?.() === true,
          "synced=",
          s.isSynced,
        );
      }),
      Rx.filter((s) => {
        const night = s.unshielded.balances[nightRaw] ?? 0n;
        const coins = s.unshielded.availableCoins ?? [];
        return s.unshielded.progress?.isStrictlyComplete?.() === true && coins.length > 0 && night > 0n;
      }),
      Rx.timeout({ first: timeoutMs }),
    ),
  );
}

export async function waitSpendableDust(wallet: WalletFacade, timeoutMs = 3 * 60 * 60_000) {
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(15_000),
      Rx.tap((s) => {
        let balance = "0";
        try {
          balance = s.dust?.balance?.(new Date())?.toString() ?? "0";
        } catch {
          balance = "0";
        }
        console.log("dust coins", s.dust?.availableCoins?.length ?? 0, "balance", balance, "synced", s.isSynced);
      }),
      Rx.filter((s) => (s.dust?.availableCoins?.length ?? 0) >= 1),
      Rx.timeout({ first: timeoutMs }),
    ),
  );
}
