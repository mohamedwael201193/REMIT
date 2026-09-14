/**
 * Restore-only operator wallet diagnostics. No prove, no submit, no genesis.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeOperatorWallet,
  openOperatorWallet,
  snapshotOperatorDiagnostics,
  waitForOperatorWalletUnlocked,
  waitForPreprodDeployFile,
  waitUntilSynced,
} from "./lib/operator-wallet.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
process.env.REMIT_DEPLOY_FILE ??= "deployments/preprod-mbbe.json";

async function main() {
  await waitForOperatorWalletUnlocked();
  const deployed = await waitForPreprodDeployFile();
  const session = await openOperatorWallet();
  try {
    const wallet = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    console.log(JSON.stringify({ wallet }, null, 2));
    if (wallet.restored !== true) process.exit(1);
    const synced = await waitUntilSynced(session.wallet, 15 * 60_000);
    const after = await snapshotOperatorDiagnostics(session, deployed.pool.address);
    console.log(JSON.stringify({ wallet: after, waitedForSync: synced }, null, 2));
    if (after.restored !== true) process.exit(1);
  } finally {
    await closeOperatorWallet(session);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
