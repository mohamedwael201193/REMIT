export type WalletLike = {
  coinPublicKey: string;
  encryptionPublicKey: string;
  getCoinPublicKey?: () => string;
  getEncryptionPublicKey?: () => string;
  balanceTx: (...args: never[]) => Promise<unknown>;
  submitTx: (...args: never[]) => Promise<unknown>;
};
