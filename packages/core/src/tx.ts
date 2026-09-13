/**
 * ONE canonical circuit-call path for Node executor and browser adapters:
 * intent → build → prove → balance → submit → finalize → indexer truth gate.
 *
 * Both wallets and the agent must call `submitCircuit` / `deployCompiled`.
 * Do not duplicate midnight-js wiring elsewhere.
 */
import {
  deployContract,
  findDeployedContract,
  submitCallTx,
  type ContractProviders,
} from "@midnight-ntwrk/midnight-js-contracts";
import { RemitError, mapLedgerFailure } from "./errors.js";

export const CIRCUIT_CALL_PATH = [
  "intent",
  "build",
  "prove",
  "balance",
  "submit",
  "finalize",
  "indexer-truth-gate",
] as const;

export type CircuitCallStep = (typeof CIRCUIT_CALL_PATH)[number];

export type FinalizedEvidence = {
  txId: string;
  txHash?: string;
  blockHash?: string;
  blockHeight?: number;
  status: string;
  contractAddress?: string;
  protocolVersion?: number;
};

// midnight-js Contract.Any is an Effect namespace constraint; keep this façade unparameterized.
type Providers = ContractProviders<any>;

function asEvidence(data: Record<string, unknown>, contractAddress?: string): FinalizedEvidence {
  const publicData = (data.public as Record<string, unknown> | undefined) ?? data;
  const status = String(publicData.status ?? data.status ?? "unknown");
  if (status && status !== "SucceedEntirely" && status !== "SUCCESS") {
    throw new RemitError("FINALIZE", "transaction did not succeed entirely", status);
  }
  return {
    txId: String(publicData.txId ?? data.txId ?? ""),
    txHash: publicData.txHash ? String(publicData.txHash) : undefined,
    blockHash: publicData.blockHash ? String(publicData.blockHash) : undefined,
    blockHeight: typeof publicData.blockHeight === "number" ? publicData.blockHeight : undefined,
    status,
    contractAddress,
    protocolVersion: typeof publicData.protocolVersion === "number" ? publicData.protocolVersion : undefined,
  };
}

export async function deployCompiled(
  providers: Providers,
  options: Parameters<typeof deployContract>[1],
): Promise<{
  contractAddress: string;
  evidence: FinalizedEvidence;
  deployed: Awaited<ReturnType<typeof deployContract>>;
}> {
  try {
    const deployed = await deployContract(providers, options);
    const publicData = deployed.deployTxData.public as unknown as Record<string, unknown>;
    const contractAddress = String(publicData.contractAddress ?? "");
    if (!contractAddress) throw new RemitError("FINALIZE", "deploy missing contract address");
    return {
      contractAddress,
      evidence: asEvidence(deployed.deployTxData as unknown as Record<string, unknown>, contractAddress),
      deployed,
    };
  } catch (e) {
    if (e instanceof RemitError) throw e;
    throw mapLedgerFailure(e instanceof Error ? e.message : "deploy failed");
  }
}

export async function submitCircuit(
  providers: Providers,
  options: Parameters<typeof submitCallTx>[1],
): Promise<FinalizedEvidence> {
  try {
    const result = await submitCallTx(providers, options);
    return asEvidence(
      result as unknown as Record<string, unknown>,
      String((options as { contractAddress?: string }).contractAddress ?? ""),
    );
  } catch (e) {
    if (e instanceof RemitError) throw e;
    const msg = e instanceof Error ? e.message : "call failed";
    if (/assert|failed to prove|Constraint/i.test(msg)) {
      throw new RemitError("POLICY_REJECT", "circuit rejected the call", "circuit rejected");
    }
    throw mapLedgerFailure(msg);
  }
}

export async function bindDeployed(
  providers: Providers,
  options: Parameters<typeof findDeployedContract>[1],
) {
  return findDeployedContract(providers, options);
}
