/**
 * Live display catalog. Production views import only these lookups.
 * Fantasy tickers, named desks, and fixture books are gone — not isolated.
 */

import type { AssetRef, Counterparty, Executor } from "./types";

/** Assets that live workspace views may resolve. */
export const LIVE_ASSETS: AssetRef[] = [
  {
    symbol: "tNIGHT",
    name: "Preprod tNIGHT",
    assetClass: "network-native",
    precision: 6,
    unit: "tNIGHT",
  },
  {
    symbol: "REMIT-Q",
    name: "REMIT-Q testnet quote token",
    assetClass: "network-native",
    precision: 0,
    unit: "REMIT-Q",
  },
  {
    symbol: "DUST",
    name: "Network Dust",
    assetClass: "network-native",
    precision: 2,
    unit: "DUST",
  },
];

export const assetBySymbol = (symbol: string): AssetRef =>
  LIVE_ASSETS.find((a) => a.symbol === symbol) ?? {
    symbol,
    name: symbol,
    assetClass: "network-native",
    precision: 0,
    unit: symbol,
  };

/** Live views: never invent Northline / settlement counts / a named desk. */
export const counterpartyById = (id: string): Counterparty => ({
  id,
  name: id === "cp-onchain" ? "On-chain maker" : id,
  desk: "",
  region: "",
  status: "pending",
  settlements: 0,
});

/** Live views: never resolve Corvus / Halcyon / Ledgerline. */
export const executorById = (id: string): Executor => ({
  id,
  name: id === "ex-remit" ? "Constrained broker" : id,
  model: "deterministic",
  policyBound: true,
});
