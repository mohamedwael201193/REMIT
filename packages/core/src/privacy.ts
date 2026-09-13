import { createHash } from "node:crypto";
import { encodingsOfBigint, encodingsOfBytes, toHex } from "./bytes.js";

export function dumpPublicLedger(ledger: {
  quoteColor: Uint8Array;
  openOffers: bigint;
  activeMandates: bigint;
  fills: bigint;
  noteNullifiers: { [Symbol.iterator](): Iterator<Uint8Array> };
  offerNullifiers: { [Symbol.iterator](): Iterator<Uint8Array> };
  mandateRevoked: { [Symbol.iterator](): Iterator<Uint8Array> };
  auditRoots: { [Symbol.iterator](): Iterator<Uint8Array> };
}): string {
  const chunks: string[] = [];
  chunks.push(toHex(ledger.quoteColor));
  chunks.push(ledger.openOffers.toString(), ledger.activeMandates.toString(), ledger.fills.toString());
  for (const set of [ledger.noteNullifiers, ledger.offerNullifiers, ledger.mandateRevoked, ledger.auditRoots]) {
    for (const x of set) chunks.push(toHex(x), ...encodingsOfBytes(x));
  }
  return chunks.join("\n");
}

export function assertAbsent(haystack: string, secrets: Array<Uint8Array | bigint>, label: string): void {
  const lower = haystack.toLowerCase();
  for (const s of secrets) {
    const encs = typeof s === "bigint" ? encodingsOfBigint(s) : encodingsOfBytes(s);
    for (const e of encs) {
      if (!e) continue;
      if (e.length >= 8 && lower.includes(e.toLowerCase())) {
        throw new Error(`privacy leak (${label}): encoding found in public ledger`);
      }
    }
  }
}

export function namespaceHash(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}
