import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { buildApp } from "../../apps/api/src/app.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";
import { EXECUTOR_VISIBILITY } from "../../packages/core/src/rfq.ts";

const OFFER = {
  side: "1",
  baseAmount: "40",
  quoteAmount: "1280",
  maker: Array.from({ length: 32 }, () => 1),
  payNonce: Array.from({ length: 32 }, () => 2),
  expiry: "4000000000",
  minFillBase: "1",
};

describe("encrypted RFQ inbox survives process restart", () => {
  it("reload from disk keeps the boxed offer, rejects replay, and never stores plaintext amounts", async () => {
    const rec = rfqKeyPair();
    const inboxFile = join(mkdtempSync(join(tmpdir(), "remit-inbox-restart-")), "inbox.bin");
    const cfg = {
      cors: "*",
      admin: "admin-token-not-for-prod",
      rfqSk: rec.secretHex,
      execSk: "ab".repeat(32),
      pool: "01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e",
      quote: "7559e38693725dafef73486f2ee3aa30ee0b5b543e22d0aa5ad7303c37b55e3f",
      network: "preprod",
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
      inboxFile,
    };
    const { boxed } = makeOfferBox(rec.publicHex, OFFER, Array.from({ length: 32 }, () => 3));

    const first = await buildApp(cfg);
    const posted = await first.app.inject({ method: "POST", url: "/rfq/offer", payload: { box: boxed } });
    expect(posted.statusCode).toBe(200);
    const stats1 = await first.app.inject({ method: "GET", url: "/stats" });
    expect(stats1.json().offersQueued).toBe(1);
    await first.app.close();

    const second = await buildApp(cfg);
    const stats2 = await second.app.inject({ method: "GET", url: "/stats" });
    expect(stats2.json().offersQueued).toBe(1);
    const replay = await second.app.inject({ method: "POST", url: "/rfq/offer", payload: { box: boxed } });
    expect(replay.statusCode).toBe(409);
    const health = await second.app.inject({ method: "GET", url: "/health" });
    expect(health.json().visibility).toBe(EXECUTOR_VISIBILITY.model);
    expect(health.json().trust.model).toBe(EXECUTOR_VISIBILITY.model);
    const disk = readFileSync(inboxFile);
    expect(disk.subarray(0, 5).toString()).toBe("RMTI1");
    const hay = disk.toString("utf8").toLowerCase();
    expect(hay.includes(rec.secretHex.toLowerCase())).toBe(false);
    expect(hay.includes("baseamount")).toBe(false);
    expect(hay.includes("1280")).toBe(false);
    await second.app.close();
  });
});
