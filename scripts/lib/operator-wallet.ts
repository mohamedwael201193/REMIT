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
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { RemitNodeWallet } from "../../packages/core/src/node-wallet.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: resolve(repoRoot, ".env.preprod.local") });

export const DUST_READY_FILE = resolve(repoRoot, "deployments", "dust-ready.json");
export const PREPROD_DEPLOY_FILE = resolve(repoRoot, "deployments", "preprod.json");
const WALLET_LOCK_FILE = resolve(repoRoot, "deployments", "operator-wallet.lock");
const WALLET_CACHE_DIR = resolve(repoRoot, "wallet-cache", "operator");
const WALLET_CACHE = {
  shielded: resolve(WALLET_CACHE_DIR, "shielded.state"),
  unshielded: resolve(WALLET_CACHE_DIR, "unshielded.state"),
  dust: resolve(WALLET_CACHE_DIR, "dust.state"),
  meta: resolve(WALLET_CACHE_DIR, "meta.json"),
};

function cachePresent() {
  return existsSync(WALLET_CACHE.shielded) && existsSync(WALLET_CACHE.unshielded) && existsSync(WALLET_CACHE.dust);
}

function dustOffsetOf(serialized: string): string {
  try {
    const parsed = JSON.parse(serialized) as { offset?: unknown };
    return parsed.offset == null ? "?" : String(parsed.offset);
  } catch {
    return "?";
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** One Node WalletFacade for the operator. A second open would cold-replay DUST from genesis. */
export function acquireOperatorWalletLock() {
  mkdirSync(resolve(repoRoot, "deployments"), { recursive: true });
  if (existsSync(WALLET_LOCK_FILE)) {
    const pid = Number(readFileSync(WALLET_LOCK_FILE, "utf8").trim());
    if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && pidAlive(pid)) {
      throw new Error(`operator WalletFacade already held by pid ${pid}`);
    }
  }
  writeFileSync(WALLET_LOCK_FILE, String(process.pid));
}

export function releaseOperatorWalletLock() {
  try {
    if (existsSync(WALLET_LOCK_FILE) && readFileSync(WALLET_LOCK_FILE, "utf8").trim() === String(process.pid)) {
      unlinkSync(WALLET_LOCK_FILE);
    }
  } catch {
    /* ignore stale lock cleanup */
  }
}

/** Lifecycle must not open a second facade while deploy still holds the lock. */
export async function waitForOperatorWalletUnlocked(timeoutMs = 30 * 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!existsSync(WALLET_LOCK_FILE)) return;
    const pid = Number(readFileSync(WALLET_LOCK_FILE, "utf8").trim());
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid || !pidAlive(pid)) {
      try {
        unlinkSync(WALLET_LOCK_FILE);
      } catch {
        /* stale */
      }
      return;
    }
    console.log("waiting for operator WalletFacade lock to release (pid", pid, ")");
    await sleep(5_000);
  }
  throw new Error("timed out waiting for operator wallet lock");
}

let persistBusy = false;

/** Official Wallet SDK serializeState cache so the next open of the SAME wallet does not cold-replay DUST history. */
export async function persistOperatorWallet(wallet: WalletFacade) {
  if (persistBusy) return;
  persistBusy = true;
  try {
    mkdirSync(WALLET_CACHE_DIR, { recursive: true });
    const [shielded, unshielded, dust] = await Promise.all([
      wallet.shielded.serializeState(),
      wallet.unshielded.serializeState(),
      wallet.dust.serializeState(),
    ]);
    writeFileSync(WALLET_CACHE.shielded, shielded);
    writeFileSync(WALLET_CACHE.unshielded, unshielded);
    writeFileSync(WALLET_CACHE.dust, dust);
    const dustOffset = dustOffsetOf(dust);
    writeFileSync(
      WALLET_CACHE.meta,
      JSON.stringify({ at: new Date().toISOString(), dustOffset, bytes: { shielded: shielded.length, unshielded: unshielded.length, dust: dust.length } }, null, 2),
    );
    console.log("persisted operator wallet serializeState cache dustOffset", dustOffset);
  } catch (e) {
    console.log("wallet cache persist skipped:", e instanceof Error ? e.message : "error");
  } finally {
    persistBusy = false;
  }
}

function fmtSyncProgress(p: { appliedIndex?: bigint; highestIndex?: bigint; isStrictlyComplete?: () => boolean } | undefined) {
  if (!p) return "n/a";
  return `${p.appliedIndex?.toString?.() ?? "?"}/${p.highestIndex?.toString?.() ?? "?"} complete=${p.isStrictlyComplete?.() === true}`;
}

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
  acquireOperatorWalletLock();
  try {
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

  const configuration = { ...shieldedConfig, ...unshieldedConfig, ...dustConfig };
  const coldStart = () =>
    WalletFacade.init({
      configuration,
      shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
      unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
      dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, LedgerParameters.initialParameters().dust),
    });

  let wallet: WalletFacade;
  console.log("opening operator wallet", cachePresent() ? "restore serializeState" : "cold start");
  if (cachePresent()) {
    try {
      const shieldedState = readFileSync(WALLET_CACHE.shielded, "utf8");
      const unshieldedState = readFileSync(WALLET_CACHE.unshielded, "utf8");
      const dustState = readFileSync(WALLET_CACHE.dust, "utf8");
      wallet = await WalletFacade.init({
        configuration,
        shielded: () => ShieldedWallet(shieldedConfig).restore(shieldedState),
        unshielded: () => UnshieldedWallet(unshieldedConfig).restore(unshieldedState),
        dust: () => DustWallet(dustConfig).restore(dustState),
      });
      const restoredOffset = dustOffsetOf(dustState);
      console.log("restored operator wallet from serializeState cache (same wallet) dustOffset", restoredOffset);
    } catch (e) {
      console.log("wallet cache restore failed, cold start:", e instanceof Error ? e.message : "error");
      wallet = await coldStart();
    }
  } else {
    console.log("no serializeState cache — cold DUST ledger replay from genesis (id: null)");
    wallet = await coldStart();
  }
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  const persistTimer = setInterval(() => {
    void persistOperatorWallet(wallet);
  }, 90_000);
  persistTimer.unref?.();
  const onHalt = () => {
    void persistOperatorWallet(wallet);
  };
  process.once("SIGINT", onHalt);
  process.once("SIGTERM", onHalt);
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
    persistTimer,
    onHalt,
  };
  } catch (e) {
    releaseOperatorWalletLock();
    throw e;
  }
}

export async function closeOperatorWallet(session: OperatorSession) {
  if (session.persistTimer) clearInterval(session.persistTimer);
  try {
    await persistOperatorWallet(session.wallet);
  } catch {
    /* persist best-effort before stop */
  }
  await session.wallet.stop();
  releaseOperatorWalletLock();
}

/**
 * Same-wallet DUST path: wait unshielded complete, register only if the SDK
 * still shows unregistered NIGHT, then wait availableCoins >= 1. Persists
 * serializeState so a later open of this wallet resumes at appliedIndex.
 */
export async function ensureOperatorDust(session: OperatorSession, timeoutMs = 3 * 60 * 60_000) {
  const nightRaw = unshieldedToken().raw;
  const synced = await waitUnshieldedReady(session.wallet, nightRaw, timeoutMs);
  const coins = synced.unshielded.availableCoins ?? [];
  const flags = coins.map((c: { meta?: { registeredForDustGeneration?: boolean }; utxo?: { type?: unknown } }) => ({
    typeIsNight: String(c.utxo?.type) === String(nightRaw),
    registered: c.meta?.registeredForDustGeneration === true,
  }));
  console.log("coin registration flags", JSON.stringify(flags));

  const unregistered = coins.filter((c: { utxo: { type: unknown }; meta?: { registeredForDustGeneration?: boolean } }) => {
    const t = c.utxo.type;
    const isNight = t === nightRaw || String(t) === String(nightRaw);
    return isNight && c.meta?.registeredForDustGeneration !== true;
  });
  console.log("unshielded coins", coins.length, "unregistered NIGHT utxos:", unregistered.length);

  const force = process.env.REMIT_FORCE_DUST_REGISTER === "1";
  const toRegister = unregistered.length > 0
    ? unregistered
    : force
      ? coins.filter((c: { utxo: { type: unknown } }) => String(c.utxo.type) === String(nightRaw))
      : [];

  if (toRegister.length > 0) {
    try {
      const estimate = await session.wallet.estimateRegistration(toRegister);
      console.log("registration fee estimate present", Boolean(estimate?.fee));
      if (estimate?.fee && estimate.fee > 0n && typeof session.wallet.waitForGeneratedDust === "function") {
        console.log("waiting for projected DUST to cover registration fee");
        await session.wallet.waitForGeneratedDust(toRegister, estimate.fee, { timeoutMs: 30 * 60_000 });
      }
    } catch (e) {
      console.log("estimateRegistration skipped:", e instanceof Error ? e.message : "error");
    }
    const recipe = await session.wallet.registerNightUtxosForDustGeneration(
      toRegister,
      session.unshieldedKeystore.getPublicKey(),
      (payload: Uint8Array) => session.unshieldedKeystore.signData(payload),
    );
    const finalized = await session.wallet.finalizeRecipe(recipe);
    const txId = await session.wallet.submitTransaction(finalized);
    console.log("dust registration submitted", txId);
  } else {
    console.log("all NIGHT already registered according to wallet meta");
  }

  console.log("waiting for spendable DUST (availableCoins >= 1); restoring serializeState skips genesis replay");
  const state = await waitSpendableDust(session.wallet, timeoutMs);
  writeDustReady({ source: "ensureOperatorDust", coins: state.dust?.availableCoins?.length ?? 0 });
  return state;
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
  let ticks = 0;
  const state = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(15_000),
      Rx.tap((s) => {
        let balance = "0";
        try {
          balance = s.dust?.balance?.(new Date())?.toString() ?? "0";
        } catch {
          balance = "0";
        }
        ticks += 1;
        console.log(
          "dust coins",
          s.dust?.availableCoins?.length ?? 0,
          "pending",
          s.dust?.pendingCoins?.length ?? 0,
          "total",
          s.dust?.totalCoins?.length ?? 0,
          "balance",
          balance,
          "synced",
          s.isSynced,
          "dustProgress",
          fmtSyncProgress(s.dust?.progress),
        );
        if (ticks % 8 === 0) void persistOperatorWallet(wallet);
      }),
      Rx.filter((s) => (s.dust?.availableCoins?.length ?? 0) >= 1),
      Rx.timeout({ first: timeoutMs }),
    ),
  );
  await persistOperatorWallet(wallet);
  return state;
}
