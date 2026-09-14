"use client";

/**
 * Selective audit — reveal one fact at a time.
 *
 * A compact, interactive preview of the auditor experience: an
 * execution with sealed facts the visitor can disclose individually.
 */

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Unlock } from "lucide-react";
import { Accent, EASE, Reveal, SectionHeading } from "@/components/remit/primitives";
import { PlateFrame, SpecimenStamp } from "./plates";

const FACTS = [
  { id: "fill", label: "Fill amount", value: "SEALED — illustration, not a live opening" },
  { id: "policy", label: "Price limit satisfied", value: "Boolean fact — illustration" },
  { id: "cp", label: "Counterparty authorized", value: "On-chain maker (illustration)" },
  { id: "time", label: "Execution timestamp", value: "SEALED — not a live clock" },
];

export function SectionAudit() {
  const [revealed, setRevealed] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section id="audit" className="paper grain bg-paper py-24 text-[#1a231e] md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Selective audit"
              title={
                <>
                  Verify without{" "}
                  <Accent>reading the book.</Accent>
                </>
              }
              lede="An auditor can confirm a single fact about an execution — the fill amount, the policy result, the counterparty class, the timestamp — without ever receiving the mandate behind it."
            />

            <Reveal delay={0.1}>
              <div className="mt-10 space-y-3">
                <div className="flex items-start gap-3.5 rounded-xl border border-[rgba(26,35,30,0.12)] bg-paper-2 p-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#8c6a1f]/30 bg-[#8c6a1f]/10">
                    <Lock className="h-3.5 w-3.5 text-gold-deep" />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-semibold">Private</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#5d6a61]">
                      The mandate, the strategy, hidden amounts, private
                      counterparties and risk limits. Sealed — always.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5 rounded-xl border border-[#3e8e66]/30 bg-[#3e8e66]/8 p-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#3e8e66]/30 bg-[#3e8e66]/10">
                    <Unlock className="h-3.5 w-3.5 text-[#3e8e66]" />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-semibold">Disclosed</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#5d6a61]">
                      Exactly one verified fact, on request, with a proof
                      behind it. The rest stays sealed.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* the disclosure seal — engraved plate */}
            <Reveal delay={0.22} className="relative mt-8">
              <PlateFrame
                src="/remit-art/audit-rosette.webp"
                alt="Guilloche rosette engraving with a keyhole at its center and one gold ring"
                plate="PLATE IV — THE DISCLOSURE SEAL"
                caption="One ring opens. The rest is security printing."
                tone="paper"
                imgClassName="h-[240px] object-cover sm:h-[300px]"
              />
              <SpecimenStamp
                className="absolute -right-3 -top-5 h-[70px] w-[70px]"
                tone="gold"
                label="SEALED"
                sub="AUDIT LAYER"
              />
            </Reveal>
          </div>

          {/* interactive disclosure */}
          <Reveal delay={0.15}>
            <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-cream shadow-[0_40px_90px_-50px_rgba(13,21,18,0.9)] sm:p-8">
              <div className="glow-gold-soft pointer-events-none absolute inset-0" aria-hidden="true" />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-data text-[10px] uppercase tracking-[0.2em] text-gold">
                      Illustration · not live audit
                    </p>
                    <p className="font-display mt-1 text-2xl font-semibold">Sealed execution</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="rounded-full border border-gold/35 bg-gold/10 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-gold">
                      SEALED
                    </span>
                    <span className="font-data text-[10.5px] text-cream/45">
                      auditRoot not opened
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t border-[rgba(239,235,224,0.1)] pt-6">
                  <p className="eyebrow text-sage">Reveal one fact</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {FACTS.map((fact, i) => {
                      const open = revealed.has(fact.id);
                      return (
                        <motion.button
                          key={fact.id}
                          onClick={() => toggle(fact.id)}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: EASE }}
                          className={`group flex min-h-[92px] flex-col justify-between rounded-xl border p-4 text-left transition-colors duration-300 ${
                            open
                              ? "border-mint/40 bg-mint/8"
                              : "border-[rgba(239,235,224,0.12)] bg-[#121c17] hover:border-gold/40"
                          }`}
                          aria-pressed={open}
                        >
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-[12.5px] font-medium text-cream/80">
                              {fact.label}
                            </span>
                            {open ? (
                              <Unlock className="h-3.5 w-3.5 text-mint" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-sage transition-colors group-hover:text-gold" />
                            )}
                          </div>
                          <AnimatePresence mode="wait">
                            {open ? (
                              <motion.span
                                key="open"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="font-data mt-2 text-[13.5px] font-medium text-mint"
                              >
                                {fact.value}
                              </motion.span>
                            ) : (
                              <motion.span
                                key="sealed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-2 font-data text-[12px] uppercase tracking-[0.18em] text-cream/40"
                              >
                                sealed — tap to disclose
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="mt-5 text-[12.5px] leading-relaxed text-cream/50">
                    The auditor never receives the complete mandate. Each
                    disclosure carries its own proof — and nothing else.
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
