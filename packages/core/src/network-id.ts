import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

/** Midnight.js has no default network. The circuit bundle must set this before submitCallTx. */
export function normalizeMidnightNetworkId(
  network: string,
): "preprod" | "preview" | "mainnet" | "undeployed" {
  const n = String(network).toLowerCase();
  if (n.includes("undeployed") || n.includes("local")) return "undeployed";
  if (n.includes("preview")) return "preview";
  if (n.includes("mainnet") || n === "main") return "mainnet";
  return "preprod";
}

export function remitSetNetworkId(network = "preprod"): string {
  const id = normalizeMidnightNetworkId(network);
  setNetworkId(id);
  return id;
}
