"use client";

/**
 * The paper interlude — a full-bleed etched moment.
 *
 * A wide plate of the sealed desk, with a rotated specimen card of the
 * old chaotic desk pinned over its corner. Editorial contrast: order
 * over noise, seal over leak.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Eye } from "lucide-react";
import { Accent, EASE, Reveal } from "@/components/remit/primitives";
import { DottedLead, PlateFrame, SpecimenStamp } from "./plates";

export function SectionInterlude() {
  const reduced = useReducedMotion();

  return (
    <section className="paper grain relative overflow-hidden bg-paper pb-28 pt-4 text-[#1a231e] md:pb-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* editorial pull-quote */}
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="eyebrow justify-center text-[#8c6a1f]">
              The private exchange
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="font-display mt-6 text-balance text-[clamp(1.65rem,3.6vw,2.7rem)] font-semibold leading-[1.14]">
              The old desk ran on whispered rules and{" "}
              <em className="italic text-[#b5522e]">prayed nobody was listening.</em>{" "}
              The sealed desk{" "}
              <Accent>has nothing to overhear.</Accent>
            </p>
          </Reveal>
        </div>

        {/* the plate + the pinned specimen card */}
        <div className="relative mx-auto mt-16 max-w-5xl md:mt-20">
          <Reveal>
            <PlateFrame
              src="/remit-art/paper-interlude.webp"
              alt="Copperplate etching of a quiet private study desk with a sealed envelope and a brass lamp"
              plate="PLATE II · THE SEALED DESK"
              caption="Rules at rest: sealed, stamped, still enforceable."
              tone="paper"
              priority={false}
            />
          </Reveal>

          {/* rotated specimen card — the old way, pinned over the calm */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 34, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: -5.5 }}
            viewport={{ once: true, margin: "-8% 0px" }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="relative z-10 mx-auto -mt-10 w-[270px] sm:-mt-16 sm:w-[310px] md:absolute md:-bottom-14 md:right-2 md:mt-0 lg:right-8"
          >
            <div className="relative rounded-md border border-[rgba(26,35,30,0.14)] bg-paper-2 p-2.5 pb-3 shadow-[0_34px_60px_-28px_rgba(26,35,30,0.45)]">
              { }
              <img
                src="/remit-art/desk-chaos.webp"
                alt="Satirical etching of a chaotic trading desk with flying papers and watching eyes"
                loading="lazy"
                decoding="async"
                className="block aspect-square w-full select-none rounded-sm mix-blend-multiply"
              />
              <div className="mt-2.5 flex items-start justify-between gap-2 px-1">
                <div>
                  <p className="font-data text-[9.5px] font-medium uppercase tracking-[0.2em] text-[#b5522e]">
                    fig. 1 · the old desk
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-[#5d6a61]">
                    Every rule on display, every eye invited.
                  </p>
                </div>
                <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b5522e]/70" aria-hidden="true" />
              </div>
              <SpecimenStamp className="absolute -right-5 -top-6 h-[74px] w-[74px]" tone="clay" />
            </div>
          </motion.div>

          {/* dotted editorial lead — only where the geometry is stable */}
          <DottedLead className="absolute -bottom-3 left-8 hidden rotate-[160deg] md:block" />
        </div>
      </div>
    </section>
  );
}
