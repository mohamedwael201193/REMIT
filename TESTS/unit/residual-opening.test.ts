import { describe, expect, it } from "vitest";
import { makeOfferBox, openOfferBox, residualOf, sliceAmounts, withOfferDefaults } from "../../packages/core/src/index.ts";
import { rfqKeyPair } from "../../packages/core/src/box.ts";
import { randomBytes32 } from "../../packages/core/src/bytes.ts";

describe("residual opening after a 50/80 fill", () => {
  it("derives a 30-base residual that cannot reuse the consumed payNonce", () => {
    const offer = withOfferDefaults({
      side: 1n,
      baseAmount: 80n,
      quoteAmount: 3200n,
      maker: randomBytes32(),
      payNonce: randomBytes32(),
      expiry: 4_000_000_000n,
      minFillBase: 10n,
    });
    const rand = randomBytes32();
    const slice = sliceAmounts(offer, 50n);
    expect(slice).toEqual({ fillBase: 50n, fillQuote: 2000n });
    const residual = residualOf(offer, rand, slice.fillBase, slice.fillQuote);
    expect(residual.offer.baseAmount).toBe(30n);
    expect(residual.offer.quoteAmount).toBe(1200n);
    expect(Buffer.from(residual.offer.payNonce).equals(Buffer.from(offer.payNonce))).toBe(false);
    expect(Buffer.from(residual.rand).equals(Buffer.from(rand))).toBe(false);
  });

  it("can unseal a settled RFQ box after inbox TTL for residual reconstruction, still rejecting replay", () => {
    const rec = rfqKeyPair();
    const { boxed } = makeOfferBox(
      rec.publicHex,
      {
        side: "1",
        baseAmount: "80",
        quoteAmount: "3200",
        maker: Array.from({ length: 32 }, () => 1),
        payNonce: Array.from({ length: 32 }, () => 2),
      },
      Array.from({ length: 32 }, () => 3),
      -60_000,
    );
    expect(() => openOfferBox(rec.secretHex, boxed, rec.publicHex)).toThrow(/expired/);
    const opened = openOfferBox(rec.secretHex, boxed, rec.publicHex, { allowExpired: true });
    expect(opened.offer.baseAmount).toBe("80");
    expect(() => openOfferBox(rec.secretHex, boxed, rec.publicHex, { allowExpired: true })).toThrow(/replayed/);
  });
});
