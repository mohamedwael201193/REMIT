import { describe, it, expect, afterEach } from "vitest";
import { HttpZkConfigProvider } from "../../packages/core/src/http-zk.ts";

describe("HTTP ZK config for in-browser proving", () => {
  const original = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = original;
  });

  it("loads pool prover/verifier from /keys and zkir from .zkir fallback", async () => {
    const hits: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      hits.push(url);
      if (url.endsWith(".bzkir")) return new Response("missing", { status: 404 });
      if (url.includes("/keys/deposit.prover")) return new Response(new Uint8Array([1, 2, 3]));
      if (url.includes("/keys/deposit.verifier")) return new Response(new Uint8Array([4, 5]));
      if (url.endsWith("/zkir/deposit.zkir")) return new Response(new Uint8Array([9]));
      return new Response("no", { status: 404 });
    }) as typeof fetch;

    const zk = new HttpZkConfigProvider("https://remit-api-node.onrender.com");
    const pk = await zk.getProverKey("deposit");
    const vk = await zk.getVerifierKey("deposit");
    const zkir = await zk.getZKIR("deposit");
    expect(pk.byteLength).toBe(3);
    expect(vk.byteLength).toBe(2);
    expect(zkir.byteLength).toBe(1);
    expect(hits.some((u) => u.includes("/keys/deposit.prover"))).toBe(true);
    expect(hits.some((u) => u.includes("/zkir/deposit.zkir"))).toBe(true);
  });

  it("retries 5xx prover fetches then succeeds", async () => {
    let hits = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("/keys/revokeMandate.prover")) return new Response("no", { status: 404 });
      hits += 1;
      if (hits === 1) return new Response("spinning", { status: 500 });
      return new Response(new Uint8Array([8, 9]));
    }) as typeof fetch;
    const zk = new HttpZkConfigProvider("https://remit-api-node.onrender.com");
    const pk = await zk.getProverKey("revokeMandate");
    expect(pk.byteLength).toBe(2);
    expect(hits).toBe(2);
  });

  it("does not retry a missing withdraw prover", async () => {
    let hits = 0;
    globalThis.fetch = (async () => {
      hits += 1;
      return new Response("missing", { status: 404 });
    }) as typeof fetch;
    const zk = new HttpZkConfigProvider("https://api.example");
    await expect(zk.getProverKey("withdraw")).rejects.toThrow(/zk artifact HTTP 404/);
    expect(hits).toBe(1);
  });

  it("scopes quote artifacts under /keys/quote and /zkir/quote", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/keys/quote/claim.prover")) return new Response(new Uint8Array([7]));
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    const zk = new HttpZkConfigProvider("https://api.example", "quote");
    const pk = await zk.getProverKey("claim");
    expect(pk.byteLength).toBe(1);
  });
});
