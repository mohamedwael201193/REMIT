/**
 * Loads the hosted Compact circuit bundle. Next must not statically import
 * compact-runtime / midnight-js; 1AM proving runs inside that bundle.
 */
export type CircuitBundle = {
  createMandateFromWallet: (args: unknown) => Promise<unknown>;
  revokeMandatesFromWallet: (args: unknown) => Promise<unknown>;
  placeOfferFromWallet: (args: unknown) => Promise<unknown>;
  withdrawFromWallet?: (args: unknown) => Promise<unknown>;
};

export async function loadRemitCircuitModule(apiUrl: string): Promise<CircuitBundle> {
  const root = apiUrl.replace(/\/$/, "");
  const url = `${root}/browser/remit-circuit.js?v=ps4`;
  try {
    const mod = (await import(/* webpackIgnore: true */ url)) as Partial<CircuitBundle>;
    if (
      typeof mod.createMandateFromWallet === "function" &&
      typeof mod.revokeMandatesFromWallet === "function" &&
      typeof mod.placeOfferFromWallet === "function"
    ) {
      return mod as CircuitBundle;
    }
    throw new Error(`${url} missing createMandateFromWallet/revokeMandatesFromWallet/placeOfferFromWallet`);
  } catch (e) {
    const last = e instanceof Error ? e.message : "circuit bundle not hosted";
    throw new Error(
      `On-chain Compact circuits for this tab are served from ${url} (1AM getProvingProvider or Lace proof-server 8.1.0). ${last}`,
    );
  }
}
