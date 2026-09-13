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
import { RemitNodeWallet } from "../../packages/core/src/node-wallet.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env.preprod.local") });

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
