/**
 * Verify a selective-disclosure package against an on-chain audit root.
 * Usage: npx tsx scripts/audit-verify.ts <package.json> <auditRootHex>
 * Never prints witness values from the package beyond PASS/FAIL per field.
 */
import { readFileSync } from "node:fs";
import { verifyDisclosure, type DisclosurePackage } from "../packages/core/src/audit.ts";

const pkgPath = process.argv[2];
const rootHex = process.argv[3];
if (!pkgPath || !rootHex) {
  console.error("usage: npx tsx scripts/audit-verify.ts <package.json> <auditRootHex>");
  process.exit(2);
}
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as DisclosurePackage;
const root = Uint8Array.from(Buffer.from(rootHex.replace(/^0x/, ""), "hex"));
const result = verifyDisclosure(pkg, root);
console.log(JSON.stringify({ ok: result.ok, failed: result.failed, fillIndex: pkg.fillIndex, opened: pkg.openings.map((o) => o.field) }));
process.exit(result.ok ? 0 : 1);
