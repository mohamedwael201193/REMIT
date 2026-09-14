import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { buildApp } from "../../apps/api/src/app.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { publicErrorMessage } from "../../packages/core/src/errors.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";

const BASE_AMOUNT = "32771";
const QUOTE_AMOUNT = "1048583";
const OFFER_EXPIRY = "3765432109";
const EXEC_SK = "c1".repeat(32);
const ADMIN = "admin-token-not-for-prod";

function leakHay(parts: unknown[]): string {
  return parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join("\n")
    .toLowerCase();
}

describe("API RFQ + /agent/rank must not leak openings or secrets", () => {
  it("RFQ and rank JSON omit rfqSk, execSk, and offer amounts; errors use publicErrorMessage", async () => {
    const rec = rfqKeyPair();
    const inboxFile = join(mkdtempSync(join(tmpdir(), "remit-inbox-")), "inbox.bin");
    const { app } = await buildApp({
      cors: "*",
      admin: ADMIN,
      rfqSk: rec.secretHex,
      execSk: EXEC_SK,
      pool: "",
      quote: "",
      network: "preprod",
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
      inboxFile,
    });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const { boxed } = makeOfferBox(
      rec.publicHex,
      {
        side: "1",
        baseAmount: BASE_AMOUNT,
        quoteAmount: QUOTE_AMOUNT,
        maker: Array.from({ length: 32 }, () => 7),
        payNonce: Array.from({ length: 32 }, () => 8),
        expiry: OFFER_EXPIRY,
        minFillBase: "1",
      },
      Array.from({ length: 32 }, () => 9),
    );
    const rfq = await app.inject({ method: "POST", url: "/rfq/offer", payload: { box: boxed } });
    expect(rfq.statusCode).toBe(200);
    expect(rfq.json()).toHaveProperty("id");

    const unauth = await app.inject({ method: "POST", url: "/agent/rank", payload: {} });
    expect(unauth.statusCode).toBe(401);

    const garbage = await app.inject({ method: "POST", url: "/rfq/offer", payload: { box: "not-a-box" } });
    expect(garbage.statusCode).toBe(400);

    const rank = await app.inject({
      method: "POST",
      url: "/agent/rank",
      headers: { authorization: `Bearer ${ADMIN}` },
      payload: {
        remaining: "90011",
        nowBound: "1800000000",
        mandate: {
          principal: Array.from({ length: 32 }, () => 1),
          executor: Array.from({ length: 32 }, () => 2),
          side: "0",
          maxFillBase: "40001",
          limitNum: "30000041",
          limitDen: "1000000007",
          cpRoot: "0",
          expiry: "3876543210",
          mandateId: Array.from({ length: 32 }, () => 5),
        },
      },
    });
    expect(rank.statusCode).toBe(200);
    const rankBody = rank.json() as {
      selectedId: string | null;
      rule: string;
      globalBest: boolean;
      ranked?: unknown;
    };
    expect(rankBody.rule).toBe("mbbe-eligible-only");
    expect(rankBody.globalBest).toBe(false);
    expect(rankBody.selectedId === null || typeof rankBody.selectedId === "string").toBe(true);
    const rankText = JSON.stringify(rankBody);
    expect(rankText.includes("baseAmount")).toBe(false);
    expect(rankText.includes("quoteAmount")).toBe(false);
    expect(rankText.includes("offerRand")).toBe(false);
    expect(rankText.includes("payNonce")).toBe(false);
    expect(rankText.includes("rfqSk")).toBe(false);
    expect(rankText.includes("execSk")).toBe(false);

    const secretHay = leakHay([
      health.json(),
      health.body,
      rfq.json(),
      rfq.body,
      unauth.json(),
      unauth.body,
      garbage.json(),
      garbage.body,
      rankBody,
      rank.body,
    ]);
    expect(secretHay.includes(rec.secretHex.toLowerCase()), "rfqSk in HTTP body").toBe(false);
    expect(secretHay.includes(EXEC_SK.toLowerCase()), "execSk in HTTP body").toBe(false);
    expect(secretHay.includes(BASE_AMOUNT), "opening baseAmount in HTTP body").toBe(false);
    expect(secretHay.includes(QUOTE_AMOUNT), "opening quoteAmount in HTTP body").toBe(false);
    expect(secretHay.includes(OFFER_EXPIRY), "opening expiry in HTTP body").toBe(false);

    const poisoned = await app.inject({
      method: "POST",
      url: "/agent/rank",
      headers: { authorization: `Bearer ${ADMIN}` },
      payload: {
        remaining: "1",
        nowBound: "1",
        mandate: {
          principal: Array.from({ length: 32 }, () => 1),
          executor: Array.from({ length: 32 }, () => 2),
          side: "witness salt 00aa",
          maxFillBase: "1",
          limitNum: "1",
          limitDen: "1",
          cpRoot: "0",
          expiry: "1",
          mandateId: Array.from({ length: 32 }, () => 5),
        },
      },
    });
    expect(poisoned.statusCode).toBeGreaterThanOrEqual(400);
    const poisonedErr = poisoned.json() as { error?: string };
    expect(typeof poisonedErr.error).toBe("string");
    expect(poisonedErr.error).toBe(publicErrorMessage(new Error("Cannot convert witness salt 00aa to a BigInt")));
    expect(JSON.stringify(poisoned.json()).toLowerCase().includes(rec.secretHex.toLowerCase())).toBe(false);
    expect(JSON.stringify(poisoned.json()).toLowerCase().includes(EXEC_SK.toLowerCase())).toBe(false);
    expect(JSON.stringify(poisoned.json()).toLowerCase().includes("00aa")).toBe(false);

    for (const res of [unauth, garbage, poisoned]) {
      const err = (res.json() as { error?: string }).error;
      expect(err).toBeTruthy();
      expect(err).toBe(publicErrorMessage(new Error(String(err))));
    }

    expect(existsSync(inboxFile)).toBe(true);
    const inboxBuf = readFileSync(inboxFile);
    const inboxText = inboxBuf.toString("utf8").toLowerCase();
    expect(inboxBuf.subarray(0, 5).toString()).toBe("RMTI1");
    expect(inboxText.includes(rec.secretHex.toLowerCase())).toBe(false);
    expect(inboxText.includes(EXEC_SK.toLowerCase())).toBe(false);
    expect(inboxText.includes(BASE_AMOUNT)).toBe(false);
    expect(inboxText.includes(QUOTE_AMOUNT)).toBe(false);

    const poisonedFill = await app.inject({
      method: "POST",
      url: "/agent/rank",
      headers: { authorization: `Bearer ${ADMIN}` },
      payload: {
        remaining: "fillBase=32771011",
        nowBound: "1800000000",
        mandate: {
          principal: Array.from({ length: 32 }, () => 1),
          executor: Array.from({ length: 32 }, () => 2),
          side: "0",
          maxFillBase: "1",
          limitNum: "1",
          limitDen: "1",
          cpRoot: "0",
          expiry: "1",
          mandateId: Array.from({ length: 32 }, () => 5),
        },
      },
    });
    expect(poisonedFill.statusCode).toBeGreaterThanOrEqual(400);
    const fillErr = JSON.stringify(poisonedFill.json()).toLowerCase();
    expect(fillErr.includes("fillbase")).toBe(false);
    expect(fillErr.includes("32771011")).toBe(false);
    expect(fillErr.includes(rec.secretHex.toLowerCase())).toBe(false);
    expect(fillErr.includes(EXEC_SK.toLowerCase())).toBe(false);

    const poisonEv = await app.inject({
      method: "POST",
      url: "/evidence",
      headers: { authorization: `Bearer ${ADMIN}` },
      payload: {
        network: "preprod",
        steps: [
          {
            name: "pool-k3-fill",
            ok: true,
            txHash: "aa".repeat(32),
            block: 1,
            detail: "fillBase=32771 fillQuote=1048583 chosenIndex=2",
          },
        ],
      },
    });
    expect(poisonEv.statusCode).toBe(200);
    const ev = await app.inject({ method: "GET", url: "/evidence" });
    const evText = JSON.stringify(ev.json());
    expect(evText.includes("fillBase")).toBe(false);
    expect(evText.includes("fillQuote")).toBe(false);
    expect(evText.includes("chosenIndex")).toBe(false);
    expect(evText.includes("32771")).toBe(false);
    expect(evText.includes("1048583")).toBe(false);

    await app.close();
  });
});
