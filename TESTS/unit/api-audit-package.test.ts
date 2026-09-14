import { describe, expect, it } from "vitest";
import { buildApp } from "../../apps/api/src/app.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeDisclosure, verifyDisclosure } from "../../packages/core/src/audit.ts";
import { randomBytes32, toHex } from "../../packages/core/src/bytes.ts";

describe("authorized one-field audit package", () => {
  it("publishes one field, verifies against the package root, and rejects forgeries", async () => {
    const rec = rfqKeyPair();
    const { app } = await buildApp({
      cors: "*",
      admin: "admin-token-not-for-prod",
      rfqSk: rec.secretHex,
      execSk: "ab".repeat(32),
      pool: "01bebd52ad1b243b390c853bbc2c1588d1cf0f487934d54d79f8a590505c105e",
      quote: "7559e38693725dafef73486f2ee3aa30ee0b5b543e22d0aa5ad7303c37b55e3f",
      network: "preprod",
      indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
    });
    const values = {
      side: 1n,
      baseAmount: 50n,
      quoteAmount: 2000n,
      principal: randomBytes32(),
      counterparty: randomBytes32(),
      mandateId: randomBytes32(),
    };
    const pkg = makeDisclosure(0, randomBytes32(), values, [1]);
    const root = Uint8Array.from(Buffer.from(pkg.auditRootHex, "hex"));
    expect(verifyDisclosure(pkg, root).ok).toBe(true);

    const unauth = await app.inject({ method: "POST", url: "/audit/publish", payload: { package: pkg } });
    expect(unauth.statusCode).toBe(401);

    const tooMuch = makeDisclosure(0, randomBytes32(), values, [1, 2]);
    const many = await app.inject({
      method: "POST",
      url: "/audit/publish",
      headers: { authorization: "Bearer admin-token-not-for-prod" },
      payload: { package: tooMuch },
    });
    expect(many.statusCode).toBe(400);

    const pub = await app.inject({
      method: "POST",
      url: "/audit/publish",
      headers: { authorization: "Bearer admin-token-not-for-prod" },
      payload: { package: pkg },
    });
    expect(pub.statusCode).toBe(200);
    expect(pub.json().field).toBe("baseAmount");

    const got = await app.inject({ method: "GET", url: "/audit/package" });
    expect(got.statusCode).toBe(200);
    expect(got.json().openings).toHaveLength(1);
    expect(got.json().openings[0].valueDec).toBe("50");

    const ok = await app.inject({
      method: "POST",
      url: "/audit/verify",
      payload: { package: pkg, rootHex: pkg.auditRootHex },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().ok).toBe(true);

    const forged = {
      ...pkg,
      openings: pkg.openings.map((o: { valueDec?: string }) => ({ ...o, valueDec: "999" })),
    };
    const badVal = await app.inject({
      method: "POST",
      url: "/audit/verify",
      payload: { package: forged, rootHex: pkg.auditRootHex },
    });
    expect(badVal.json().ok).toBe(false);

    const wrongRoot = await app.inject({
      method: "POST",
      url: "/audit/verify",
      payload: { package: pkg, rootHex: toHex(randomBytes32()) },
    });
    expect(wrongRoot.json().ok).toBe(false);

    await app.close();
  });
});
