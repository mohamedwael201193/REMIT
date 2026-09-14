import { describe, expect, it } from "vitest";
import {
  chainAuditRootFromHead,
  openedAuditRoot,
} from "../../front/src/lib/remit/audit-flow.ts";

const ROOT = "2eca8289789a45306beec0b0e5f798c0bf0974241fa1d681f759728bc6243938";
const FILL = "12306cbe24823f1ac39f0a1db3ee23214cc84d44cb8014b1d2f84d67838cbd20";

describe("auditor desk copies on-chain auditRoots head", () => {
  it("uses a real head and refuses fill tx hashes", () => {
    expect(openedAuditRoot(ROOT, [FILL])).toBe(ROOT);
    expect(openedAuditRoot(FILL, [FILL])).toBeNull();
    expect(chainAuditRootFromHead(ROOT, [FILL])).toBe(ROOT);
    expect(chainAuditRootFromHead(FILL, [FILL])).toBe("");
    expect(chainAuditRootFromHead("", [FILL])).toBe("");
    expect(chainAuditRootFromHead(undefined, [FILL])).toBe("");
  });
});
