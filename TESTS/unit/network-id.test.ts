import { describe, expect, it } from "vitest";
import { normalizeMidnightNetworkId } from "../../packages/core/src/network-id.ts";

describe("Midnight network id for 1AM circuit calls", () => {
  it("maps Preprod wallet strings to midnight-js preprod", () => {
    expect(normalizeMidnightNetworkId("preprod")).toBe("preprod");
    expect(normalizeMidnightNetworkId("Preprod")).toBe("preprod");
    expect(normalizeMidnightNetworkId("midnight-preprod")).toBe("preprod");
  });

  it("keeps preview, mainnet, and undeployed distinct", () => {
    expect(normalizeMidnightNetworkId("preview")).toBe("preview");
    expect(normalizeMidnightNetworkId("mainnet")).toBe("mainnet");
    expect(normalizeMidnightNetworkId("undeployed")).toBe("undeployed");
  });
});
