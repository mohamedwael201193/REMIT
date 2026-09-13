export type RemitErrorCode =
  | "WITNESS_MISSING"
  | "POLICY_REJECT"
  | "UNAUTHORIZED"
  | "NETWORK_MISMATCH"
  | "DUST"
  | "FINALIZE"
  | "INDEXER"
  | "WALLET"
  | "SEALED_BOX"
  | "AUDIT"
  | "CONFIG"
  | "INTERNAL";

export class RemitError extends Error {
  readonly code: RemitErrorCode;
  readonly publicDetail?: string;
  constructor(code: RemitErrorCode, message: string, publicDetail?: string) {
    super(message);
    this.name = "RemitError";
    this.code = code;
    this.publicDetail = publicDetail;
  }
}

const SECRETISH = /(secret|mnemonic|seed|witness|salt|nonce|opening|sk\b|esk\b|psk\b)/i;

export function publicErrorMessage(err: unknown): string {
  if (err instanceof RemitError) return err.publicDetail ?? err.code;
  if (err instanceof Error) {
    if (SECRETISH.test(err.message)) return "operation failed";
    return err.message.slice(0, 180);
  }
  return "operation failed";
}

export function mapLedgerFailure(message: string): RemitError {
  if (message.includes("138") || /BalanceCheckOverspend/i.test(message)) {
    return new RemitError("DUST", "insufficient DUST", "insufficient DUST");
  }
  if (message.includes("111") || /TransactionTooLarge/i.test(message)) {
    return new RemitError("INTERNAL", "transaction too large", "transaction too large");
  }
  return new RemitError("INTERNAL", "ledger rejected transaction", "ledger rejected transaction");
}
