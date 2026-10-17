"use client";

/**
 * Frequently asked questions.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Accent, Reveal, SectionHeading } from "@/components/remit/primitives";

const FAQS = [
  {
    q: "What exactly is a spending mandate?",
    a: "A private set of purchasing rules: the spending limit, eligible suppliers, per-fill cap, limit price, total budget, and an expiry, sealed before execution begins. The purchasing agent operates inside it. Suppliers never read it. The chain proves it was respected.",
  },
  {
    q: "Can the agent exceed the mandate?",
    a: "No. A fill that breaks any rule (size over the cap, a supplier outside the eligible set, a lapsed expiry) is rejected before settlement. No value moves. You can try it yourself in the enforcement illustration above.",
  },
  {
    q: "What does the public actually see?",
    a: "The minimum verifiable result: that a fill happened inside a proven mandate, referenced by a proof and a receipt. Not the amounts, not the identities, not the limits, not the relationships.",
  },
  {
    q: "What can an auditor see?",
    a: "Exactly one disclosed field at a time (the executed notional, a policy result, a supplier class, or a timestamp), sealed to their key off-circuit (RMTB1) and bound to the on-chain commitment by a nullifier that kills replay. The mandate itself is never handed over.",
  },
  {
    q: "Which wallets does REMIT work with?",
    a: "1AM is recommended for the Preprod demo (browser proving). Lace is an alternative wallet; a local proof-server may be required. REMIT never asks for a seed.",
  },
  {
    q: "What happens when I revoke the executor?",
    a: "Revocation is part of the mandate state. Once revoked, no further fill can settle under that authorization, while every past receipt remains independently verifiable.",
  },
  {
    q: "Is this live, or a demo?",
    a: "REMIT runs on Midnight Preprod: real Compact circuits, real ledger writes, real simulator tests. The demo venue is the founder's own purchasing-agent flow — user zero, labeled as such. There are no pilot customers and no LOIs; the real-world anchor is the documented enterprise agent-governance problem, not a claimed client.",
  },
];

export function SectionFaq() {
  return (
    <section id="faq" className="paper grain bg-paper py-24 text-[#1a231e] md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Questions"
              title={
                <>
                  Clear answers,{" "}
                  <Accent>no jargon.</Accent>
                </>
              }
              lede="The protocol is technical. The product shouldn't feel that way."
            />
          </div>
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`item-${i}`}
                  className="border-[rgba(26,35,30,0.14)]"
                >
                  <AccordionTrigger className="py-5 text-left font-display text-[1.2rem] font-semibold leading-snug hover:no-underline hover:text-[#8c6a1f] [&[data-state=open]]:text-[#8c6a1f]">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-[14.5px] leading-relaxed text-[#5d6a61]">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
