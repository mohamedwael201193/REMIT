/**
 * Sanitized wallet timings. Never logs seeds, witnesses, addresses, or private state.
 */
export type WalletDiagEvent = {
  event: string;
  kind?: string;
  networkId?: string;
  ms?: number;
  ok?: boolean;
  err?: string;
  code?: string;
  flags?: Record<string, boolean | string | null | undefined>;
};

export function walletDiag(entry: WalletDiagEvent): void {
  try {
    console.info("[remit-wallet]", JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

export function sanitizeConnectorError(error: unknown): { err: string; code?: string } {
  const rec = error as { message?: string; reason?: string; code?: string; type?: string; _tag?: string };
  const raw = String(rec?.reason ?? rec?.message ?? error ?? "wallet error");
  const err = raw
    .replace(/mn_[a-z0-9_]+/gi, "mn_[redacted]")
    .replace(/\b[0-9a-f]{64}\b/gi, "[hash]")
    .slice(0, 180);
  const code = rec?.code ?? rec?._tag ?? rec?.type;
  return { err, code: typeof code === "string" ? code : undefined };
}

export function classifyWalletMethodError(error: unknown): "unavailable" | "rejected" | "timeout" | "other" {
  const { err, code } = sanitizeConnectorError(error);
  const blob = `${err} ${code ?? ""}`.toLowerCase();
  if (/timeout|did not resolve|did not complete|timed out/.test(blob)) return "timeout";
  if (/rejected|permission/.test(blob)) return "rejected";
  if (/unavailable|disconnected|not initialized|authenticator|shutdown|wallet is unavailable/.test(blob)) {
    return "unavailable";
  }
  return "other";
}

export async function withBudget<T>(label: string, ms: number, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  walletDiag({ event: `${label}-start` });
  try {
    const value = await Promise.race([
      run(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
      ),
    ]);
    walletDiag({ event: `${label}-end`, ms: Date.now() - started, ok: true });
    return value;
  } catch (error) {
    const { err, code } = sanitizeConnectorError(error);
    walletDiag({ event: `${label}-end`, ms: Date.now() - started, ok: false, err, code });
    throw error;
  }
}
