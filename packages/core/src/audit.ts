import {
  CompactTypeBytes,
  CompactTypeUnsignedInteger,
  persistentCommit,
} from "@midnight-ntwrk/compact-runtime";
import { pureCircuits } from "@remit/contracts/pool";
import { bytesEq, toHex } from "./bytes.js";
import { RemitError } from "./errors.js";

export const AUDIT_FIELDS = ["side", "baseAmount", "quoteAmount", "principal", "counterparty", "mandateId"] as const;
export type AuditField = (typeof AUDIT_FIELDS)[number];

export type FieldOpening = {
  idx: number;
  field: AuditField;
  valueHex?: string;
  valueDec?: string;
  saltHex: string;
};

export type DisclosurePackage = {
  fillIndex: number;
  auditRootHex: string;
  commitmentsHex: string[];
  openings: FieldOpening[];
};

const U8 = new CompactTypeUnsignedInteger(255n, 1);
const U64 = new CompactTypeUnsignedInteger((1n << 64n) - 1n, 8);
const B32 = new CompactTypeBytes(32);

export function commitUint8(v: bigint, salt: Uint8Array): Uint8Array {
  return persistentCommit(U8, v, salt);
}
export function commitUint64(v: bigint, salt: Uint8Array): Uint8Array {
  return persistentCommit(U64, v, salt);
}
export function commitBytes32(v: Uint8Array, salt: Uint8Array): Uint8Array {
  return persistentCommit(B32, v, salt);
}

export function auditCommitments(seed: Uint8Array, values: {
  side: bigint;
  baseAmount: bigint;
  quoteAmount: bigint;
  principal: Uint8Array;
  counterparty: Uint8Array;
  mandateId: Uint8Array;
}): Uint8Array[] {
  const s = (i: number) => pureCircuits.fieldSalt(seed, BigInt(i));
  return [
    commitUint8(values.side, s(0)),
    commitUint64(values.baseAmount, s(1)),
    commitUint64(values.quoteAmount, s(2)),
    commitBytes32(values.principal, s(3)),
    commitBytes32(values.counterparty, s(4)),
    commitBytes32(values.mandateId, s(5)),
  ];
}

export function auditRoot(commits: Uint8Array[]): Uint8Array {
  if (commits.length !== 6) throw new RemitError("AUDIT", "audit vector must have 6 commitments");
  return pureCircuits.auditRootOf(commits as unknown as [
    Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array,
  ]);
}

export function makeDisclosure(
  fillIndex: number,
  seed: Uint8Array,
  values: Parameters<typeof auditCommitments>[1],
  indexes: number[],
): DisclosurePackage {
  const commitments = auditCommitments(seed, values);
  const root = auditRoot(commitments);
  const openings: FieldOpening[] = indexes.map((idx) => {
    const field = AUDIT_FIELDS[idx];
    const salt = pureCircuits.fieldSalt(seed, BigInt(idx));
    const o: FieldOpening = { idx, field, saltHex: toHex(salt) };
    if (idx === 0) o.valueDec = values.side.toString();
    else if (idx === 1) o.valueDec = values.baseAmount.toString();
    else if (idx === 2) o.valueDec = values.quoteAmount.toString();
    else if (idx === 3) o.valueHex = toHex(values.principal);
    else if (idx === 4) o.valueHex = toHex(values.counterparty);
    else o.valueHex = toHex(values.mandateId);
    return o;
  });
  return {
    fillIndex,
    auditRootHex: toHex(root),
    commitmentsHex: commitments.map(toHex),
    openings,
  };
}

function fromHex(h: string): Uint8Array {
  return Uint8Array.from(Buffer.from(h.replace(/^0x/, ""), "hex"));
}

export function verifyDisclosure(
  pkg: DisclosurePackage,
  onChainRoot: Uint8Array,
  opts?: { allowedFields?: readonly AuditField[]; expectedFillIndex?: number },
): { ok: boolean; failed: string[] } {
  const failed: string[] = [];
  if (opts?.expectedFillIndex != null && pkg.fillIndex !== opts.expectedFillIndex) failed.push("fill-index");
  if (opts?.allowedFields) {
    for (const o of pkg.openings) {
      if (!opts.allowedFields.includes(o.field)) failed.push(`unauthorized-${o.field}`);
    }
  }
  if (pkg.commitmentsHex.length !== 6) failed.push("commit-count");
  const commits = pkg.commitmentsHex.map(fromHex);
  let root: Uint8Array | undefined;
  try {
    root = auditRoot(commits);
  } catch {
    failed.push("auditRootOf");
    return { ok: false, failed };
  }
  if (!bytesEq(root, onChainRoot) || toHex(onChainRoot) !== pkg.auditRootHex) failed.push("root");
  for (const o of pkg.openings) {
    if (o.idx < 0 || o.idx > 5) {
      failed.push(`bad-idx-${o.idx}`);
      continue;
    }
    if (AUDIT_FIELDS[o.idx] !== o.field) failed.push(`field-${o.idx}`);
    const salt = fromHex(o.saltHex);
    let recomputed: Uint8Array;
    if (o.idx === 0) recomputed = commitUint8(BigInt(o.valueDec ?? "0"), salt);
    else if (o.idx === 1 || o.idx === 2) recomputed = commitUint64(BigInt(o.valueDec ?? "0"), salt);
    else recomputed = commitBytes32(fromHex(o.valueHex ?? ""), salt);
    if (!bytesEq(recomputed, commits[o.idx])) failed.push(`open-${o.idx}`);
  }
  return { ok: failed.length === 0, failed };
}
