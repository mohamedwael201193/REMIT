import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import type { ContractProviders } from "@midnight-ntwrk/midnight-js-contracts";
import { emptyPrivateState, type RemitPrivateState } from "./state.js";
import { stage } from "./witnesses.js";
import { submitCircuit, type FinalizedEvidence } from "./tx.js";

type Providers = ContractProviders<any>;

export async function stagePending(
  providers: Providers,
  contractAddress: string,
  privateStateId: string,
  patch: RemitPrivateState["pending"],
  fallback: RemitPrivateState,
): Promise<RemitPrivateState> {
  providers.privateStateProvider.setContractAddress(contractAddress as ContractAddress);
  const current = ((await providers.privateStateProvider.get(privateStateId)) as RemitPrivateState | null) ?? fallback;
  const next: RemitPrivateState = {
    ...stage(current, patch),
    ownerSk: patch.ownerSecret ?? current.ownerSk,
    executorSk: patch.executorSecret ?? current.executorSk,
  };
  await providers.privateStateProvider.set(privateStateId, next);
  return next;
}

export async function submitStagedCircuit(
  providers: Providers,
  args: {
    contractAddress: string;
    compiledContract: unknown;
    privateStateId: string;
    circuitId: string;
    circuitArgs: unknown[];
    pending: RemitPrivateState["pending"];
    fallback?: RemitPrivateState;
  },
): Promise<FinalizedEvidence> {
  await stagePending(
    providers,
    args.contractAddress,
    args.privateStateId,
    args.pending,
    args.fallback ?? emptyPrivateState("onchain"),
  );
  return submitCircuit(providers, {
    contractAddress: args.contractAddress,
    compiledContract: args.compiledContract,
    circuitId: args.circuitId,
    args: args.circuitArgs,
  } as never);
}
