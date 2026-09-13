import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { RemitError } from "@remit/core";
import type { WalletLike } from "@remit/core";

/**
 * Wrap a DApp-connector v4 ConnectedAPI as the midnight-js WalletProvider shape.
 * Does not open a WalletFacade. Coin keys come from the injected wallet only.
 */
export async function connectorAsWalletProvider(wallet: ConnectedAPI): Promise<WalletLike> {
  let coinPublicKey = "";
  let encryptionPublicKey = "";
  try {
    const shielded = await wallet.getShieldedAddresses();
    coinPublicKey = shielded.shieldedCoinPublicKey ?? "";
    encryptionPublicKey = shielded.shieldedEncryptionPublicKey ?? "";
  } catch {
    throw new RemitError("WALLET", "connector did not return shielded coin keys", "no coin public key");
  }
  if (!coinPublicKey || !encryptionPublicKey) {
    throw new RemitError("WALLET", "connector did not return shielded coin keys", "no coin public key");
  }
  return {
    coinPublicKey,
    encryptionPublicKey,
    balanceTx: async (tx: never) => {
      const balanced = await wallet.balanceUnsealedTransaction(tx as never);
      return (balanced as { tx?: unknown }).tx ?? balanced;
    },
    submitTx: async (tx: never) => {
      await wallet.submitTransaction(tx as never);
      return "submitted";
    },
  };
}
