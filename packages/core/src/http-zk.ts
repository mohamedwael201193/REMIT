import { ZKConfigProvider, createProverKey, createVerifierKey, createZKIR } from "@midnight-ntwrk/midnight-js-types";
import { RemitError } from "./errors.js";

function apiRoot(url: string): string {
  return url.replace(/\/$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  let last = `zk artifact HTTP for ${url}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
      last = `zk artifact HTTP ${res.status}`;
      if (!retryableStatus(res.status)) throw new RemitError("CONFIG", last, url);
    } catch (e) {
      if (e instanceof RemitError) throw e;
      last = e instanceof Error ? e.message : last;
    }
    if (attempt < 3) await sleep(250 * 2 ** attempt);
  }
  throw new RemitError("CONFIG", last, url);
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
