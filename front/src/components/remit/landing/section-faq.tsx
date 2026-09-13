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
    q: "What exactly is a mandate?",
    a: "A private set of trading rules — allowed asset, side, per-fill cap, limit price, total budget, admitted counterparties and an expiry — sealed before execution begins. The executor operates inside it; the market never reads it; the chain proves it was respected.",
  },
  {
    q: "Can the agent exceed the mandate?",
    a: "No. A fill that breaks any rule — size over the cap, price past the limit, a counterparty outside the admitted set, a lapsed expiry — is rejected before settlement. No value moves. You can try it yourself in the enforcement demo above.",
  },
  {
    q: "What does the public actually see?",
    a: "The minimum verifiable result: that a fill happened inside a proven policy, referenced by a proof and a receipt. Not the amounts, not the identities, not the limits, not the relationships.",
  },
  {
    q: "What can an auditor see?",
    a: "Exactly one verified fact at a time — a fill amount, a policy result, a counterparty class or a timestamp — and only what you choose to disclose. The mandate itself is never handed over.",
  },
  {
    q: "Which wallets does REMIT work with?",
    a: "1AM and Lace on Midnight today, with additional providers as the ecosystem grows. The wallet sits underneath the product — it never becomes the experience.",
  },
  {
    q: "What happens when I revoke the executor?",
    a: "Revocation is part of the mandate state. Once revoked, no further fill can settle under that authorization — while every past receipt remains independently verifiable.",
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
