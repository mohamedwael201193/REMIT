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
    icon: Compass,
    title: "Discover",
    detail:
      "Find private liquidity without announcing yourself to the market.",
  },
  {
    n: "02",
    icon: FileLock2,
    title: "Create a private mandate",
    detail:
      "Define asset, side, caps, counterparties and expiry. Seal the rules.",
  },
  {
    n: "03",
    icon: Inbox,
    title: "Receive private offers",
    detail:
      "Counterparties quote the envelope — not your identity or intent.",
  },
  {
    n: "04",
    icon: Cpu,
    title: "Agent evaluates",
    detail:
      "The execution engine scores every offer against the hidden mandate.",
  },
  {
    n: "05",
    icon: ShieldCheck,
    title: "Policy check",
    detail:
      "Every rule is proven — in zero knowledge — before anything moves.",
  },
  {
    n: "06",
    icon: Ban,
    title: "Execute or reject",
    detail:
      "Inside the boundary, value moves. Outside it, nothing ever does.",
  },
  {
    n: "07",
    icon: Landmark,
    title: "Settlement",
    detail:
      "The fill settles only after the proof is accepted. A receipt is issued.",
  },
  {
    n: "08",
    icon: SearchCheck,
    title: "Audit selectively",
    detail:
      "Reveal one verified fact at a time — never the whole strategy.",
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
              From private intention to{" "}
              <Accent>public proof.</Accent>
            </>
          }
          lede="Eight steps, one boundary. The mandate stays sealed the whole way; the result arrives with a receipt anyone can verify."
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
