import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../apps/api/src/app.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeMandateBox, makeOfferBox } from "../../packages/core/src/rfq.ts";

const ADMIN = "admin-token-not-for-prod";
const BASE = "32771011";
const QUOTE = "1048583211";

describe("admin inbox + settled (ciphertext only, rank still 401 without Bearer)", () => {
  it("exposes boxed ids to admin, rejects unauth, and records a public settlement without openings", async () => {
    const rec = rfqKeyPair();
    const inboxFile = join(mkdtempSync(join(tmpdir(), "remit-inbox-")), "inbox.bin");
    const { app } = await buildApp({
      cors: "*",
      admin: ADMIN,
      rfqSk: rec.secretHex,
      execSk: "ab".repeat(32),
      pool: "",
      quote: "",
      network: "preprod",
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
      inboxFile,
    });

    expect((await app.inject({ method: "GET", url: "/inbox" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/inbox/restore", payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/agent/settled", payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/agent/rank", payload: {} })).statusCode).toBe(401);

    const { boxed } = makeOfferBox(
      rec.publicHex,
      {
        side: "1",
        baseAmount: BASE,
        quoteAmount: QUOTE,
        maker: Array.from({ length: 32 }, () => 7),
        payNonce: Array.from({ length: 32 }, () => 8),
        expiry: "4000000000",
        minFillBase: "10",
      },
      Array.from({ length: 32 }, () => 9),
    );
    const rfq = await app.inject({ method: "POST", url: "/rfq/offer", payload: { box: boxed } });
    expect(rfq.statusCode).toBe(200);
    const rfqId = (rfq.json() as { id: string }).id;

    const { boxed: mandateBox } = makeMandateBox(rec.publicHex, Array.from({ length: 32 }, () => 4), 7 * 24 * 60 * 60_000, {
      mandate: {
        principal: Array.from({ length: 32 }, () => 1),
        executor: Array.from({ length: 32 }, () => 2),
        side: "0",
        maxFillBase: "50",
        limitNum: "30",
        limitDen: "1000",
        cpRoot: "0",
        expiry: "4000000000",
        mandateId: Array.from({ length: 32 }, () => 4),
      },
      mandateRand: Array.from({ length: 32 }, () => 5),
      remaining: "50",
      stateNonce: Array.from({ length: 32 }, () => 6),
    });
    const postedM = await app.inject({ method: "POST", url: "/mandate", payload: { box: mandateBox } });
    expect(postedM.statusCode).toBe(200);

    const inbox = await app.inject({
      method: "GET",
      url: "/inbox",
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    expect(inbox.statusCode).toBe(200);
    const body = inbox.json() as {
      offers: { id: string; box: string }[];
      mandates: { id: string; box: string }[];
    };
    expect(body.offers.map((o) => o.id)).toContain(rfqId);
    expect(body.mandates.length).toBe(1);
    expect(JSON.stringify(body).includes(BASE)).toBe(false);
    expect(JSON.stringify(body).includes(QUOTE)).toBe(false);
    expect(JSON.stringify(body).includes("fillBase")).toBe(false);
    expect(body.offers[0]!.box.startsWith("Uk1UQj")).toBe(true);

    const restoredId = "1789405396428-0";
    const restore = await app.inject({
      method: "POST",
      url: "/inbox/restore",
      headers: { authorization: `Bearer ${ADMIN}` },
      payload: { offers: [{ id: restoredId, box: boxed }] },
    });
    expect(restore.statusCode).toBe(200);
    expect(restore.json()).toEqual({ ok: true, offers: 2, mandates: 1 });
    const afterRestore = await app.inject({
      method: "GET",
      url: "/inbox",
      headers: { authorization: `Bearer ${ADMIN}` },
    });
    const restored = (afterRestore.json() as { offers: { id: string; box: string }[] }).offers.find((o) => o.id === restoredId);
    expect(restored?.box).toBe(boxed);
    expect(JSON.stringify(restore.json()).includes(BASE)).toBe(false);

    const txHash = "c303ec61c09d406acfbec24915dd83c0546c1e833329a3e6a2f7de53b15265b2";
    const settled = await app.inject({
      method: "POST",
      url: "/agent/settled",
      headers: { authorization: `Bearer ${ADMIN}` },
      payload: { selectedId: rfqId, txHash, block: 2548791 },
    });
    expect(settled.statusCode).toBe(200);
    expect(JSON.stringify(settled.json()).includes("fillBase")).toBe(false);

    const status = await app.inject({ method: "GET", url: "/agent/status" });
    const last = status.json().last as { selectedId: string; txHash: string; submitted: boolean; block: number };
    expect(status.json().httpSubmit).toBe(false);
    expect(last.selectedId).toBe(rfqId);
    expect(last.txHash).toBe(txHash);
    expect(last.submitted).toBe(true);
    expect(last.block).toBe(2548791);
    expect(JSON.stringify(status.json()).includes(BASE)).toBe(false);
    await app.close();
  });
});
