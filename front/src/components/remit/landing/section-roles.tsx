"use client";

/**
 * The four parties around one boundary — role cards.
 */

import { UserRound, Bot, Handshake, SearchCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Accent, EASE, Reveal, SectionHeading } from "@/components/remit/primitives";
import { CornerTicks } from "./plates";

const ROLES = [
  {
    icon: UserRound,
    title: "Principal",
    line: "Sets the rules. Keeps them private.",
    sees: ["Own mandates", "Own budget", "Own fills"],
    tone: "gold" as const,
  },
  {
    icon: Bot,
    title: "Executor",
    line: "Executes inside the mandate. Nothing more.",
    sees: ["Openings it was given", "The boundary", "Not the maker's full book"],
    tone: "sage" as const,
  },
  {
    icon: Handshake,
    title: "Counterparty",
    line: "Quotes privately. Settles trustlessly.",
    sees: ["The envelope", "Own fills", "Not the principal"],
    tone: "sage" as const,
  },
  {
    icon: SearchCheck,
    title: "Auditor",
    line: "Verifies one fact at a time.",
    sees: ["Proof status", "Disclosed facts", "Never the mandate"],
    tone: "mint" as const,
  },
];

export function SectionRoles() {
  const reduced = useReducedMotion();
  return (
    <section className="relative bg-ink py-24 text-cream md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          align="center"
          eyebrow="The parties"
          title={
            <>
              Four parties. <Accent>One boundary.</Accent>
            </>
          }
          lede="Every role sees exactly what it needs — and not a field more."
        />

        {/* the council — engraved banner above the cards */}
        <Reveal className="mt-14" y={26}>
          <figure className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(239,235,224,0.12)] bg-ink">
              <motion.img
                src="/remit-art/roles-table.webp"
                alt="Copperplate engraving of four robed figures around a round table, a beam of gold light on a sealed envelope"
                loading="lazy"
                decoding="async"
                initial={reduced ? false : { scale: 1.08 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: EASE }}
                className="block h-[240px] w-full select-none object-cover sm:h-[320px] lg:h-[400px]"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/25"
                aria-hidden="true"
              />
              <CornerTicks />
              <figcaption className="absolute bottom-4 left-5 right-5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
                <span className="font-data text-[10px] font-medium uppercase tracking-[0.24em] text-gold">
                  PLATE III — THE COUNCIL OF FOUR
                </span>
                <span className="font-display text-[13px] italic text-cream/70">
                  The envelope is shared. The letter is not.
                </span>
              </figcaption>
            </div>
          </figure>
        </Reveal>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role, i) => (
            <Reveal key={role.title} delay={i * 0.08}>
              <div className="card-lift group flex h-full flex-col rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-6">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
                    role.tone === "gold"
                      ? "border-gold/30 bg-gold/10 text-gold"
                      : role.tone === "mint"
                        ? "border-mint/30 bg-mint/10 text-mint"
                        : "border-[rgba(239,235,224,0.14)] bg-[rgba(239,235,224,0.05)] text-sage"
                  }`}
                >
                  <role.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-5 text-[1.45rem] font-semibold">
                  {role.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-cream/60">
                  {role.line}
                </p>
                <div className="mt-auto pt-6">
                  <p className="eyebrow text-cream/40">sees</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {role.sees.map((s) => (
                      <li
                        key={s}
                        className="flex items-center gap-2 text-[13px] text-cream/75"
                      >
                        <span className="h-1 w-1 rounded-full bg-gold/70" aria-hidden="true" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
