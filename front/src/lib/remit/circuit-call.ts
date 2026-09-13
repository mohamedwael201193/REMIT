/**
 * Loads the hosted Compact circuit bundle. Next must not statically import
 * compact-runtime / midnight-js; 1AM proving runs inside that bundle.
 */
export type CircuitBundle = {
  createMandateFromWallet: (args: unknown) => Promise<unknown>;
  revokeMandatesFromWallet: (args: unknown) => Promise<unknown>;
};

export async function loadRemitCircuitModule(apiUrl: string): Promise<CircuitBundle> {
  const root = apiUrl.replace(/\/$/, "");
  const candidates = [`${root}/browser/remit-circuit.js`, "/remit-circuit.js"];
  let last = "circuit bundle not hosted";
  for (const url of candidates) {
    try {
      const mod = (await import(/* webpackIgnore: true */ url)) as Partial<CircuitBundle>;
      if (typeof mod.createMandateFromWallet === "function" && typeof mod.revokeMandatesFromWallet === "function") {
        return mod as CircuitBundle;
      }
      last = `${url} missing createMandateFromWallet/revokeMandatesFromWallet`;
    } catch (e) {
      last = e instanceof Error ? e.message : last;
    }
  }
  throw new Error(
    `On-chain Compact circuits for this tab are served from ${root}/browser/remit-circuit.js (1AM getProvingProvider or Lace proof-server 8.1.0). ${last}`,
  );
}
