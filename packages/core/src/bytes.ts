export const BYTES32 = 32;

export function randomBytes32(): Uint8Array {
  const out = new Uint8Array(32);
  crypto.getRandomValues(out);
  return out;
}

export function toHex(b: Uint8Array): string {
  return Buffer.from(b).toString("hex");
}

export function fromHex(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new Error("odd hex");
  return Uint8Array.from(Buffer.from(h, "hex"));
}

export function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a[i] ^ b[i];
  return x === 0;
}

export function toArray(b: Uint8Array): number[] {
  return Array.from(b);
}

export function fromArray(a: number[]): Uint8Array {
  return Uint8Array.from(a);
}

export function enc4(hex: string, dec: string, le: string, b64: string): string[] {
  return [hex, dec, le, b64];
}

export function encodingsOfBytes(b: Uint8Array): string[] {
  const hex = toHex(b);
  const dec = Array.from(b).map((n) => n.toString(10)).join(",");
  const b64 = Buffer.from(b).toString("base64");
  const out = [hex, hex.toUpperCase(), dec, b64, Buffer.from(b).toString("base64url")];
  if (b.length >= 8) {
    out.push(Buffer.from(b.subarray(0, 8)).readBigUInt64LE().toString(10));
    out.push(Buffer.from(b.subarray(0, 8)).toString("hex"));
  }
  return out;
}

export function encodingsOfBigint(n: bigint): string[] {
  const hex = n.toString(16);
  const dec = n.toString(10);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(n & ((1n << 64n) - 1n));
  return [hex, hex.toUpperCase(), dec, buf.toString("hex"), buf.toString("base64")];
}
