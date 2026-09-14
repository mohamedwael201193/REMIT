/**
 * Read-only hosted honesty. Never submits a Preprod transaction.
 */
import { describe, it, expect } from "vitest";
import { agentHttpHasLeakKeys } from "../../packages/agent/src/daemon.ts";

const API = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");
const FRONT = (process.env.REMIT_FRONT_URL ?? "https://remit-front.vercel.app").replace(/\/$/, "");

const FICTION = ["$2.4B", "2.4B", "31,918", "USDC.n", "Corvus", "MD-2901", "MD-2841"];

describe("hosted Preprod honesty (read-only)", () => {
  it("Render health + evidence stay MBBE and leak-free; Vercel HTML has no catalog fiction", async () => {
    const healthRes = await fetch(`${API}/health`);
    expect(healthRes.ok).toBe(true);
    const health = (await healthRes.json()) as {
      ok?: boolean;
      mpc?: boolean;
      network?: string;
      pool?: string;
      k?: number;
      globalBest?: boolean;
      semantics?: string;
    };
    expect(health.ok).toBe(true);
    expect(health.mpc).toBe(false);
    expect(health.network).toBe("preprod");
    expect(health.k).toBe(3);
    expect(health.globalBest).toBe(false);
    expect(health.semantics).toBe("mbbe-k3");
    expect(health.pool).toBe("01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e");
    expect(agentHttpHasLeakKeys(health)).toEqual([]);

    const evidenceRes = await fetch(`${API}/evidence`);
    expect(evidenceRes.ok).toBe(true);
    const evidence = (await evidenceRes.json()) as {
      steps?: { name: string; ok: boolean; txHash?: string; block?: number; detail?: string }[];
      globalBest?: boolean;
    };
    expect(evidence.globalBest).toBe(false);
    expect(agentHttpHasLeakKeys(evidence)).toEqual([]);
    const blob = JSON.stringify(evidence);
    expect(blob).not.toMatch(/fillBase|fillQuote|chosenIndex|residualBase|ownerSk|rfqSk/);
    const k3 = evidence.steps?.find((s) => s.name === "pool-k3-fill" && s.ok);
    expect(k3?.txHash).toBe("12306cbe24823f1ac39f0a1db3ee23214cc84d44cb8014b1d2f84d67838cbd20");
    expect(k3?.block).toBe(2542039);
    const mandate = evidence.steps?.find((s) => s.name === "pool-create-mandate" && s.ok);
    expect(mandate?.txHash).toBe("308c7b2c57a8ab9aeefea4a1c243f5da056e6b5f4dbd4dc234cdb84aa1010749");
    expect(mandate?.txHash).not.toBe(k3?.txHash);

    const statusRes = await fetch(`${API}/agent/status`);
    expect(statusRes.ok).toBe(true);
    const status = await statusRes.json();
    expect(status.httpSubmit).toBe(false);
    expect(status.globalBest).toBe(false);
    expect(agentHttpHasLeakKeys(status)).toEqual([]);

    const htmlRes = await fetch(FRONT);
    expect(htmlRes.ok).toBe(true);
    const html = await htmlRes.text();
    const lower = html.toLowerCase();
    for (const token of FICTION) {
      expect(html.includes(token) || lower.includes(token.toLowerCase()), `hosted UI still contains ${token}`).toBe(
        false,
      );
    }
    expect(lower).not.toMatch(/all systems operational/);
    expect(lower).not.toMatch(/simulated settlement/);
  });
});
