import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Maker browser RFQ path", () => {
  it("placeOfferFromWallet encrypts and POSTs /rfq/offer after Compact placeOffer", () => {
    const src = readFileSync(resolve("packages/sdk/src/browser-circuits.ts"), "utf8");
    expect(src).toMatch(/export async function placeOfferFromWallet/);
    expect(src).toMatch(/circuitId: "placeOffer"/);
    expect(src).toMatch(/makeOfferBox/);
    expect(src).toMatch(/\/rfq\/offer/);
    expect(src).toMatch(/writeTabPrivate/);
    expect(src).not.toMatch(/This tab does not post RFQ/);
  });

  it("Maker desk posts a real offer instead of a demo object", () => {
    const view = readFileSync(resolve("front/src/components/remit/app/view-offers.tsx"), "utf8");
    expect(view).toMatch(/placeOffer/);
    expect(view).toMatch(/My offer is private/);
    expect(view).not.toMatch(/This tab does not post RFQ boxes/);
  });
});
