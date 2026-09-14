import { sha256 } from "@noble/hashes/sha256";

export function createHash(_alg: string) {
  const chunks: Uint8Array[] = [];
  return {
    update(data: string | Uint8Array) {
      chunks.push(typeof data === "string" ? new TextEncoder().encode(data) : data);
      return this;
    },
    digest() {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const all = new Uint8Array(total);
      let o = 0;
      for (const c of chunks) {
        all.set(c, o);
        o += c.length;
      }
      return sha256(all);
    },
  };
}

export const randomBytes = (n: number) => {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
};

export default { createHash, randomBytes };
