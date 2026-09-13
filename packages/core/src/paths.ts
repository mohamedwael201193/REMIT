import { ledger, pureCircuits, type Mandate, type Offer } from "@remit/contracts/pool";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { RemitError } from "./errors.js";
import { toArray, fromHex } from "./bytes.js";
import type { JsonPath, OwnedNoteLike } from "./state.js";

export type MerklePathIn = {
  leaf: Uint8Array;
  path: { sibling: { field: bigint }; goes_left: boolean }[];
};

export function jsonPath(p: MerklePathIn): JsonPath {
  return {
    leaf: toArray(p.leaf),
    path: p.path.map((e) => ({ sibling: { field: e.sibling.field.toString() }, goes_left: e.goes_left })),
  };
}

export type PoolLedger = ReturnType<typeof ledger>;

/** Indexer `contractAction.state` is Compact `ContractState.serialize()` hex. */
export function contractStateFromHex(stateHex: string): ContractState {
  const raw = fromHex(stateHex.replace(/^0x/i, ""));
  try {
    return ContractState.deserialize(raw);
  } catch (e) {
    throw new RemitError(
      "INDEXER",
      e instanceof Error ? e.message : "contract state deserialize failed",
      "indexer contract state unreadable",
    );
  }
}

export function poolLedgerFromContractState(cs: ContractState): PoolLedger {
  return ledger(cs.data);
}

export function poolLedgerFromStateHex(stateHex: string): PoolLedger {
  return poolLedgerFromContractState(contractStateFromHex(stateHex));
}

export function requireLeafPath(
  tree: { findPathForLeaf(leaf: Uint8Array): MerklePathIn | undefined },
  leaf: Uint8Array,
  label: string,
): JsonPath {
  const p = tree.findPathForLeaf(leaf);
  if (!p) throw new RemitError("INTERNAL", `${label} not in historic Merkle tree`);
  return jsonPath(p);
}

export function noteLeaf(note: OwnedNoteLike, nonce: Uint8Array): Uint8Array {
  return pureCircuits.noteCommitment(
    { asset: note.asset, amount: note.amount, owner: note.owner },
    nonce,
  );
}

export function offerLeaf(offer: Offer, rand: Uint8Array): Uint8Array {
  return pureCircuits.offerCommitment(offer, rand);
}

export function mandateLeaf(mandate: Mandate, rand: Uint8Array): Uint8Array {
  return pureCircuits.mandateCommitment(mandate, rand);
}

export function mandateStateLeaf(mandateId: Uint8Array, remaining: bigint, nonce: Uint8Array): Uint8Array {
  return pureCircuits.mandateStateCommitment({ mandateId, remaining }, nonce);
}
