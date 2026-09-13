/**
 * DUST registration for the operator wallet.
 * Asserts the derived unshielded address matches REMIT_OPERATOR_UNSHIELDED_ADDR
 * before submitting anything. Waits for spendable DUST coins, not merely balance>0.
 */
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

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const MNEMONIC = process.env.REMIT_OPERATOR_MNEMONIC;
const EXPECT = process.env.REMIT_OPERATOR_UNSHIELDED_ADDR;
if (!MNEMONIC || !EXPECT) {
  console.error("missing operator mnemonic or expected address in env");
  process.exit(1);
}

setNetworkId("preprod");

const CONFIG = {
  indexerHttpUrl: process.env.MIDNIGHT_INDEXER_URL!,
  indexerWsUrl: process.env.MIDNIGHT_INDEXER_WS!,
  node: process.env.MIDNIGHT_NODE_URL!,
  proofServer: process.env.MIDNIGHT_PROOF_SERVER_URL ?? "http://localhost:6300",
};

function deriveKeys(seed: Buffer) {
  const hd = HDWallet.fromSeed(seed);
  if (hd.type !== "seedOk") throw new Error("hd seed");
  const result = hd.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (result.type !== "keysDerived") throw new Error("derive");
  hd.hdWallet.clear();
  return result.keys;
}

async function main() {
  const seed = Buffer.from(mnemonicToSeedSync(MNEMONIC));
  const keys = deriveKeys(seed);
  const shieldedSecretKeys = ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], "preprod");
  const addr = unshieldedKeystore.getBech32Address().asString();
  console.log("derived unshielded address matches expected:", addr === EXPECT);
  if (addr !== EXPECT) {
    console.error("address mismatch — refusing to register. check derivation vs 1AM.");
    process.exit(2);
  }

  const shieldedConfig = {
    networkId: "preprod",
    indexerClientConnection: { indexerHttpUrl: CONFIG.indexerHttpUrl, indexerWsUrl: CONFIG.indexerWsUrl },
    provingServerUrl: new URL(CONFIG.proofServer),
    relayURL: new URL(CONFIG.node.replace(/^http/, "ws")),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
  };
  const unshieldedConfig = {
    networkId: "preprod",
    indexerClientConnection: { indexerHttpUrl: CONFIG.indexerHttpUrl, indexerWsUrl: CONFIG.indexerWsUrl },
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
  console.log("wallet started; waiting for unshielded sync (can take a long time on Preprod)");

  const nightRaw = unshieldedToken().raw;
  const synced = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(15_000),
      Rx.tap((s) => {
        const night = s.unshielded.balances[nightRaw] ?? 0n;
        const coins = s.unshielded.availableCoins?.length ?? 0;
        const dustCoins = s.dust?.availableCoins?.length ?? 0;
        const complete = s.unshielded.progress?.isStrictlyComplete?.() === true;
        console.log(
          "sync tick night=",
          night.toString(),
          "unshieldedCoins=",
          coins,
          "dustCoins=",
          dustCoins,
          "unshieldedComplete=",
          complete,
          "synced=",
          s.isSynced,
        );
      }),
      Rx.filter((s) => {
        const night = s.unshielded.balances[nightRaw] ?? 0n;
        const coins = s.unshielded.availableCoins ?? [];
        return s.unshielded.progress?.isStrictlyComplete?.() === true && coins.length > 0 && night > 0n;
      }),
      Rx.timeout({ first: 3 * 60 * 60_000 }),
    ),
  );

  const unregistered = synced.unshielded.availableCoins.filter((c: { utxo: { type: unknown }; meta?: { registeredForDustGeneration?: boolean } }) => {
    const t = c.utxo.type;
    const isNight = t === nightRaw || String(t) === String(nightRaw);
    return isNight && c.meta?.registeredForDustGeneration !== true;
  });
  console.log("unshielded coins", synced.unshielded.availableCoins.length, "unregistered NIGHT utxos:", unregistered.length);

  if (unregistered.length > 0) {
    const recipe = await wallet.registerNightUtxosForDustGeneration(
      unregistered,
      unshieldedKeystore.getPublicKey(),
      (payload: Uint8Array) => unshieldedKeystore.signData(payload),
    );
    const finalized = await wallet.finalizeRecipe(recipe);
    const txId = await wallet.submitTransaction(finalized);
    console.log("dust registration submitted", txId);
  } else {
    console.log("all NIGHT already registered");
  }

  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((s) => console.log("dust coins", s.dust?.availableCoins?.length ?? 0, "balance", s.dust?.balance?.(new Date())?.toString())),
      Rx.filter((s) => (s.dust?.availableCoins?.length ?? 0) >= 1),
      Rx.timeout({ first: 30 * 60_000 }),
    ),
  );
  console.log("spendable DUST ready");
  await wallet.stop();
}

main().catch((e) => {
  console.error("dust-register failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
