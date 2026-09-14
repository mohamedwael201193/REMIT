/**
 * Read-only hosted leak scan. Never submits a Preprod transaction.
 * Local inject covers the sanitizer even if Render is unreachable.
 */
import { describe, it, expect } from "vitest";
import { agentHttpHasLeakKeys } from "../../packages/agent/src/daemon.ts";
import { publicLeakHits } from "../../packages/core/src/leaks.ts";
import { buildApp } from "../../apps/api/src/app.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";

const API = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");
const MBBE_POOL = "01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e";
const MBBE_FILL = "12306cbe24823f1ac39f0a1db3ee23214cc84d44cb8014b1d2f84d67838cbd20";
const V1_POOL = "e82dea02b2397332df0bb10e2df6d9e257c8ceba696415ed3c10f639f68d43d4";

function assertLeakFree(label: string, payload: unknown): void {
  const keys = publicLeakHits(payload);
  expect(keys, `${label}: leak tokens ${keys.join(",")}`).toEqual([]);
  expect(agentHttpHasLeakKeys(payload), `${label}: agentHttpHasLeakKeys`).toEqual([]);
}

describe("hosted /evidence and /agent/status omit leak keys", () => {
  it("local GET /evidence after a poisoned POST drops fillBase/fillQuote/chosenIndex", async () => {
    const rec = rfqKeyPair();
    const { app } = await buildApp({
      cors: "*",
      admin: "admin-token-not-for-prod",
      rfqSk: rec.secretHex,
      execSk: "ab".repeat(32),
      pool: MBBE_POOL,
      quote: "7559e38693725dafef73486f2ee3aa30ee0b5b543e22d0aa5ad7303c37b55e3f",
      network: "preprod",
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
    });
    const posted = await app.inject({
      method: "POST",
      url: "/evidence",
      headers: { authorization: "Bearer admin-token-not-for-prod" },
      payload: {
        network: "preprod",
        pool: { address: MBBE_POOL, txHash: "11".repeat(32), block: 1 },
        steps: [
          {
            name: "pool-k3-fill",
            ok: true,
            txHash: MBBE_FILL,
            block: 2542039,
            detail: "fillBase=50 fillQuote=2000 chosenIndex=2 ownerSk=ff",
          },
        ],
      },
    });
    expect(posted.statusCode).toBe(200);
    const ev = await app.inject({ method: "GET", url: "/evidence" });
    expect(ev.statusCode).toBe(200);
    assertLeakFree("local-evidence", ev.json());
    const status = await app.inject({ method: "GET", url: "/agent/status" });
    expect(status.json().httpSubmit).toBe(false);
    assertLeakFree("local-status", status.json());
    await app.close();
  });

  it("Render /evidence and /agent/status omit leak keys and keep the MBBE fill", async () => {
    const evidenceRes = await fetch(`${API}/evidence`);
    expect(evidenceRes.ok).toBe(true);
    const evidence = await evidenceRes.json();
    assertLeakFree("hosted-evidence", evidence);
    expect(evidence.globalBest ?? false).toBe(false);
    const blob = JSON.stringify(evidence);
    expect(blob).not.toMatch(/fillBase|fillQuote|chosenIndex|residualBase|ownerSk|rfqSk|execSk|offerRand|payNonce/);
    expect(blob.includes(MBBE_FILL)).toBe(true);
    expect(blob.includes(MBBE_POOL)).toBe(true);
    const livePool = (evidence as { pool?: { address?: string } }).pool?.address;
    if (typeof livePool === "string" && livePool.length === 64) {
      expect(livePool).toBe(MBBE_POOL);
      expect(livePool).not.toBe(V1_POOL);
    }

    const statusRes = await fetch(`${API}/agent/status`);
    expect(statusRes.ok).toBe(true);
    const status = await statusRes.json();
    expect(status.httpSubmit).toBe(false);
    expect(status.globalBest).toBe(false);
    assertLeakFree("hosted-status", status);
  });
});
