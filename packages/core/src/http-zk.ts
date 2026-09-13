import { ZKConfigProvider, createProverKey, createVerifierKey, createZKIR } from "@midnight-ntwrk/midnight-js-types";
import { RemitError } from "./errors.js";

function apiRoot(url: string): string {
  return url.replace(/\/$/, "");
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new RemitError("CONFIG", `zk artifact HTTP ${res.status}`, url);
  return new Uint8Array(await res.arrayBuffer());
}

async function fetchFirst(urls: string[]): Promise<Uint8Array> {
  let last = "missing zk artifact";
  for (const url of urls) {
    try {
      return await fetchBytes(url);
    } catch (e) {
      last = e instanceof Error ? e.message : last;
    }
  }
  throw new RemitError("CONFIG", last, urls[0]);
}

/**
 * Browser- and Node-safe ZK artifact loader.
 * Pool keys:  {base}/keys/{circuit}.prover
 * Quote keys: {base}/keys/quote/{circuit}.prover
 * ZKIR:       {base}/zkir/{circuit}.bzkir or .zkir
 */
export class HttpZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  constructor(
    readonly baseUrl: string,
    readonly scope: "pool" | "quote" = "pool",
  ) {
    super();
  }

  private keysPrefix(): string {
    const root = apiRoot(this.baseUrl);
    return this.scope === "quote" ? `${root}/keys/quote` : `${root}/keys`;
  }

  private zkirPrefix(): string {
    const root = apiRoot(this.baseUrl);
    return this.scope === "quote" ? `${root}/zkir/quote` : `${root}/zkir`;
  }

  getProverKey(circuitId: K) {
    return fetchBytes(`${this.keysPrefix()}/${circuitId}.prover`).then(createProverKey);
  }

  getVerifierKey(circuitId: K) {
    return fetchBytes(`${this.keysPrefix()}/${circuitId}.verifier`).then(createVerifierKey);
  }

  getZKIR(circuitId: K) {
    return fetchFirst([
      `${this.zkirPrefix()}/${circuitId}.bzkir`,
      `${this.zkirPrefix()}/${circuitId}.zkir`,
    ]).then(createZKIR);
  }
}
