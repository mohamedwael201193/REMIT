import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { blake2b } from "@noble/hashes/blake2b";
import { sha256 } from "@noble/hashes/sha2";
import type { RemitPrivateState } from "./state.js";
import { fromHex, toHex, toBase64Url, fromBase64Url } from "./bytes.js";

const MAGIC = new TextEncoder().encode("RMTPS1");

/** SHA-256(network || pool || wallet). Do not use the raw address as a storage key. */
export function privateStateNamespace(network: string, pool: string, wallet: string): string {
  return toHex(sha256(new TextEncoder().encode(`${network}|${pool}|${wallet}`)));
}

export function tabStorageKeys(network: string, pool: string, wallet: string) {
  const id = privateStateNamespace(network, pool, wallet);
  return { wrap: `remit:wrap:${id}`, blob: `remit:blob:${id}` };
}

/** Pre-hash keys embedded the raw address. Migrate then delete. */
export function legacyTabStorageKeys(network: string, pool: string, wallet: string) {
  return { wrap: `remit:wrap:${network}:${pool}:${wallet}`, blob: `remit:blob:${network}:${pool}:${wallet}` };
}

export function migrateTabPrivateStorage(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void } | undefined,
  network: string,
  pool: string,
  wallet: string,
) {
  if (!storage) return;
  const next = tabStorageKeys(network, pool, wallet);
  const prev = legacyTabStorageKeys(network, pool, wallet);
  const hasNext = Boolean(storage.getItem(next.wrap) && storage.getItem(next.blob));
  if (!hasNext) {
    const wrap = storage.getItem(prev.wrap);
    const blob = storage.getItem(prev.blob);
    if (wrap && blob) {
      storage.setItem(next.wrap, wrap);
      storage.setItem(next.blob, blob);
    }
  }
  storage.removeItem(prev.wrap);
  storage.removeItem(prev.blob);
}

export function clearTabPrivateStorage(
  storage: { removeItem(key: string): void; key(i: number): string | null; length: number } | undefined,
) {
  if (!storage) return;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && (k.startsWith("remit:wrap:") || k.startsWith("remit:blob:") || k === "remit:adapter")) keys.push(k);
  }
  for (const k of keys) storage.removeItem(k);
}

export function freshTabWrapKey(): Uint8Array {
  return randomBytes(32);
}

export function tabWrapKeyFromHex(hex: string): Uint8Array {
  return fromHex(hex);
}

export function sealTabPrivateState(ps: RemitPrivateState, wrapKey: Uint8Array): string {
  const nonce = randomBytes(24);
  const key = blake2b(wrapKey, { dkLen: 32 });
  const ct = xchacha20poly1305(key, nonce).encrypt(new TextEncoder().encode(JSON.stringify(ps)));
  const out = new Uint8Array(MAGIC.length + 24 + ct.length);
  out.set(MAGIC, 0);
  out.set(nonce, MAGIC.length);
  out.set(ct, MAGIC.length + 24);
  return toBase64Url(out);
}

export function openTabPrivateState(blob: string, wrapKey: Uint8Array): RemitPrivateState {
  const raw = fromBase64Url(blob);
  if (raw.length < MAGIC.length + 24 + 16) throw new Error("truncated tab private state");
  if (Buffer.from(raw.subarray(0, MAGIC.length)).toString() !== "RMTPS1") {
    throw new Error("bad tab private-state magic");
  }
  const nonce = Uint8Array.from(raw.subarray(MAGIC.length, MAGIC.length + 24));
  const ct = Uint8Array.from(raw.subarray(MAGIC.length + 24));
  const key = blake2b(wrapKey, { dkLen: 32 });
  const pt = xchacha20poly1305(key, nonce).decrypt(ct);
  return JSON.parse(Buffer.from(pt).toString("utf8")) as RemitPrivateState;
}

export function wrapKeyHex(key: Uint8Array): string {
  return toHex(key);
}
