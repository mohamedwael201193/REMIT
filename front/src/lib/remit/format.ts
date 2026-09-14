/**
 * Display formatting for the REMIT product surfaces.
 * All user-visible numerals pass through here so the presentation
 * stays consistent when the real SDK replaces the local provider.
 */

import { PRIVACY_LABEL_COPY } from "./types";

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdFmtCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(n: number | null | undefined, cents = false): string {
  if (n == null) return PRIVACY_LABEL_COPY.sealed;
  return cents ? usdFmtCents.format(n) : usdFmt.format(n);
}

export function formatCompactUsd(n: number | null | undefined): string {
  if (n == null) return PRIVACY_LABEL_COPY.sealed;
  if (Math.abs(n) >= 1_000_000)
    return `$${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  if (Math.abs(n) >= 1_000)
    return `$${(n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
  return usdFmt.format(n);
}

export function formatAmount(n: number, precision: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(precision, 2),
    maximumFractionDigits: precision,
  });
}

/** Short, product-facing reference, e.g. "MD-2841". */
export function shortRef(ref: string): string {
  return ref;
}

/** Truncated commitment reference, e.g. "prf_7c1d…a90e". */
export function shortCommitment(ref: string): string {
  if (ref.length <= 12) return ref;
  return `${ref.slice(0, 8)}…${ref.slice(-4)}`;
}

export function shortAddress(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function timeAgo(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const past = diff >= 0;

  const fmt = (v: number, unit: string) =>
    past
      ? v === 1
        ? `${unit} ago`
        : `${v} ${unit}s ago`
      : v === 1
        ? `in ${unit}`
        : `in ${v} ${unit}s`;

  if (abs < 60_000) return past ? "just now" : "moments away";
  if (abs < 3_600_000) return fmt(Math.floor(abs / 60_000), "min");
  if (abs < 86_400_000) return fmt(Math.floor(abs / 3_600_000), "hour");
  if (abs < 30 * 86_400_000) return fmt(Math.floor(abs / 86_400_000), "day");
  return fmt(Math.floor(abs / (30 * 86_400_000)), "month");
}

export function formatDateTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatClock(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Side label with trade-appropriate verb. */
export function sideLabel(side: "buy" | "sell"): string {
  return side === "buy" ? "Buy" : "Sell";
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
