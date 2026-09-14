import { describe, it, expect } from "vitest";
import { buildApp } from "../../apps/api/src/app.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeMandateBox, makeOfferBox as makeTyped } from "../../packages/core/src/rfq.ts";
import { contractsDeployed } from "../../packages/sdk/src/health.ts";

describe("api (no private openings stored in plaintext)", () => {
  it("health omits secrets; RFQ rejects garbage; replay is rejected", async () => {
    const rec = rfqKeyPair();
    const { app } = await buildApp({
      cors: "*",
      admin: "admin-token-not-for-prod",
      rfqSk: rec.secretHex,
      execSk: "ab".repeat(32),
      pool: "",
      quote: "",
      network: "preprod",
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
    });
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    const body = health.json();
    expect(body.ok).toBe(true);
    expect(JSON.stringify(body).includes(rec.secretHex)).toBe(false);
    expect(body.mpc).toBe(false);
    expect(body.dustGate).toBe("availableCoins>=1");
    expect(health.headers["x-content-type-options"]).toBe("nosniff");
    expect(typeof body.pool).toBe("string");
    expect(typeof body.quote).toBe("string");
    if (body.pool && body.quote) {
      expect(body.pool).toMatch(/^[0-9a-f]{64}$/i);
      expect(body.quote).toMatch(/^[0-9a-f]{64}$/i);
      expect(contractsDeployed(body)).toBe(true);
    } else {
      expect(contractsDeployed(body)).toBe(false);
    }

    const cfg = await app.inject({ method: "GET", url: "/config" });
    expect(cfg.statusCode).toBe(200);
    const cfgBody = cfg.json();
    expect(cfgBody.live).toBe(Boolean(body.pool && body.quote));
    expect(cfgBody.mpc).toBe(false);
    expect(cfgBody.zkirUrl).toBe("/zkir");
    expect(cfgBody.indexerWs).toContain("wss://");
    expect(typeof cfgBody.executorKey).toBe("string");
    expect(cfgBody.executorKey.length).toBe(64);
    expect(JSON.stringify(cfgBody).includes(rec.secretHex)).toBe(false);
    expect(JSON.stringify(cfgBody).includes("ab".repeat(32))).toBe(false);

    const chain = await app.inject({ method: "GET", url: "/chain" });
    expect(chain.statusCode).toBe(200);
    expect(chain.json().live).toBe(Boolean(body.pool && body.quote));

    const emptyEv = await app.inject({ method: "GET", url: "/evidence" });
    expect(emptyEv.statusCode).toBe(200);
    const bootEv = emptyEv.json() as { present?: boolean; steps?: { name?: string; txHash?: string }[]; mpc?: boolean };
    expect(bootEv.mpc).toBe(false);
    expect(JSON.stringify(bootEv).includes(rec.secretHex)).toBe(false);
    if (bootEv.present) {
      expect(Array.isArray(bootEv.steps)).toBe(true);
      expect(bootEv.steps?.some((s) => /fill/i.test(s.name ?? "") && Boolean(s.txHash))).toBe(true);
    }

    const unauthEv = await app.inject({
      method: "POST",
      url: "/evidence",
      payload: { steps: [{ name: "pool-fill", ok: true, txHash: "aa", block: 1 }] },
    });
    expect(unauthEv.statusCode).toBe(401);

    const pub = await app.inject({
      method: "POST",
      url: "/evidence",
      headers: { authorization: "Bearer admin-token-not-for-prod" },
      payload: {
        network: "preprod",
        pool: { address: "poolx", txHash: "aa", block: 2 },
        quote: { address: "quotex", txHash: "bb", block: 1 },
        steps: [{ name: "pool-fill", ok: true, txHash: "aa", block: 2 }],
      },
    });
    expect(pub.statusCode).toBe(200);
    const ev = await app.inject({ method: "GET", url: "/evidence" });
    expect(ev.json().present).toBe(true);
    expect(ev.json().steps[0].txHash).toBe("aa");
    expect(JSON.stringify(ev.json()).includes(rec.secretHex)).toBe(false);

    const bad = await app.inject({ method: "POST", url: "/rfq/offer", payload: { box: "nope" } });
    expect(bad.statusCode).toBe(400);

    const { boxed } = makeTyped(rec.publicHex, {
      side: "1",
      baseAmount: "40",
      quoteAmount: "1280",
      maker: Array.from({ length: 32 }, () => 1),
      payNonce: Array.from({ length: 32 }, () => 2),
      expiry: "4000000000",
      minFillBase: "1",
    }, Array.from({ length: 32 }, () => 3));
    const ok = await app.inject({ method: "POST", url: "/rfq/offer", payload: { box: boxed } });
    expect(ok.statusCode).toBe(200);
    const replay = await app.inject({ method: "POST", url: "/rfq/offer", payload: { box: boxed } });
    expect(replay.statusCode).toBe(409);

    const unauth = await app.inject({ method: "POST", url: "/disclose", payload: { package: {}, rootHex: "00" } });
    expect(unauth.statusCode).toBe(401);

    const { boxed: mandateBox } = makeMandateBox(rec.publicHex, Array.from({ length: 32 }, () => 4));
    const mOk = await app.inject({ method: "POST", url: "/mandate", payload: { box: mandateBox } });
    expect(mOk.statusCode).toBe(200);
    const mReplay = await app.inject({ method: "POST", url: "/mandate", payload: { box: mandateBox } });
    expect(mReplay.statusCode).toBe(409);

    const unauthRank = await app.inject({ method: "POST", url: "/agent/rank", payload: {} });
    expect(unauthRank.statusCode).toBe(401);
    const rank = await app.inject({
      method: "POST",
      url: "/agent/rank",
      headers: { authorization: "Bearer admin-token-not-for-prod" },
      payload: {
        remaining: "100",
        nowBound: "1700000000",
        mandate: {
          principal: Array.from({ length: 32 }, () => 1),
          executor: Array.from({ length: 32 }, () => 2),
          side: "0",
          maxFillBase: "50",
          limitNum: "30",
          limitDen: "1000",
          cpRoot: "0",
          expiry: "2000000000",
          mandateId: Array.from({ length: 32 }, () => 5),
        },
      },
    });
    expect(rank.statusCode).toBe(200);
    expect(rank.json().selectedId === null || typeof rank.json().selectedId === "string").toBe(true);
    expect(rank.json().globalBest).toBe(false);
    expect(rank.json().constructed).toBe(false);
    expect(rank.json().submitted).toBe(false);
    expect(JSON.stringify(rank.json()).includes("fillBase")).toBe(false);
    expect(JSON.stringify(rank.json()).includes("chosenIndex")).toBe(false);
    expect(JSON.stringify(rank.json()).includes(rec.secretHex)).toBe(false);

    const status = await app.inject({ method: "GET", url: "/agent/status" });
    expect(status.statusCode).toBe(200);
    expect(status.json().httpSubmit).toBe(false);
    expect(status.json().globalBest).toBe(false);
    expect(status.json().k).toBe(3);
    expect(JSON.stringify(status.json()).includes(rec.secretHex)).toBe(false);
    expect(health.json().semantics).toBe("mbbe-k3");
    expect(health.json().globalBest).toBe(false);
    const missingKey = await app.inject({ method: "GET", url: "/keys/missing.prover" });
    expect(missingKey.statusCode).toBe(404);
    expect(missingKey.headers["access-control-allow-origin"]).toBe("*");
    expect(missingKey.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    await app.close();
  });
});
