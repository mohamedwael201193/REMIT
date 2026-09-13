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
      execSk: "00".repeat(32),
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
    expect(body.pool).toBe("");
    expect(body.quote).toBe("");
    expect(contractsDeployed(body)).toBe(false);

    const bad = await app.inject({ method: "POST", url: "/rfq/offer", payload: { box: "nope" } });
    expect(bad.statusCode).toBe(400);

    const { boxed } = makeTyped(rec.publicHex, {
      side: "1",
      baseAmount: "40",
      quoteAmount: "1280",
      maker: Array.from({ length: 32 }, () => 1),
      payNonce: Array.from({ length: 32 }, () => 2),
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
    await app.close();
  });
});
