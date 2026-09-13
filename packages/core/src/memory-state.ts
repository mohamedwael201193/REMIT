import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import { RemitError } from "./errors.js";

/**
 * Session-scoped private state. No Node filesystem, no WalletFacade.
 * Does not persist secrets to localStorage.
 */
export function inMemoryPrivateStateProvider<PSI extends string = string, PS = unknown>(): PrivateStateProvider<PSI, PS> {
  let scoped: string | undefined;
  const states = new Map<string, PS>();
  const keys = new Map<string, unknown>();

  const requireScope = () => {
    if (!scoped) throw new RemitError("CONFIG", "private-state contract address not set");
    return scoped;
  };

  return {
    setContractAddress(address: ContractAddress) {
      scoped = String(address);
    },
    async set(privateStateId, state) {
      states.set(`${requireScope()}:${String(privateStateId)}`, state);
    },
    async get(privateStateId) {
      return states.get(`${requireScope()}:${String(privateStateId)}`) ?? null;
    },
    async remove(privateStateId) {
      states.delete(`${requireScope()}:${String(privateStateId)}`);
    },
    async clear() {
      const prefix = `${requireScope()}:`;
      for (const k of [...states.keys()]) if (k.startsWith(prefix)) states.delete(k);
    },
    async setSigningKey(address, signingKey) {
      keys.set(String(address), signingKey);
    },
    async getSigningKey(address) {
      return (keys.get(String(address)) as never) ?? null;
    },
    async removeSigningKey(address) {
      keys.delete(String(address));
    },
    async clearSigningKeys() {
      keys.clear();
    },
    async exportPrivateStates() {
      throw new RemitError("CONFIG", "in-memory private state is not exported");
    },
    async importPrivateStates() {
      throw new RemitError("CONFIG", "in-memory private state is not imported");
    },
    async exportSigningKeys() {
      throw new RemitError("CONFIG", "in-memory signing keys are not exported");
    },
    async importSigningKeys() {
      throw new RemitError("CONFIG", "in-memory signing keys are not imported");
    },
  };
}
