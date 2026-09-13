"use client";

/**
 * The privacy equation — a typographic band.
 *
 * Private rules + private orders + private execution
 * → zero-knowledge policy enforcement
 * → a publicly verifiable result.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Accent, EASE, Reveal } from "@/components/remit/primitives";

function DrawArrow({ delay }: { delay: number }) {
  return (
    <motion.svg
      viewBox="0 0 24 40"
      className="h-10 w-6"
      fill="none"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <motion.path
        d="M12 4 V30"
        stroke="#D9A94E"
        strokeWidth="1.6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: delay + 0.15, ease: EASE }}
      />
      <motion.path
        d="M6 26 L12 34 L18 26"
        stroke="#D9A94E"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: delay + 0.7 }}
      />
    </motion.svg>
  );
}

export function SectionPrivacy() {
  const reduced = useReducedMotion();
  const line = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 22 } as const,
          whileInView: { opacity: 1, y: 0 } as const,
          viewport: { once: true, margin: "-12%" },
          transition: { duration: 0.8, delay, ease: EASE },
        };

  return (
    <section className="relative overflow-hidden bg-ink py-28 text-cream md:py-36">
      {/* faint concentric boundary rings */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
        aria-hidden="true"
      >
        {[420, 640, 880].map((r) => (
          <div
            key={r}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(217,169,78,0.07)]"
            style={{ width: r, height: r }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 text-center sm:px-8">
        <Reveal>
          <p className="eyebrow justify-center text-gold">
            Privacy is the mechanism
          </p>
        </Reveal>

        <motion.p
          {...line(0.1)}
          className="font-display mt-8 text-balance text-[clamp(1.7rem,3.8vw,3rem)] font-semibold leading-[1.15]"
        >
          Private rules <span className="text-gold">+</span> private orders{" "}
          <span className="text-gold">+</span> private execution
        </motion.p>

        <DrawArrow delay={0.25} />

        <motion.p
          {...line(0.45)}
          className="font-display text-balance text-[clamp(2rem,4.6vw,3.6rem)] font-semibold italic leading-[1.12] text-gold"
        >
          Zero-knowledge policy enforcement
        </motion.p>

        <DrawArrow delay={0.6} />

        <motion.p
          {...line(0.8)}
          className="font-display text-balance text-[clamp(2.4rem,5.6vw,4.4rem)] font-semibold leading-[1.06]"
        >
          A publicly <Accent>verifiable</Accent> result.
        </motion.p>

        <Reveal delay={1}>
          <p className="mt-10 max-w-xl text-pretty text-[15px] leading-relaxed text-cream/55">
            Privacy is not decoration. Privacy is what stops the market from
            trading against you — and what lets a stranger verify your agent
            behaved, without ever seeing why.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
