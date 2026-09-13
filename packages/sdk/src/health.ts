export type RemitPublicHealth = {
  ok: boolean;
  network?: string;
  pool?: string;
  quote?: string;
  mpc?: boolean;
  dustGate?: string;
  rfqPublic?: string | null;
};

/** Public health only. Never treat empty pool/quote as a deployed contract. */
export async function fetchRemitHealth(apiUrl: string): Promise<RemitPublicHealth> {
  const res = await fetch(new URL("/health", apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`));
  if (!res.ok) throw new Error(`health ${res.status}`);
  return (await res.json()) as RemitPublicHealth;
}

export function contractsDeployed(h: RemitPublicHealth): boolean {
  return Boolean(h.pool && h.quote && h.ok);
}
