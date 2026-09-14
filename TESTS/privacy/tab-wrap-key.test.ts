import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { emptyPrivateState } from "../../packages/core/src/state.ts";
import {
  freshTabWrapKey,
  openTabPrivateState,
  sealTabPrivateState,
  tabStorageKeys,
  tabWrapKeyFromHex,
  wrapKeyHex,
  migrateTabPrivateStorage,
} from "../../packages/core/src/tab-seal.ts";

function functionSource(src: string, name: string): string {
  const start = src.search(new RegExp(`function\\s+${name}\\b`));
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = src.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed function ${name}`);
}

function installMemoryStorage(): { map: Map<string, string>; restore: () => void } {
  const map = new Map<string, string>();
  const storage = {
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
  };
  const prev = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  return {
    map,
    restore() {
      if (prev) Object.defineProperty(globalThis, "sessionStorage", prev);
      else Reflect.deleteProperty(globalThis, "sessionStorage");
    },
  };
}

describe("browser wrap-key: sessionStorage must not hold plaintext ownerSk JSON", () => {
  const restores: Array<() => void> = [];
  afterEach(() => {
    while (restores.length) restores.pop()?.();
  });

  it("writeTabPrivate source seals with sealTabPrivateState (no JSON.stringify(ps))", () => {
    const src = readFileSync(resolve("packages/sdk/src/browser-circuits.ts"), "utf8");
    const write = functionSource(src, "writeTabPrivate");
    expect(write).toMatch(/sealTabPrivateState\s*\(\s*ps\s*,/);
    expect(write).toMatch(/sessionStorage\?\.setItem\(\s*keys\.blob\s*,\s*blob\s*\)/);
    expect(/JSON\.stringify\(\s*ps\s*\)/.test(write)).toBe(false);
    expect(/setItem\([^)]*JSON\.stringify/.test(write)).toBe(false);
  });

  it("invoking writeTabPrivate against a memory sessionStorage never stores plaintext ownerSk JSON", () => {
    const src = readFileSync(resolve("packages/sdk/src/browser-circuits.ts"), "utf8");
    const write = functionSource(src, "writeTabPrivate");
    const brace = write.indexOf("{");
    const body = write.slice(brace + 1, write.lastIndexOf("}"));
    const writeTabPrivate = new Function(
      "tabStorageKeys",
      "freshTabWrapKey",
      "wrapKeyHex",
      "tabWrapKeyFromHex",
      "sealTabPrivateState",
      "migrateTabPrivateStorage",
      `return function writeTabPrivate(network, pool, wallet, ps) {\n${body}\n};`,
    )(tabStorageKeys, freshTabWrapKey, wrapKeyHex, tabWrapKeyFromHex, sealTabPrivateState, migrateTabPrivateStorage) as (
      network: string,
      pool: string,
      wallet: string,
      ps: ReturnType<typeof emptyPrivateState>,
    ) => void;

    const { map, restore } = installMemoryStorage();
    restores.push(restore);

    const ps = emptyPrivateState("wrap-key-test");
    ps.ownerSk = Array.from({ length: 32 }, (_, i) => 200 + i);
    writeTabPrivate("preprod", "pool-v2", "wallet-a", ps);

    const plaintext = JSON.stringify(ps);
    expect(plaintext.includes('"ownerSk"')).toBe(true);
    expect(plaintext.includes("200,201,202")).toBe(true);
    const stored = [...map.values()];
    expect(stored.length).toBe(2);
    for (const v of stored) {
      expect(v.includes(plaintext), "sessionStorage holds plaintext RemitPrivateState JSON").toBe(false);
      expect(v.includes('"ownerSk"'), "sessionStorage holds plaintext ownerSk JSON").toBe(false);
      expect(v.includes("200,201,202")).toBe(false);
    }
    const keys = tabStorageKeys("preprod", "pool-v2", "wallet-a");
    const wrapHex = map.get(keys.wrap);
    const blob = map.get(keys.blob);
    expect(wrapHex).toMatch(/^[0-9a-f]{64}$/i);
    expect(blob).toBeTruthy();
    expect(blob!.startsWith("JSON")).toBe(false);
    const opened = openTabPrivateState(blob!, tabWrapKeyFromHex(wrapHex!));
    expect(opened.ownerSk).toEqual(ps.ownerSk);
  });

  it("wallet B wrap key cannot open wallet A's blob; wrap hex is not stored inside the blob", () => {
    const wrapA = freshTabWrapKey();
    const wrapB = freshTabWrapKey();
    const psA = emptyPrivateState("wallet-a");
    psA.ownerSk = Array.from({ length: 32 }, (_, i) => 11 + i);
    psA.mandates = [
      {
        mandate: {
          principal: Array.from({ length: 32 }, () => 1),
          executor: Array.from({ length: 32 }, () => 2),
          side: "0",
          maxFillBase: "50",
          limitNum: "30",
          limitDen: "1000",
          cpRoot: "0",
          expiry: "4000000000",
          mandateId: Array.from({ length: 32 }, (_, i) => 40 + i),
        },
        rand: Array.from({ length: 32 }, (_, i) => 90 + i),
      },
    ];
    const blobA = sealTabPrivateState(psA, wrapA);
    expect(blobA.includes("ownerSk")).toBe(false);
    expect(blobA.includes("11,12,13")).toBe(false);
    expect(blobA.includes("90,91,92")).toBe(false);
    expect(blobA.toLowerCase().includes(wrapKeyHex(wrapA))).toBe(false);
    expect(blobA.toLowerCase().includes(wrapKeyHex(wrapB))).toBe(false);
    expect(() => openTabPrivateState(blobA, wrapB)).toThrow();
    const opened = openTabPrivateState(blobA, wrapA);
    expect(opened.ownerSk).toEqual(psA.ownerSk);
    expect(opened.mandates[0]?.rand).toEqual(psA.mandates[0]?.rand);

    const keysA = tabStorageKeys("preprod", "pool", "wallet-a");
    const keysB = tabStorageKeys("preprod", "pool", "wallet-b");
    expect(keysA.wrap).not.toBe(keysB.wrap);
    expect(keysA.blob).not.toBe(keysB.blob);
  });

  it("sdk/front sources do not persist plaintext RemitPrivateState JSON", () => {
    const files = [
      "packages/sdk/src/browser-circuits.ts",
      "packages/sdk/src/browser-session.ts",
      "packages/sdk/src/connector-wallet.ts",
      "packages/core/src/memory-state.ts",
      "front/src/lib/remit/circuit-call.ts",
      "front/src/lib/remit/live-provider.ts",
      "front/src/lib/remit/local-provider.ts",
    ];
    for (const rel of files) {
      const src = readFileSync(resolve(rel), "utf8");
      expect(src.includes("JSON.stringify(ps)"), `${rel} stringifies private state`).toBe(false);
      expect(/localStorage\.setItem/.test(src), `${rel} writes localStorage`).toBe(false);
    }
    const seal = readFileSync(resolve("packages/core/src/tab-seal.ts"), "utf8");
    expect(seal).toMatch(/RMTPS1/);
    expect(seal).toMatch(/JSON\.stringify\(ps\)/);
    expect(seal).toMatch(/xchacha20poly1305/);
  });
});
