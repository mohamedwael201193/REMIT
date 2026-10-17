import type { Metadata } from "next";
import VerifyPage from "@/verify/VerifyPage";

export const metadata: Metadata = {
  title: "Verify a transaction — REMIT",
  description:
    "No-wallet public verification for Midnight Preprod transactions: paste a hash, read the chain tip and block inclusion directly, every fact labeled verified or linked.",
};

/**
 * Thin route shim for the VERIFY-1 page. All logic lives in src/verify/
 * (owned by the VERIFY-1 worker); this file only mounts it at /verify.
 */
export default function Page() {
  return <VerifyPage />;
}
