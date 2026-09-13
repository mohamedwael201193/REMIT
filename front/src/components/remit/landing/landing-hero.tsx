"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp, EASE } from "@/components/remit/primitives";
import { CornerTicks } from "./plates";
import { HeroFlow } from "./hero-flow";
import { useRemitStore } from "@/store/remit";
import { formatCompactUsd } from "@/lib/remit/format";

const STATS = [
  { value: 2_400_000_000, format: (n: number) => formatCompactUsd(n), label: "Private notional settled" },
  { value: 31_918, format: (n: number) => Math.round(n).toLocaleString("en-US"), label: "Policy proofs verified" },
  { value: 0, format: (n: number) => Math.round(n).toLocaleString("en-US"), label: "Mandates ever revealed" },
  { value: 100, format: (n: number) => `${Math.round(n)}%`, label: "Fills checked before value moves" },
];

export function LandingHero() {
  const enterWorkspace = useRemitStore((s) => s.enterWorkspace);
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const flowY = useTransform(scrollY, [0, 600], [0, reduced ? 0 : -46]);
  const groundY = useTransform(scrollY, [200, 1300], [0, reduced ? 0 : 56]);

  const scrollToHow = () =>
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative overflow-hidden bg-ink text-cream">
      {/* ambience */}
      <div className="glow-gold pointer-events-none absolute inset-x-0 top-0 h-[560px]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(rgba(239,235,224,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-36 sm:px-8 sm:pt-44">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="eyebrow justify-center text-gold"
          >
            Private execution infrastructure · built for Midnight
          </motion.p>

          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.1, ease: EASE }}
            className="font-display mt-7 text-balance text-[clamp(3.1rem,7.8vw,6.9rem)] font-semibold leading-[0.98] tracking-[-0.015em]"
          >
            Trade on your rules.
            <br />
            Without revealing{" "}
            <em className="italic text-gold">the rules.</em>
          </motion.h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.24, ease: EASE }}
            className="mx-auto mt-7 max-w-2xl text-pretty text-[1.08rem] leading-relaxed text-cream/70 sm:text-lg"
          >
            REMIT lets an agent execute inside a private mandate. Midnight
            proves the fill obeyed the mandate before value moves — so you
            delegate the trade, never the trust.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.36, ease: EASE }}
            className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
          >
            <Button
              size="lg"
              className="h-13 bg-gold px-8 text-[15px] font-semibold text-[#1a1409] hover:bg-gold-2"
              onClick={enterWorkspace}
            >
              Explore REMIT
              <ArrowRight className="ml-2 h-4.5 w-4.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 border-[rgba(239,235,224,0.2)] bg-transparent px-7 text-[15px] text-cream/85 hover:bg-[rgba(239,235,224,0.06)] hover:text-cream"
              onClick={scrollToHow}
            >
              <Play className="mr-2 h-4 w-4 text-gold" />
              See how private execution works
            </Button>
          </motion.div>
        </div>

        {/* the flow illustration */}
        <motion.div
          style={{ y: flowY }}
          initial={reduced ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: EASE }}
          className="mx-auto mt-16 max-w-5xl sm:mt-20"
        >
          <HeroFlow />
        </motion.div>

        {/* the engraved ground — the hero settles onto this plate */}
        <motion.div
          style={{ y: groundY }}
          initial={reduced ? false : { opacity: 0, y: 56 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.72, ease: EASE }}
          className="mx-auto mt-16 max-w-6xl sm:mt-20"
        >
          <figure className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(239,235,224,0.12)] bg-ink">
              { }
              <img
                src="/remit-art/hero-ground.webp"
                alt="Copperplate engraving of a neoclassical exchange rotunda at night, its keyhole doorway glowing gold"
                loading="eager"
                decoding="async"
                className="block h-[260px] w-full select-none object-cover sm:h-[340px] lg:h-[420px]"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent 0%, black 16%, black 92%, rgba(0,0,0,0.55) 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0%, black 16%, black 92%, rgba(0,0,0,0.55) 100%)",
                }}
              />
              <div className="glow-gold-soft pointer-events-none absolute inset-0" aria-hidden="true" />
              <CornerTicks />
            </div>
            <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
              <span className="font-data text-[10px] font-medium uppercase tracking-[0.24em] text-gold/80">
                PLATE I — THE EXCHANGE AT MIDNIGHT
              </span>
              <span className="font-display text-[13px] italic text-cream/45">
                One keyhole. No keys on display.
              </span>
            </figcaption>
          </figure>
        </motion.div>

        {/* stat strip */}
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[rgba(239,235,224,0.07)] sm:mt-16 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.09, ease: EASE }}
              className="flex flex-col gap-1.5 bg-[#101915] px-6 py-6 text-center sm:py-7"
            >
              <CountUp
                value={s.value}
                format={s.format}
                className="text-[1.65rem] font-medium tracking-tight text-cream sm:text-[1.8rem]"
              />
              <span className="text-[11px] uppercase tracking-[0.14em] text-sage">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
