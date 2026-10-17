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

function failureText(e: unknown): string {
  if (e instanceof RemitError) return e.message;
  const parts: string[] = [];
  if (e instanceof Error) parts.push(e.message);
  const extra = e as { finalizedTxData?: { status?: string }; circuitId?: string; cause?: unknown };
  if (extra.finalizedTxData?.status) parts.push(`status=${extra.finalizedTxData.status}`);
  if (extra.circuitId) parts.push(`circuit=${String(extra.circuitId)}`);
  if (extra.cause instanceof Error) parts.push(extra.cause.message);
  return parts.join(" ").replace(/\s+/g, " ").slice(0, 240);
}

export async function submitCircuit(
  providers: Providers,
  options: {
    contractAddress: string;
    compiledContract: unknown;
    circuitId: string;
    args?: unknown[];
    privateStateId?: string;
  },
): Promise<FinalizedEvidence> {
  try {
    const result = await submitCallTx(providers, options as never);
    return asEvidence(
      result as unknown as Record<string, unknown>,
      options.contractAddress,
    );
  } catch (e) {
    if (e instanceof RemitError) throw e;
    const msg = failureText(e);
    if (/assert|failed to prove|Constraint/i.test(msg) && !/not staged/i.test(msg)) {
      throw new RemitError("POLICY_REJECT", "circuit rejected the call", msg);
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

// ---------------------------------------------------------------------------
// Circuit-call binding sync (Wave 2 N3).
//
// After artifact regen, the generated bindings' circuit IDs and public
// argument signatures must match what this path calls. Drift = a circuit
// renamed, removed, or re-signed in the Compact source without the callers
// being updated — which would otherwise surface as an obscure prover or
// submit failure. Fail LOUD here instead of debugging a dead proof.
//
// The registry below is the single source of truth for "what tx.ts calls".
// `verifyGeneratedBindings` snapshots the real generated artifacts (the
// Contract class's impure/provable circuit maps + contract-info.json when
// available) and throws a BINDING_DRIFT RemitError on any mismatch.
// Run it in tests and at deploy/boot time right after artifact regen.
// ---------------------------------------------------------------------------

export type CircuitBindingExpectation = {
  contractName: "remit_pool" | "remit_quote";
  /** circuitId as passed to submitCircuit */
  circuitId: string;
  /** must be present in the generated impureCircuits (callable through this path) */
  impure: boolean;
  /** must be present in the generated provableCircuits */
  provable: boolean;
  /** expected public argument names in order (from contract-info.json) */
  argNames: string[];
};

export const CIRCUIT_BINDINGS: CircuitBindingExpectation[] = [
  // remit_pool — 7 impure circuits (pool header forbids an 8th; C5 confirmed unchanged).
  { contractName: "remit_pool", circuitId: "deposit", impure: true, provable: true, argNames: ["asset", "amount"] },
  { contractName: "remit_pool", circuitId: "withdraw", impure: true, provable: true, argNames: ["asset", "amount"] },
  { contractName: "remit_pool", circuitId: "placeOffer", impure: true, provable: true, argNames: [] },
  { contractName: "remit_pool", circuitId: "cancelOffer", impure: true, provable: true, argNames: [] },
  { contractName: "remit_pool", circuitId: "createMandate", impure: true, provable: true, argNames: [] },
  { contractName: "remit_pool", circuitId: "revokeMandate", impure: true, provable: true, argNames: [] },
  { contractName: "remit_pool", circuitId: "fill", impure: true, provable: true, argNames: ["nowBound"] },
  // remit_quote — 2 circuits + discloseField (Wave 2 N1). Re-verify argNames against
  // the regenerated contract-info.json after CONTRACT-3 regen (c3.done).
  { contractName: "remit_quote", circuitId: "quoteColor", impure: true, provable: true, argNames: [] },
  { contractName: "remit_quote", circuitId: "claim", impure: true, provable: true, argNames: ["amount", "dayBucket", "to"] },
  // N1 rename ruling (compile hazard, verified 2026-10-17): the v2 spec name
  // `disclose` is a RESERVED KEYWORD in Compact 0.31.1, so the circuit shipped
  // as `discloseField` (1:1 rename). The binding-sync check pins THIS name —
  // if a future regen renames it again, the check fails LOUD here.
  { contractName: "remit_quote", circuitId: "discloseField", impure: true, provable: true, argNames: ["fieldSelector", "auditorKey", "sealedBox"] },
];

export type GeneratedCircuitSnapshot = {
  circuitId: string;
  impure: boolean;
  provable: boolean;
  /** public arg names from contract-info.json; null when the manifest is unavailable (browser) */
  argNames: string[] | null;
};

export type BindingContractClass = new (witnesses: unknown) => {
  impureCircuits: Record<string, unknown>;
  provableCircuits: Record<string, unknown>;
};

export type ContractInfoManifest = {
  circuits?: { name?: string; arguments?: { name?: string }[] }[];
};

/**
 * Snapshot the real generated artifacts for one contract: circuit IDs from the
 * generated Contract class (the binding itself — works in Node and browser),
 * plus public argument names from contract-info.json when available (Node).
 */
export function snapshotGeneratedBindings(opts: {
  contractClass: BindingContractClass;
  witnesses: unknown;
  contractInfo?: ContractInfoManifest;
}): GeneratedCircuitSnapshot[] {
  const instance = new opts.contractClass(opts.witnesses);
  const impureIds = new Set(Object.keys(instance.impureCircuits ?? {}));
  const provableIds = new Set(Object.keys(instance.provableCircuits ?? {}));
  const manifestArgs = new Map<string, string[]>();
  for (const c of opts.contractInfo?.circuits ?? []) {
    if (c?.name) manifestArgs.set(c.name, (c.arguments ?? []).map((a) => String(a?.name ?? "")));
  }
  const ids = new Set<string>([...impureIds, ...provableIds, ...manifestArgs.keys()]);
  return [...ids].map((circuitId) => ({
    circuitId,
    impure: impureIds.has(circuitId),
    provable: provableIds.has(circuitId),
    argNames: manifestArgs.has(circuitId) ? (manifestArgs.get(circuitId) as string[]) : null,
  }));
}

/**
 * Fail LOUD if the generated bindings drifted from what this path calls.
 * Throws RemitError("INTERNAL") with a BINDING_DRIFT message and a full diff.
 * Extra generated circuits that tx.ts never calls are reported but do not fail.
 */
export function assertCircuitBindingsSynced(
  contractName: "remit_pool" | "remit_quote",
  snapshot: GeneratedCircuitSnapshot[],
): void {
  const expected = CIRCUIT_BINDINGS.filter((b) => b.contractName === contractName);
  const byId = new Map(snapshot.map((s) => [s.circuitId, s]));
  const problems: string[] = [];
  for (const e of expected) {
    const g = byId.get(e.circuitId);
    if (!g) {
      problems.push(`missing circuit "${e.circuitId}" in generated bindings`);
      continue;
    }
    if (e.impure && !g.impure) problems.push(`circuit "${e.circuitId}" not in generated impureCircuits`);
    if (e.provable && !g.provable) problems.push(`circuit "${e.circuitId}" not in generated provableCircuits`);
    if (g.argNames !== null) {
      const same =
        g.argNames.length === e.argNames.length && g.argNames.every((a, i) => a === e.argNames[i]);
      if (!same) {
        problems.push(
          `signature drift on "${e.circuitId}": tx.ts expects (${e.argNames.join(", ") || "no args"}), ` +
            `generated bindings have (${g.argNames.join(", ") || "no args"})`,
        );
      }
    }
  }
  const expectedIds = new Set(expected.map((e) => e.circuitId));
  const extras = snapshot.filter((s) => s.impure && !expectedIds.has(s.circuitId)).map((s) => s.circuitId);
  if (problems.length > 0) {
    const extraNote = extras.length
      ? `\n  extra generated impure circuits (not called by tx.ts): ${extras.join(", ")}`
      : "";
    throw new RemitError(
      "INTERNAL",
      `BINDING_DRIFT: circuit-call binding drift on ${contractName}:\n  - ${problems.join("\n  - ")}${extraNote}\n` +
        `Regenerate the artifacts from the current Compact source, or update CIRCUIT_BINDINGS in tx.ts.`,
    );
  }
}

/**
 * One-call binding-sync check: snapshot the real artifacts, then fail LOUD on drift.
 * Call this in tests and at deploy/boot time right after artifact regen.
 */
export function verifyGeneratedBindings(opts: {
  contractName: "remit_pool" | "remit_quote";
  contractClass: BindingContractClass;
  witnesses: unknown;
  contractInfo?: ContractInfoManifest;
}): void {
  assertCircuitBindingsSynced(opts.contractName, snapshotGeneratedBindings(opts));
}

// ---------------------------------------------------------------------------
// discloseField() — Wave 2 N1 circuit on the quote contract.
//
// Wired through the SAME single circuit-call path as every other circuit:
// submitDiscloseField → submitCircuit → (intent → build → prove → balance →
// submit → finalize → indexer-truth-gate) via submitCallTx + asEvidence.
// The v2 spec name `disclose` is a reserved keyword in Compact 0.31.1, so
// the circuit shipped as `discloseField` (1:1 rename — see the registry).
// Witness staging is the caller's job (the private-state provider), exactly
// as pool callers stage via submitStagedCircuit before submitCircuit.
// ---------------------------------------------------------------------------

export type DiscloseFieldCallArgs = {
  contractAddress: string;
  compiledContract: unknown;
  privateStateId?: string;
  /** public: which audit field is being disclosed (Uint<8>, must be < 6) */
  fieldSelector: bigint;
  /** public: auditor encryption key the field is sealed to (Bytes<32>) */
  auditorKey: Uint8Array;
  /** public: RMTB1 sealed box, zero-padded to 160 bytes (Bytes<160>) */
  sealedBox: Uint8Array;
};

export async function submitDiscloseField(
  providers: Providers,
  args: DiscloseFieldCallArgs,
): Promise<FinalizedEvidence> {
  return submitCircuit(providers, {
    contractAddress: args.contractAddress,
    compiledContract: args.compiledContract,
    circuitId: "discloseField",
    args: [args.fieldSelector, args.auditorKey, args.sealedBox],
    ...(args.privateStateId ? { privateStateId: args.privateStateId } : {}),
  });
}
