/**
 * Detect whether the compiled pool contract has MBBE Offer/fill types.
 * Import of `Offer` from `@remit/contracts/pool` is intentional: when the
 * managed artifact gains `expiry`, these tests must run for real.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Offer } from "@remit/contracts/pool";

export const MBBE_PROBE_PENDING = "MBBE_PROBE_PENDING";

export type CompiledOffer = Offer;

function poolJsPath(): string {
  try {
    return fileURLToPath(import.meta.resolve("@remit/contracts/pool"));
  } catch {
    return join(process.cwd(), "CONTRACT", "managed", "remit_pool", "contract", "index.js");
  }
}

function contractInfoPath(): string {
  return join(dirname(poolJsPath()), "..", "compiler", "contract-info.json");
}

function readInfo(): {
  circuits?: Array<{ name: string; arguments?: Array<{ name: string }>; pure?: boolean; proof?: boolean }>;
  witnesses?: Array<{ name: string }>;
} {
  return JSON.parse(readFileSync(contractInfoPath(), "utf8")) as ReturnType<typeof readInfo>;
}

function offerFieldNames(): string[] {
  const js = readFileSync(poolJsPath(), "utf8");
  const block = js.match(/class _Offer_0[\s\S]{0,1200}?fromValue\(value_0\) \{\s*return \{([^}]+)\}/);
  if (block) {
    return [...block[1].matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]!);
  }
  const dts = readFileSync(poolJsPath().replace(/\.js$/i, ".d.ts"), "utf8");
  const t = dts.match(/export type Offer = \{([\s\S]*?)\}/);
  if (t) return [...t[1].matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]!);
  return [];
}

/** True when the compiled `Offer` struct includes MBBE `expiry`. */
export function compiledOfferHasExpiry(): boolean {
  const fields = offerFieldNames();
  if (fields.includes("expiry") && fields.includes("minFillBase")) return true;
  try {
    const info = readInfo();
    const oc = info.circuits?.find((c) => c.name === "offerCommitment");
    const offerArg = (oc as { arguments?: Array<{ name: string; type?: { elements?: Array<{ name: string }> } }> } | undefined)
      ?.arguments?.find((a) => a.name === "o");
    const names = offerArg?.type?.elements?.map((e) => e.name) ?? [];
    return names.includes("expiry");
  } catch {
    return false;
  }
}

export function compiledMbbeBook(): boolean {
  try {
    const names = (readInfo().witnesses ?? []).map((w) => w.name);
    if (names.includes("book") && names.includes("chosenIndex") && names.includes("fillBase") && names.includes("fillQuote")) {
      return true;
    }
  } catch {
    /* fall through to JS */
  }
  const js = readFileSync(poolJsPath(), "utf8");
  return /witnesses\.book\(/.test(js) && /witnesses\.chosenIndex\(/.test(js) && /witnesses\.fillBase\(/.test(js);
}

export function compiledMbbeReady(): boolean {
  return compiledOfferHasExpiry() && compiledMbbeBook();
}

export function fillPublicArgumentNames(): string[] {
  const fill = readInfo().circuits?.find((c) => c.name === "fill" && c.pure === false);
  return (fill?.arguments ?? []).map((a) => a.name);
}

export function impureCircuitNames(): string[] {
  return (readInfo().circuits ?? []).filter((c) => c.pure === false && c.proof === true).map((c) => c.name);
}

export function managedPoolJs(): string {
  return readFileSync(poolJsPath(), "utf8");
}

export function managedPoolDts(): string {
  return readFileSync(poolJsPath().replace(/\.js$/i, ".d.ts"), "utf8");
}

export function hasResidualHelpers(): boolean {
  const js = managedPoolJs();
  const dts = managedPoolDts();
  return /residualPayNonceOf/.test(js) && /residualRandOf/.test(js) && /residualPayNonceOf/.test(dts);
}

export function mbbeDescribeTitle(name: string): string {
  return compiledMbbeReady() ? name : `${name} [${MBBE_PROBE_PENDING}]`;
}
