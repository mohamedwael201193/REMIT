/** JSON keys that must never appear on public HTTP, evidence, or agent status. */
export const PUBLIC_LEAK_KEYS = [
  "fillBase",
  "fillQuote",
  "chosenIndex",
  "offerRand",
  "payNonce",
  "rfqSk",
  "execSk",
  "openings",
  "ownerSk",
  "residualBase",
  "residualQuote",
  "ownerSecret",
  "executorSecret",
] as const;

export type PublicLeakKey = (typeof PUBLIC_LEAK_KEYS)[number];

const LEAK_KEY_SET = new Set<string>(PUBLIC_LEAK_KEYS);

/** Unquoted identifiers that are never ordinary English (do not include "openings"). */
const TECHNICAL_TOKENS = [
  "fillBase",
  "fillQuote",
  "chosenIndex",
  "offerRand",
  "payNonce",
  "rfqSk",
  "execSk",
  "ownerSk",
  "residualBase",
  "residualQuote",
  "ownerSecret",
  "executorSecret",
] as const;

const TECHNICAL_TOKEN_RE = new RegExp(`\\b(${TECHNICAL_TOKENS.join("|")})\\b`);

export function hasPublicLeakToken(text: string): boolean {
  if (TECHNICAL_TOKEN_RE.test(text)) return true;
  for (const k of PUBLIC_LEAK_KEYS) {
    if (text.includes(`"${k}"`)) return true;
  }
  return false;
}

export function publicLeakHits(payload: unknown): string[] {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  return PUBLIC_LEAK_KEYS.filter((k) => {
    if (text.includes(`"${k}"`)) return true;
    return (TECHNICAL_TOKENS as readonly string[]).includes(k) && new RegExp(`\\b${k}\\b`).test(text);
  });
}

/** Drop a public detail entirely when it names private fill/opening fields (do not leave residual amounts). */
export function sanitizePublicDetail(detail: string | undefined): string | undefined {
  if (detail == null || detail === "") return undefined;
  const clipped = detail.slice(0, 240);
  if (hasPublicLeakToken(clipped)) return undefined;
  return clipped;
}

/** Remove leak keys and poison strings from a JSON-able public payload. */
export function stripPublicLeaks<T>(value: T): T {
  if (typeof value === "string") return (hasPublicLeakToken(value) ? undefined : value) as T;
  if (Array.isArray(value)) return value.map((item) => stripPublicLeaks(item)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (LEAK_KEY_SET.has(k)) continue;
      out[k] = stripPublicLeaks(v);
    }
    return out as T;
  }
  return value;
}
