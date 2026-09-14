import { x25519 } from "@noble/curves/ed25519";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { blake2b } from "@noble/hashes/blake2b";
import { RemitError } from "./errors.js";
import { toHex, fromHex, toBase64Url, fromBase64Url } from "./bytes.js";

const MAGIC = new TextEncoder().encode("RMTB1");

function sharedKey(priv: Uint8Array, pub: Uint8Array): Uint8Array {
  const secret = x25519.getSharedSecret(priv, pub);
  return blake2b(secret, { dkLen: 32 });
}

export function rfqKeyPair(): { secretHex: string; publicHex: string } {
  const secret = x25519.utils.randomSecretKey();
  const pub = x25519.getPublicKey(secret);
  return { secretHex: toHex(secret), publicHex: toHex(pub) };
}

export function rfqPublicFromSecret(secretHex: string): string {
  return toHex(x25519.getPublicKey(fromHex(secretHex)));
}

export function sealTo(recipientPubHex: string, plaintext: Uint8Array): string {
  const eph = x25519.utils.randomSecretKey();
  const ephPub = x25519.getPublicKey(eph);
  const key = sharedKey(eph, fromHex(recipientPubHex));
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(key, nonce);
  const ct = cipher.encrypt(plaintext);
  const out = new Uint8Array(MAGIC.length + 32 + 24 + ct.length);
  out.set(MAGIC, 0);
  out.set(ephPub, MAGIC.length);
  out.set(nonce, MAGIC.length + 32);
  out.set(ct, MAGIC.length + 56);
  return toBase64Url(out);
}

export function openSealed(secretHex: string, boxed: string): Uint8Array {
  const raw = fromBase64Url(boxed);
  if (raw.length < MAGIC.length + 56 + 16) throw new RemitError("SEALED_BOX", "truncated box");
  if (Buffer.from(raw.subarray(0, MAGIC.length)).toString() !== "RMTB1") {
    throw new RemitError("SEALED_BOX", "bad box magic");
  }
  const ephPub = Uint8Array.from(raw.subarray(MAGIC.length, MAGIC.length + 32));
  const nonce = Uint8Array.from(raw.subarray(MAGIC.length + 32, MAGIC.length + 56));
  const ct = Uint8Array.from(raw.subarray(MAGIC.length + 56));
  const key = sharedKey(fromHex(secretHex), ephPub);
  try {
    return xchacha20poly1305(key, nonce).decrypt(ct);
  } catch {
    throw new RemitError("SEALED_BOX", "unseal failed");
  }
}

export function sealJson(recipientPubHex: string, obj: unknown): string {
  return sealTo(recipientPubHex, Buffer.from(JSON.stringify(obj), "utf8"));
}

export function openJson<T>(secretHex: string, boxed: string): T {
  const pt = openSealed(secretHex, boxed);
  return JSON.parse(Buffer.from(pt).toString("utf8")) as T;
}
