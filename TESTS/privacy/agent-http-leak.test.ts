import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { buildApp } from "../../apps/api/src/app.ts";
import { agentHttpHasLeakKeys } from "../../packages/agent/src/daemon.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { fromHex } from "../../packages/core/src/bytes.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";
import { pureCircuits } from "../../CONTRACT/managed/remit_pool/contract/index.js";

const BASE_AMOUNT = "32771011";
const QUOTE_AMOUNT = "1048583211";
const OFFER_EXPIRY = "3765432109";
const FILL_SLICE = "32771011";
const EXEC_SK = "c1".repeat(32);
const ADMIN = "admin-token-not-for-prod";

function assertNoAgentLeaks(label: string, payload: unknown, extra: string[]): void {
  const text = JSON.stringify(payload);
  const keys = agentHttpHasLeakKeys(payload);
  expect(keys, `${label}: leak keys ${keys.join(",")}`).toEqual([]);
  const lower = text.toLowerCase();
  for (const s of extra) {
    expect(lower.includes(s.toLowerCase()), `${label}: leaked ${s}`).toBe(false);
  }
}

describe("GET /agent/status and POST /agent/rank must not leak openings or secrets", () => {
  it("rank + status omit openings, fillBase, fillQuote, chosenIndex, rfqSk, execSk", async () => {
    const rec = rfqKeyPair();
    const esk = fromHex(EXEC_SK);
    const executor = Array.from(pureCircuits.executorKey(esk));
    const inboxFile = join(mkdtempSync(join(tmpdir(), "remit-agent-http-")), "inbox.bin");
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

    const before = await app.inject({ method: "GET", url: "/agent/status" });
    expect(before.statusCode).toBe(200);
    assertNoAgentLeaks("status-before", before.json(), [rec.secretHex, EXEC_SK, BASE_AMOUNT, QUOTE_AMOUNT, OFFER_EXPIRY]);
    expect(before.json().last).toBeNull();

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
    assertNoAgentLeaks("rfq", rfq.json(), [rec.secretHex, EXEC_SK, BASE_AMOUNT, QUOTE_AMOUNT, FILL_SLICE]);

    const rank = await app.inject({
      method: "POST",
      url: "/agent/rank",
      headers: { authorization: `Bearer ${ADMIN}` },
      payload: {
        remaining: "90011000",
        nowBound: "1800000000",
        mandate: {
          principal: Array.from({ length: 32 }, () => 1),
          executor,
          side: "0",
          maxFillBase: "40000000",
          limitNum: "30",
          limitDen: "1000",
          cpRoot: "0",
          expiry: "3876543210",
          mandateId: Array.from({ length: 32 }, () => 5),
        },
      },
    });
    expect(rank.statusCode).toBe(200);
    const rankBody = rank.json() as { selectedId: string | null; globalBest: boolean; ranked?: unknown };
    expect(rankBody.globalBest).toBe(false);
    expect(rankBody.selectedId === null || typeof rankBody.selectedId === "string").toBe(true);
    assertNoAgentLeaks("rank", rankBody, [
      rec.secretHex,
      EXEC_SK,
      BASE_AMOUNT,
      QUOTE_AMOUNT,
      OFFER_EXPIRY,
      FILL_SLICE,
    ]);
    assertNoAgentLeaks("rank-raw", rank.body, [rec.secretHex, EXEC_SK, BASE_AMOUNT, QUOTE_AMOUNT]);

    const status = await app.inject({ method: "GET", url: "/agent/status" });
    expect(status.statusCode).toBe(200);
    const statusBody = status.json() as { last?: Record<string, unknown> | null; k?: number };
    expect(statusBody.k).toBe(3);
    expect(statusBody.last).toBeTruthy();
    expect(statusBody.last?.selected).toBe(true);
    assertNoAgentLeaks("status-after", statusBody, [
      rec.secretHex,
      EXEC_SK,
      BASE_AMOUNT,
      QUOTE_AMOUNT,
      OFFER_EXPIRY,
      FILL_SLICE,
    ]);

    await app.close();
  });
});
