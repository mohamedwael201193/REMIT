import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { RemitError } from "@remit/core";
import type { WalletLike } from "@remit/core";

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new RemitError("WALLET", "odd hex from connector", "odd hex");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Connector v4 balance/submit take hex strings, not ledger objects. */
export function connectorTxHex(tx: { serialize: () => Uint8Array } | string): string {
  if (typeof tx === "string") return tx.replace(/^0x/i, "");
  return bytesToHex(tx.serialize());
}

function deserializeSealed(hex: string) {
  return Transaction.deserialize("signature", "proof", "binding", hexToBytes(hex));
}

/**
 * Wrap a DApp-connector v4 ConnectedAPI as midnight-js WalletProvider + MidnightProvider.
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
  const balanceTx = async (tx: never) => {
    const received = await wallet.balanceUnsealedTransaction(connectorTxHex(tx));
    return deserializeSealed(received.tx);
  };
  const submitTx = async (tx: never) => {
    await wallet.submitTransaction(connectorTxHex(tx));
    const ids = (tx as { identifiers?: () => string[] }).identifiers?.();
    return ids?.[0] ?? "submitted";
  };
  return {
    coinPublicKey,
    encryptionPublicKey,
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: balanceTx as WalletLike["balanceTx"],
    submitTx: submitTx as WalletLike["submitTx"],
  };
}
