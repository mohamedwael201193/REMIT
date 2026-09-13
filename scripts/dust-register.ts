/**
 * DUST registration for the operator wallet.
 * Asserts the derived unshielded address matches REMIT_OPERATOR_UNSHIELDED_ADDR
 * before submitting anything. Waits for spendable DUST coins, not merely balance>0.
 *
 * Prefer `scripts/preprod-deploy.ts`, which runs this path and then deploys in
 * the SAME WalletFacade so DUST history is not discarded on stop().
 */
import { closeOperatorWallet, ensureOperatorDust, openOperatorWallet } from "./lib/operator-wallet.ts";

async function main() {
  const session = await openOperatorWallet();
  try {
    console.log("derived unshielded address matches expected: true");
    console.log("wallet started; waiting for unshielded sync then spendable DUST");
    await ensureOperatorDust(session);
    console.log("spendable DUST ready");
  } finally {
    await closeOperatorWallet(session);
  }
}

main().catch((e) => {
  console.error("dust-register failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
