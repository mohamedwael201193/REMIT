import { describe, it, expect } from "vitest";
import {
  assertNoProductionMock,
  contractsDeployed,
  explorerTxUrl,
  mapPublicWorkspace,
  type RemitChainSnapshot,
  type RemitPublicEvidence,
} from "../../packages/sdk/src/public.ts";
import { frontPublicEnvFromDeploy, serializeFrontPublicEnv } from "../../scripts/write-front-public-env.ts";

describe("public Preprod config for the supplied frontend", () => {
  it("does not treat empty addresses as live contracts", () => {
    expect(contractsDeployed({ ok: true, pool: "", quote: "" })).toBe(false);
    expect(contractsDeployed({ ok: true, pool: "aa", quote: "bb" })).toBe(true);
  });

  it("writes only public NEXT_PUBLIC keys", () => {
    const env = frontPublicEnvFromDeploy({
      network: "preprod",
      pool: { address: "pooladdr" },
      quote: { address: "quoteaddr" },
    });
    expect(env).not.toBeNull();
    const text = serializeFrontPublicEnv(env!);
    expect(text).toContain("NEXT_PUBLIC_REMIT_POOL_CONTRACT_ADDRESS=pooladdr");
    expect(text).toContain("NEXT_PUBLIC_REMIT_QUOTE_CONTRACT_ADDRESS=quoteaddr");
    expect(text).toContain("NEXT_PUBLIC_REMIT_ZKIR_URL=");
    const keys = text
      .split(/\r?\n/)
      .filter((l) => l.includes("="))
      .map((l) => l.slice(0, l.indexOf("=")));
    expect(keys.every((k) => k.startsWith("NEXT_PUBLIC_"))).toBe(true);
    expect(keys.join("\n")).not.toMatch(/MNEMONIC|PASSWORD|_SECRET|_TOKEN|_HEX/i);
    expect(() => assertNoProductionMock("pool", env!.pool)).not.toThrow();
  });

  it("maps indexer evidence into workspace slices without inventing settlement", () => {
    const chain: RemitChainSnapshot = {
      live: true,
      network: "preprod",
      pool: { address: "pool1", txHash: "aa", block: 9, fills: 1, openOffers: 1, activeMandates: 0 },
      quote: { address: "quote1", txHash: "bb", block: 8 },
    };
    const evidence: RemitPublicEvidence = {
      present: true,
      network: "preprod",
      mpc: false,
      steps: [
        { name: "pool-create-mandate", ok: true, txHash: "m1", block: 10 },
        { name: "overreach-compact", ok: true, detail: "per-fill cap" },
        { name: "price-violation-compact", ok: true, detail: "price outside mandate limit" },
        { name: "pool-fill", ok: true, txHash: "f1", block: 11 },
        { name: "selective-audit", ok: true },
        { name: "pool-revoke", ok: true, txHash: "r1", block: 12 },
      ],
    };
    const ws = mapPublicWorkspace({ chain, evidence, principalName: "mn_addr_preprod1abc" });
    expect(ws.portfolio.deskName).toBe("Midnight Preprod");
    expect(ws.portfolio.settledNotional).toBe(1);
    expect(ws.executions.some((e) => e.status === "settled" && e.txHash === "f1")).toBe(true);
    expect(ws.executions.filter((e) => e.reference === "OVER-CAP").every((e) => e.status === "rejected")).toBe(true);
    expect(ws.executions.filter((e) => e.reference === "PRICE").every((e) => e.status === "rejected")).toBe(true);
    expect(ws.mandates[0]?.status).toBe("revoked");
    expect(explorerTxUrl("f1")).toContain("f1");
  });

  it("prefers live activeMandates over a historical revoke step", () => {
    const chain: RemitChainSnapshot = {
      live: true,
      network: "preprod",
      pool: { address: "pool1", txHash: "aa", block: 9, fills: 1, openOffers: 0, activeMandates: 1 },
      quote: { address: "quote1", txHash: "bb", block: 8 },
    };
    const evidence: RemitPublicEvidence = {
      present: true,
      network: "preprod",
      mpc: false,
      steps: [
        { name: "pool-create-mandate", ok: true, txHash: "m1", block: 10 },
        { name: "pool-revoke", ok: true, txHash: "r1", block: 12 },
      ],
    };
    const ws = mapPublicWorkspace({ chain, evidence });
    expect(ws.mandates[0]?.status).toBe("active");
    expect(ws.mandates[0]?.intent).toMatch(/tx aa/);
    expect(ws.mandates[0]?.intent).not.toMatch(/\bm1\b/);
    expect(ws.activity[0]?.detail).toMatch(/aa/);
  });
});
