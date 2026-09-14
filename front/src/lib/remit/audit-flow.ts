/**
 * Auditor flow grammar. A transaction hash is not an auditRoot.
 * Verified requires verifyDisclosure against the on-chain auditRoots head.
 */

import type { AuditFlowState, AuditRecord, Disclosure, DisclosureState } from "./types";

const HEX = /^[0-9a-f]+$/i;

export function normalizeHex(value: string): string {
  return value.trim().replace(/^0x/i, "").toLowerCase();
}

/** True when `auditRoot` is actually a known fill/mandate tx hash. */
export function isTxHashLabeledAsAuditRoot(
  auditRoot: string | undefined,
  forbiddenHashes: Array<string | undefined>,
): boolean {
  const root = normalizeHex(auditRoot ?? "");
  if (!root || root.length < 16 || !HEX.test(root)) return false;
  return forbiddenHashes.some((hash) => {
    const n = normalizeHex(hash ?? "");
    return n.length > 0 && n === root;
  });
}

/** Real on-chain audit root only. Empty or tx-hash collisions are not opened. */
export function openedAuditRoot(
  auditRoot: string | undefined,
  forbiddenHashes: Array<string | undefined> = [],
): string | null {
  const v = (auditRoot ?? "").trim();
  if (!v) return null;
  if (isTxHashLabeledAsAuditRoot(v, forbiddenHashes)) return null;
  return v;
}

/** Copy GET /audit/head onto desk records only when it is a real root, not a fill hash. */
export function chainAuditRootFromHead(
  headRoot: string | null | undefined,
  fillHashes: Array<string | undefined> = [],
): string {
  return openedAuditRoot(headRoot ?? "", fillHashes) ?? "";
}

export function disclosureFlow(state: DisclosureState, requested: boolean): AuditFlowState {
  if (state === "verified") return "verified";
  if (state === "revealed") return "revealed";
  if (state === "requested" || requested) return "requested";
  return "sealed";
}

/**
 * Record-level desk state.
 * VERIFIED only when proofStatus is verified AND a real auditRoot is present
 * (not a tx hash, not empty). A hash alone never verifies.
 */
export function recordAuditFlow(
  record: AuditRecord,
  requestedIds: ReadonlySet<string> = new Set(),
  forbiddenHashes: Array<string | undefined> = [],
): AuditFlowState {
  const root = openedAuditRoot(record.auditRoot, forbiddenHashes);
  if (record.proofStatus === "verified" && root) return "verified";
  if (record.disclosures.some((d) => d.state === "revealed")) return "revealed";
  if (
    record.disclosures.some((d) => d.state === "requested" || requestedIds.has(d.id))
  ) {
    return "requested";
  }
  return "sealed";
}

export const AUDIT_FLOW_COPY: Record<AuditFlowState, string> = {
  sealed: "SEALED",
  requested: "REQUESTED",
  revealed: "REVEALED",
  verified: "VERIFIED",
};

export function countDisclosures(
  records: AuditRecord[],
  requestedIds: ReadonlySet<string> = new Set(),
): Record<AuditFlowState, number> {
  const counts: Record<AuditFlowState, number> = {
    sealed: 0,
    requested: 0,
    revealed: 0,
    verified: 0,
  };
  for (const record of records) {
    counts[recordAuditFlow(record, requestedIds)] += 1;
  }
  return counts;
}

export function sealedDisclosures(record: AuditRecord): Disclosure[] {
  return record.disclosures.filter((d) => d.state === "sealed");
}
