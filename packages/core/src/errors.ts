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
  const clipped = message.replace(/\s+/g, " ").slice(0, 220);
  if (clipped.includes("138") || /BalanceCheckOverspend/i.test(clipped)) {
    return new RemitError("DUST", "insufficient DUST", clipped);
  }
  if (clipped.includes("111") || /TransactionTooLarge/i.test(clipped)) {
    return new RemitError("INTERNAL", "transaction too large", clipped);
  }
  if (/Incorrect call transaction configuration|privateStateId/i.test(clipped)) {
    return new RemitError("CONFIG", clipped, clipped);
  }
  if (/not staged|WITNESS_MISSING|Cannot read properties of undefined/i.test(clipped)) {
    return new RemitError("WITNESS_MISSING", clipped, clipped);
  }
  return new RemitError("INTERNAL", clipped || "ledger rejected transaction", clipped || "ledger rejected transaction");
}
