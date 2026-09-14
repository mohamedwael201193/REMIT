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
    expect(ws.mandates[0]?.maxFill).toBeNull();
    expect(ws.mandates[0]?.limitPrice).toBeNull();
    expect(ws.mandates[0]?.totalBudget).toBeNull();
    expect(ws.mandates[0]?.spent).toBeNull();
    expect(ws.mandates[0]?.amountPrivacy).toBe("sealed");
    expect(ws.portfolio.totalBudget).toBeNull();
    expect(ws.portfolio.committedBudget).toBeNull();
    expect(ws.portfolio.amountPrivacy).toBe("sealed");
    expect(ws.executions.every((e) => e.attemptedFill == null && e.price == null)).toBe(true);
    expect(ws.offers.every((o) => o.compatibility == null && o.executionScore == null)).toBe(true);
    expect(ws.portfolio.verificationRate).toBeNull();
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

  it("maps pool-k3-fill as settled and does not steal the fill hash as the mandate tx", () => {
    const fillHash = "12306cbe24823f1ac39f0a1db3ee23214cc84d44cb8014b1d2f84d67838cbd20";
    const mandateHash = "308c7b2c11111111111111111111111111111111111111111111111111111111";
    const chain: RemitChainSnapshot = {
      live: true,
      network: "preprod",
      pool: {
        address: "pool-mbbe",
        txHash: fillHash,
        block: 2542039,
        fills: 2,
        openOffers: 5,
        activeMandates: 1,
      },
      quote: { address: "quote1", txHash: "bb", block: 8 },
    };
    const evidence: RemitPublicEvidence = {
      present: true,
      network: "preprod",
      mpc: false,
      steps: [
        { name: "pool-create-mandate", ok: true, txHash: mandateHash, block: 2541972 },
        { name: "pool-place-maker-a-ineligible", ok: true, txHash: "a1", block: 2541978 },
        { name: "pool-place-maker-b-eligible", ok: true, txHash: "b1", block: 2541986 },
        { name: "pool-place-maker-c-best-partial", ok: true, txHash: "c1", block: 2541991 },
        { name: "agent-rank", ok: true, detail: "eligible=2 of 3; selected best compliant; openings private" },
        { name: "pool-k3-fill", ok: true, txHash: fillHash, block: 2542039 },
      ],
    };
    const ws = mapPublicWorkspace({ chain, evidence });
    expect(ws.executions.some((e) => e.status === "settled" && e.txHash === fillHash)).toBe(true);
    expect(ws.mandates[0]?.status).toBe("active");
    expect(ws.mandates[0]?.intent).toMatch(new RegExp(`tx ${mandateHash}`));
    expect(ws.mandates[0]?.intent).not.toMatch(new RegExp(`tx ${fillHash}`));
    expect(ws.offers.map((o) => o.reference).sort()).toEqual(["MAKER-A", "MAKER-B", "MAKER-C"]);
    expect(ws.offers.some((o) => o.reference === "COMPLIANT")).toBe(false);
    expect(ws.offers.find((o) => o.reference === "MAKER-A")?.state).toBe("incompatible");
    expect(ws.offers.find((o) => o.reference === "MAKER-C")?.state).toBe("executed");
    expect(ws.activity.some((a) => a.kind === "settlement" && a.label === "pool-k3-fill")).toBe(true);
    expect(ws.executions.every((e) => e.attemptedFill == null && e.price == null)).toBe(true);
  });
});
