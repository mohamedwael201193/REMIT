"use client";

/**
 * Why privacy matters — the leak section.
 *
 * Traditional execution exposes five fields the market can trade
 * against. Editorial numbered layout on the paper surface.
 */

import { Eye, Lock, TrendingDown, Hourglass, Users, Gauge } from "lucide-react";
import {
  Accent,
  NumberChip,
  PaperSurface,
  Reveal,
  SectionHeading,
} from "@/components/remit/primitives";

const LEAKS = [
  {
    n: "01",
    icon: Gauge,
    field: "Limit price",
    consequence: "Predators step in front of what you're willing to pay.",
  },
  {
    n: "02",
    icon: TrendingDown,
    field: "Order size",
    consequence: "Size signals conviction. Price moves before you fill.",
  },
  {
    n: "03",
    icon: Eye,
    field: "Total budget",
    consequence: "Your firepower becomes someone else's edge.",
  },
  {
    n: "04",
    icon: Hourglass,
    field: "Expiry",
    consequence: "Deadlines invite games right before you lapse.",
  },
  {
    n: "05",
    icon: Users,
    field: "Preferred counterparties",
    consequence: "Your relationships get repriced behind your back.",
  },
];

export function SectionLeak() {
  return (
    <section id="protocol" className="paper grain relative bg-paper py-24 text-[#1a231e] md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          {/* left — editorial list */}
          <div>
            <SectionHeading
              eyebrow="Why privacy matters"
              title={
                <>
                  Every order tells{" "}
                  <Accent>a story.</Accent>
                </>
              }
              lede="Traditional execution asks you to hand your strategy to an intermediary, and to the market. Every field an operator can see is a field the market can trade against."
            />

            <ol className="mt-12 space-y-0">
              {LEAKS.map((leak, i) => (
                <Reveal key={leak.n} delay={i * 0.07}>
                  <li className="group flex items-start gap-5 border-t border-[rgba(26,35,30,0.12)] py-5 last:border-b">
                    <NumberChip n={leak.n} />
                    <div className="flex-1">
                      <p className="font-display text-xl font-semibold leading-snug">
                        {leak.field}
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#5d6a61]">
                        {leak.consequence}
                      </p>
                    </div>
                    <leak.icon
                      className="mt-1.5 h-5 w-5 shrink-0 text-[#b5522e]/70 transition-transform duration-300 group-hover:scale-110"
                      aria-hidden="true"
                    />
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>

          {/* right — the market view */}
          <Reveal delay={0.15} className="lg:sticky lg:top-28">
            <div className="space-y-5">
              {/* exposed order */}
              <div className="rounded-2xl border border-[rgba(26,35,30,0.14)] bg-paper-2 p-6 shadow-[0_30px_70px_-40px_rgba(26,35,30,0.35)]">
                <div className="flex items-center justify-between">
                  <p className="font-data text-[10px] font-medium uppercase tracking-[0.2em] text-[#b5522e]">
                    What the market sees today
                  </p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#b5522e]/30 bg-[#b5522e]/10">
                    <Eye className="h-3.5 w-3.5 text-[#b5522e]" />
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {LEAKS.map((leak, i) => (
                    <div
                      key={leak.field}
                      className="flex items-center justify-between gap-4 rounded-lg border border-[rgba(26,35,30,0.1)] bg-[#f4f0e6] px-4 py-3"
                      style={{ opacity: 1 - i * 0.04 }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-[#5d6a61]">
                          {leak.field}
                        </span>
                      </div>
                      <span className="flex items-center gap-1.5 rounded-full border border-[#b5522e]/25 bg-[#b5522e]/8 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#b5522e]">
                        <Eye className="h-3 w-3" />
                        exposed
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* sealed order */}
              <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-cream shadow-[0_30px_70px_-40px_rgba(13,21,18,0.9)]">
                <div className="glow-gold-soft pointer-events-none absolute inset-0" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="font-data text-[10px] font-medium uppercase tracking-[0.2em] text-gold">
                      What REMIT seals
                    </p>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                      <Lock className="h-3.5 w-3.5 text-gold" />
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {LEAKS.map((leak) => (
                      <div
                        key={leak.field}
                        className="flex items-center justify-between gap-4 rounded-lg border border-[rgba(239,235,224,0.09)] bg-[#121c17] px-4 py-3"
                      >
                        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-sage">
                          {leak.field}
                        </span>
                        <span className="font-data text-[11px] tracking-[0.3em] text-cream/45">
                          •••••
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-pretty text-[13.5px] leading-relaxed text-cream/65">
                    The mandate, the strategy, the offers, the amounts and the
                    counterparties stay private. The chain only ever sees that
                    the rules were obeyed.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
