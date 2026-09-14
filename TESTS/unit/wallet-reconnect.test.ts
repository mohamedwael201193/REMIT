import { describe, expect, it } from "vitest";
import {
  clearPrivateVault,
  clearWalletVault,
  forgetAdapter,
  rememberAdapter,
  rememberedAdapter,
  type MidnightWindow,
} from "../../front/src/lib/remit/midnight-connector.ts";

function memoryWindow(): MidnightWindow & { sessionStorage: Storage } {
  const map = new Map<string, string>();
  const sessionStorage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
    key(i: number) {
      return [...map.keys()][i] ?? null;
    },
  } as Storage;
  return { sessionStorage } as MidnightWindow & { sessionStorage: Storage };
}

describe("wallet adapter memory vs private vault", () => {
  it("remembers adapter kind without storing an address", () => {
    const win = memoryWindow();
    expect(rememberedAdapter(win)).toBeNull();
    rememberAdapter("1am", win);
    expect(rememberedAdapter(win)).toBe("1am");
    expect(win.sessionStorage.getItem("remit:adapter")).not.toMatch(/mn_addr/);
    forgetAdapter(win);
    expect(rememberedAdapter(win)).toBeNull();
  });

  it("identity switch clears vault blobs but disconnect also forgets adapter", () => {
    const win = memoryWindow();
    rememberAdapter("1am", win);
    win.sessionStorage.setItem("remit:wrap:aaa", "wrap-a");
    win.sessionStorage.setItem("remit:blob:aaa", "blob-a");
    clearPrivateVault(win);
    expect(win.sessionStorage.getItem("remit:wrap:aaa")).toBeNull();
    expect(win.sessionStorage.getItem("remit:blob:aaa")).toBeNull();
    expect(rememberedAdapter(win)).toBe("1am");
    clearWalletVault(win);
    expect(rememberedAdapter(win)).toBeNull();
  });
});
