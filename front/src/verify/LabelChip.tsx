import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceLabel } from "./types";

/**
 * The whole point of N5's evidence discipline in one chip.
 * Text only — never a checkmark icon. "verified" means read back from the
 * chain or indexer during this check; "linked" means a pointer, not a claim;
 * "unverified" means the page could not confirm it and says so.
 */
export function LabelChip({ label }: { label: EvidenceLabel }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
        label === "verified" && "bg-[#1a231e] text-[#f4f0e6]",
        label === "linked" &&
          "border border-[rgba(26,35,30,0.25)] bg-transparent text-[#5d6a61]",
        label === "unverified" &&
          "border border-dashed border-[rgba(26,35,30,0.3)] bg-transparent text-[#5d6a61]",
      )}
      title={
        label === "verified"
          ? "Read back from the chain or indexer during this check."
          : label === "linked"
            ? "A pointer, not a claim. The page asserts nothing about it."
            : "The page could not confirm this — no claim is made."
      }
    >
      {label === "linked" && <Link2 className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}
