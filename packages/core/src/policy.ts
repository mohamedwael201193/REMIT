import { pureCircuits } from "@remit/contracts/pool";
import type { Mandate, Offer } from "@remit/contracts/pool";
import { RemitError } from "./errors.js";
import { fromHex, toHex } from "./bytes.js";

export type PolicyFail =
  | "wrong-executor"
  | "expired"
  | "revoked"
  | "over-cap"
  | "price"
  | "budget"
  | "side"
  | "counterparty"
  | "zero";

export type PolicyResult = { ok: true } | { ok: false; reason: PolicyFail };

export function checkFillPolicy(args: {
  esk: Uint8Array;
  mandate: Mandate;
  offer: Offer;
  remaining: bigint;
  nowBound: bigint;
  revoked: boolean;
  counterpartyAllowed: boolean;
}): PolicyResult {
  const { esk, mandate: m, offer: o, remaining, nowBound, revoked, counterpartyAllowed } = args;
  const exec = pureCircuits.executorKey(esk);
  if (Buffer.compare(Buffer.from(exec), Buffer.from(m.executor)) !== 0) return { ok: false, reason: "wrong-executor" };
  if (revoked) return { ok: false, reason: "revoked" };
  if (nowBound > m.expiry) return { ok: false, reason: "expired" };
  if (o.baseAmount === 0n || o.quoteAmount === 0n) return { ok: false, reason: "zero" };
  if (o.side === m.side) return { ok: false, reason: "side" };
  if (o.baseAmount > m.maxFillBase) return { ok: false, reason: "over-cap" };
  const priceOk =
    m.side === 0n
      ? pureCircuits.priceAtLeast(o.baseAmount, o.quoteAmount, m.limitNum, m.limitDen)
      : pureCircuits.priceAtMost(o.baseAmount, o.quoteAmount, m.limitNum, m.limitDen);
  if (!priceOk) return { ok: false, reason: "price" };
  const pays = m.side === 0n ? o.baseAmount : o.quoteAmount;
  if (pays > remaining) return { ok: false, reason: "budget" };
  if (!counterpartyAllowed) return { ok: false, reason: "counterparty" };
  return { ok: true };
}

export function assertFillPolicy(args: Parameters<typeof checkFillPolicy>[0]): void {
  const r = checkFillPolicy(args);
  if (!r.ok) throw new RemitError("POLICY_REJECT", "fill fails mandate policy", r.reason);
}

export function scoreCompliantOffer(o: Offer, m: Mandate): bigint {
  if (m.side === 0n) return o.quoteAmount * m.limitDen - o.baseAmount * m.limitNum;
  return o.baseAmount * m.limitNum - o.quoteAmount * m.limitDen;
}

/** Public executor identity. Never returns the executor secret. */
export function publicExecutorKeyHex(execSkHex: string): string | undefined {
  if (!/^[0-9a-fA-F]{64}$/.test(execSkHex)) return undefined;
  return toHex(pureCircuits.executorKey(fromHex(execSkHex)));
}

export function indexerWsFromHttp(httpUrl: string): string {
  const ws = httpUrl.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  return ws.endsWith("/ws") ? ws : `${ws.replace(/\/$/, "")}/ws`;
}
