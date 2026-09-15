import { config as loadEnv } from "dotenv";
import dns from "node:dns";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { createDurableInbox, ensureRemitSchema, PERSIST_PING_CACHE_MS } from "../../apps/api/src/durable.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";

dns.setDefaultResultOrder("ipv4first");

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env.preprod.local") });

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("supabase ciphertext persist (live DATABASE_URL)", () => {
  it("round-trips an encrypted snapshot and omits plaintext amounts in the row", async () => {
    await ensureRemitSchema(url!);
    const rec = rfqKeyPair();
    const snapshotNonce = `test-${Date.now()}`;
    const store = createDurableInbox({ password: rec.secretHex, databaseUrl: url, snapshotNonce });
    const { boxed } = makeOfferBox(
      rec.publicHex,
      {
        side: "1",
        baseAmount: "40",
        quoteAmount: "1280",
        maker: Array.from({ length: 32 }, () => 1),
        payNonce: Array.from({ length: 32 }, () => 2),
        expiry: "4000000000",
        minFillBase: "1",
      },
      Array.from({ length: 32 }, () => 3),
    );
    const cleanup = postgres({
      host: new URL(url!).hostname,
      port: Number(new URL(url!).port || 5432),
      database: "postgres",
      username: decodeURIComponent(new URL(url!).username),
      password: decodeURIComponent(new URL(url!).password),
      ssl: "require",
      prepare: false,
      max: 1,
      connect_timeout: 15,
      connection: { application_name: "remit-test-cleanup" },
      onnotice: () => undefined,
    });
    try {
      await store.save({
        v: 1,
        offers: [{ id: snapshotNonce, boxed, receivedAt: Date.now() }],
        mandates: [],
        nonces: [snapshotNonce],
        receipts: [],
      });
      const loaded = await store.load();
      expect(loaded.offers.some((o) => o.id === snapshotNonce)).toBe(true);
      expect(JSON.stringify(loaded).toLowerCase().includes("baseamount")).toBe(false);
      expect(JSON.stringify(loaded).includes("1280")).toBe(false);
      let clock = 1_000;
      const cached = createDurableInbox({
        password: rec.secretHex,
        databaseUrl: url,
        snapshotNonce: `${snapshotNonce}-ping`,
        now: () => clock,
      });
      try {
        expect(await cached.ping()).toBe(true);
        const first = cached.stats().pings;
        clock += PERSIST_PING_CACHE_MS - 1;
        expect(await cached.ping()).toBe(true);
        expect(cached.stats().pings).toBe(first);
        clock += 2;
        expect(await cached.ping()).toBe(true);
        expect(cached.stats().pings).toBe(first + 1);
      } finally {
        await cached.close();
      }
      const other = createDurableInbox({
        password: rec.secretHex,
        databaseUrl: url,
        snapshotNonce: `${snapshotNonce}-other`,
      });
      try {
        const isolated = await other.load();
        expect(isolated.offers.some((o) => o.id === snapshotNonce)).toBe(false);
      } finally {
        await other.close();
      }
    } finally {
      await cleanup`
        delete from remit_envelopes
        where nonce like ${`${snapshotNonce}%`}
      `;
      await cleanup.end({ timeout: 5 });
      await store.close();
    }
  });
});
