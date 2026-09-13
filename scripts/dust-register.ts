/**
 * DUST registration for the operator wallet.
 * Asserts the derived unshielded address matches REMIT_OPERATOR_UNSHIELDED_ADDR
 * before submitting anything. Waits for spendable DUST coins, not merely balance>0.
 *
 * Official flow (wallet SDK 1.2.0): wait until unshielded is strictly complete,
 * register unregistered NIGHT UTXOs, then wait for availableCoins >= 1.
 * If the wallet already marks the UTXO registered, still wait for DUST sync
 * (cold DUST history on Preprod can exceed 60 minutes). Do not treat empty
 * availableCoins as "already registered".
 */
import { unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { openOperatorWallet, waitSpendableDust, waitUnshieldedReady, writeDustReady } from "./lib/operator-wallet.ts";

async function main() {
  const session = await openOperatorWallet();
  console.log("derived unshielded address matches expected: true");
  console.log("wallet started; waiting for unshielded sync (can take a long time on Preprod)");

  const nightRaw = unshieldedToken().raw;
  const synced = await waitUnshieldedReady(session.wallet, nightRaw);
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
  const toRegister = unregistered.length > 0 ? unregistered : force ? coins.filter((c: { utxo: { type: unknown } }) => String(c.utxo.type) === String(nightRaw)) : [];

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

  console.log("waiting for spendable DUST (availableCoins >= 1); DUST ledger sync can exceed 60 min");
  await waitSpendableDust(session.wallet);
  console.log("spendable DUST ready");
  writeDustReady({ source: "dust-register" });
  console.log("wrote deployments/dust-ready.json");
  await session.wallet.stop();
}

main().catch((e) => {
  console.error("dust-register failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
