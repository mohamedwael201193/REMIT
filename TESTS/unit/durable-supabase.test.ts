import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createDurableInbox, ensureRemitSchema } from "../../apps/api/src/durable.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { makeOfferBox } from "../../packages/core/src/rfq.ts";

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
      expect(await store.ping()).toBe(true);
    } finally {
      await store.close();
    }
  });
});
