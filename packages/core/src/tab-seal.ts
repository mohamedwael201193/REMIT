import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { blake2b } from "@noble/hashes/blake2b";
import type { RemitPrivateState } from "./state.js";
import { fromHex, toHex } from "./bytes.js";

const MAGIC = new TextEncoder().encode("RMTPS1");

export function tabStorageKeys(network: string, pool: string, wallet: string) {
  const id = `${network}:${pool}:${wallet}`;
  return { wrap: `remit:wrap:${id}`, blob: `remit:blob:${id}` };
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
  return Buffer.from(out).toString("base64url");
}

export function openTabPrivateState(blob: string, wrapKey: Uint8Array): RemitPrivateState {
  const raw = Buffer.from(blob, "base64url");
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
