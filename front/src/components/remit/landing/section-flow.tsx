"use client";

/**
 * The product flow — eight steps from discovery to selective audit.
 */

import {
  Compass,
  FileLock2,
  Inbox,
  Cpu,
  ShieldCheck,
  Ban,
  Landmark,
  SearchCheck,
} from "lucide-react";
import { Accent, Reveal, SectionHeading } from "@/components/remit/primitives";

const STEPS = [
  {
    n: "01",
    icon: FileLock2,
    title: "Seal the mandate",
    detail:
      "The procurement team defines the spending limit, eligible suppliers, per-order caps and expiry. One commitment on-chain.",
  },
  {
    n: "02",
    icon: Inbox,
    title: "Collect sealed quotes",
    detail:
      "Suppliers quote privately. Nobody learns the mandate or anyone's pricing.",
  },
  {
    n: "03",
    icon: Cpu,
    title: "Agent matches",
    detail:
      "The purchasing agent matches quotes against the sealed limits — it can choose, it cannot exceed.",
  },
  {
    n: "04",
    icon: ShieldCheck,
    title: "Policy check",
    detail:
      "Every rule is proven in zero knowledge before anything moves.",
  },
  {
    n: "05",
    icon: Ban,
    title: "Reject the bad",
    detail:
      "Fat-finger quotes and out-of-bounds fills are refused by the circuit, not by a human clicking decline.",
  },
  {
    n: "06",
    icon: Compass,
    title: "Fill in bounds",
    detail:
      "The best in-bounds quote fills. Value moves only after the proof is accepted.",
  },
  {
    n: "07",
    icon: Landmark,
    title: "Settlement",
    detail:
      "A receipt is issued that anyone can verify — without seeing the mandate behind it.",
  },
  {
    n: "08",
    icon: SearchCheck,
    title: "Audit selectively",
    detail:
      "The auditor decrypts exactly one field — say, the executed notional — and verifies it against the commitment and nullifier.",
  },
];

export function SectionFlow() {
  return (
    <section id="how" className="paper grain bg-paper py-24 text-[#1a231e] md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From mandate to{" "}
              <Accent>verifiable audit.</Accent>
            </>
          }
          lede="Eight steps, one boundary. A team sets the limits; an agent executes inside them; an auditor checks one fact. The mandate stays sealed the whole way."
        />

        <div className="mt-14 grid gap-x-10 gap-y-0 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={(i % 4) * 0.08}>
              <div className="group border-t-2 border-[rgba(26,35,30,0.14)] py-7 transition-colors duration-300 hover:border-[#8c6a1f]">
                <div className="flex items-baseline justify-between">
                  <span className="font-data text-[2.6rem] font-semibold leading-none tracking-tight text-[#8c6a1f]/85">
                    {step.n}
                  </span>
                  <step.icon
                    className="h-5 w-5 text-[#5d6a61] transition-colors duration-300 group-hover:text-[#8c6a1f]"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="font-display mt-4 text-[1.35rem] font-semibold leading-snug">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#5d6a61]">
                  {step.detail}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
