"use client";

/**
 * The mandate → proof flow.
 *
 * Original REMIT illustration: a sealed mandate and a private offer
 * enter a constrained executor; a Midnight proof exits; only the
 * settled result touches the public ledger.
 */

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DrawPath, EASE } from "@/components/remit/primitives";

/* ── connector with a traveling pulse ─────────────────────────────── */

function Connector({ vertical = false, delay = 0 }: { vertical?: boolean; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        vertical ? "h-14 w-full" : "h-10 w-full min-w-10 max-w-24 flex-1",
      )}
      aria-hidden="true"
    >
      <svg
        viewBox={vertical ? "0 0 24 56" : "0 0 96 24"}
        fill="none"
        className={cn(vertical ? "h-14" : "w-full")}
        preserveAspectRatio={vertical ? undefined : "xMidYMid meet"}
      >
        <DrawPath
          d={vertical ? "M12 4 V44" : "M6 12 H84"}
          stroke="rgba(239,235,224,0.28)"
          strokeWidth="1.6"
          strokeLinecap="round"
          duration={1.1}
          delay={delay}
        />
        <path
          d={vertical ? "M7 40 L12 48 L17 40" : "M80 7 L88 12 L80 17"}
          stroke="rgba(217,169,78,0.9)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {!reduced ? (
          <motion.circle
            r="2.6"
            fill="#D9A94E"
            initial={{ opacity: 0 }}
            animate={
              vertical
                ? { cy: [6, 46], cx: 12, opacity: [0, 1, 1, 0] }
                : { cx: [10, 84], cy: 12, opacity: [0, 1, 1, 0] }
            }
            transition={{ duration: 2.6, repeat: Infinity, delay: delay + 0.8, ease: "linear" }}
          />
        ) : null}
      </svg>
    </div>
  );
}

/* ── nodes ─────────────────────────────────────────────────────────── */

function RedactedLines({ widths, className }: { widths: number[]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {widths.map((w, i) => (
        <motion.span
          key={i}
          className="block h-1.5 rounded-full bg-foreground/15"
          style={{ width: `${w}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.25 + i * 0.12, ease: EASE }}
        />
      ))}
    </div>
  );
}

function MandateDoc() {
  return (
    <div className="paper grain relative w-full max-w-[240px] rounded-xl p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-data text-[10px] font-medium uppercase tracking-[0.18em] text-gold-deep">
            Private mandate
          </p>
          <p className="font-display mt-1 text-base font-semibold text-[#1a231e]">
            Sealed mandate
          </p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8c6a1f]/40 bg-[#8c6a1f]/10">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.6" stroke="#8c6a1f" strokeWidth="1.4" />
            <path d="M5.4 7V5.4a2.6 2.6 0 0 1 5.2 0V7" stroke="#8c6a1f" strokeWidth="1.4" />
          </svg>
        </span>
      </div>
      <RedactedLines widths={[86, 64, 74]} className="mt-3.5" />
      <div className="mt-3.5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#8c6a1f]/70" />
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#5d6a61]">
          rules visible only to you
        </span>
      </div>
    </div>
  );
}

function OfferDoc() {
  return (
    <div className="relative w-full max-w-[200px] -translate-y-3 rounded-xl border border-[rgba(239,235,224,0.14)] bg-ink-2 p-3.5 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.7)]">
      <p className="font-data text-[10px] font-medium uppercase tracking-[0.18em] text-sage">
        Private offer
      </p>
      <p className="font-display mt-1 text-sm font-semibold text-cream">OF-9231</p>
      <RedactedLines widths={[70, 52]} className="mt-2.5" />
    </div>
  );
}

function AgentNode() {
  const reduced = useReducedMotion();
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="h-28 w-28" fill="none" role="img" aria-label="Constrained executor">
          <circle cx="60" cy="60" r="54" stroke="rgba(239,235,224,0.22)" strokeWidth="1.3" strokeDasharray="2.5 6" strokeLinecap="round" />
          <motion.circle
            cx="60" cy="60" r="40" stroke="#D9A94E" strokeWidth="1.8"
            style={{ originX: "50%", originY: "50%" }}
            animate={reduced ? undefined : { rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            strokeDasharray="188 64"
            strokeLinecap="round"
          />
          <circle cx="60" cy="60" r="26" stroke="rgba(217,169,78,0.35)" strokeWidth="1.1" />
          <circle cx="60" cy="60" r="7.5" fill="#D9A94E" />
          <circle cx="60" cy="20" r="4" fill="#EFEBC0" />
        </svg>
      </div>
      <p className="text-center">
        <span className="block font-data text-[10px] uppercase tracking-[0.2em] text-cream">
          Agent
        </span>
        <span className="mt-1 block text-[11px] text-sage">free to choose · bound by mandate</span>
      </p>
    </div>
  );
}

function ProofNode() {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <motion.div
        initial={{ scale: 1.6, opacity: 0, rotate: -12 }}
        whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
        viewport={{ once: true, margin: "-8%" }}
        transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.5 }}
        className="h-20 w-20"
      >
        <svg viewBox="0 0 80 80" fill="none" role="img" aria-label="Midnight proof" className="h-full w-full">
          <circle cx="40" cy="40" r="34" fill="rgba(217,169,78,0.12)" />
          <circle cx="40" cy="40" r="34" stroke="#D9A94E" strokeWidth="2" />
          <circle cx="40" cy="40" r="27" stroke="#D9A94E" strokeWidth="1" strokeDasharray="1.6 5" strokeLinecap="round" />
          <path d="M29 40.6 L36.4 48 L51 32.8" stroke="#D9A94E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <p className="text-center">
        <span className="block font-data text-[10px] uppercase tracking-[0.2em] text-cream">Proof</span>
        <span className="mt-1 block text-[11px] text-sage">fill obeyed the mandate</span>
      </p>
    </div>
  );
}

function ReceiptNode() {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[190px] rounded-xl border border-mint/30 bg-ink-2 p-4 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between">
          <p className="font-data text-[10px] uppercase tracking-[0.18em] text-mint">
            Settled
          </p>
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="M3 7.4 L5.8 10.2 L11 4" stroke="#7CC79B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-display mt-1.5 text-xl font-semibold text-cream">RCP-2262</p>
        <div className="mt-3 flex items-center justify-between border-t border-[rgba(239,235,224,0.1)] pt-2.5">
          <span className="text-[10px] uppercase tracking-[0.14em] text-sage">receipt</span>
          <span className="font-data text-[11px] text-cream/80">verified</span>
        </div>
      </div>
      <p className="text-center">
        <span className="block font-data text-[10px] uppercase tracking-[0.2em] text-cream">Executed</span>
        <span className="mt-1 block text-[11px] text-sage">the only public artifact</span>
      </p>
    </div>
  );
}

/* ── the flow ──────────────────────────────────────────────────────── */

export function HeroFlow({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      {/* desktop: horizontal flow */}
      <div className="hidden lg:flex items-center gap-2" role="list" aria-label="How a private mandate becomes a public proof">
        <div className="flex flex-col items-center gap-2" role="listitem">
          <MandateDoc />
          <OfferDoc />
        </div>
        <Connector delay={0.3} />
        <div role="listitem" className="shrink-0">
          <AgentNode />
        </div>
        <Connector delay={0.6} />
        <div role="listitem" className="shrink-0">
          <ProofNode />
        </div>
        <Connector delay={0.9} />
        <div role="listitem" className="shrink-0">
          <ReceiptNode />
        </div>
      </div>

      {/* mobile / tablet: vertical flow */}
      <div className="lg:hidden flex flex-col items-center" role="list" aria-label="How a private mandate becomes a public proof">
        <div className="flex w-full justify-center gap-4" role="listitem">
          <MandateDoc />
        </div>
        <div className="-mt-1 w-full max-w-[240px]" role="listitem">
          <OfferDoc />
        </div>
        <Connector vertical delay={0.35} />
        <div role="listitem">
          <AgentNode />
        </div>
        <Connector vertical delay={0.65} />
        <div role="listitem">
          <ProofNode />
        </div>
        <Connector vertical delay={0.95} />
        <div role="listitem">
          <ReceiptNode />
        </div>
      </div>

      {/* the public ledger baseline */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 1.15 }}
        className="relative mt-10 border-t border-dashed border-[rgba(239,235,224,0.18)] pt-4"
      >
        <span className="absolute -top-[5px] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-gold/70" aria-hidden="true" />
        <p className="text-center font-data text-[10px] uppercase tracking-[0.24em] text-sage">
          Midnight · public ledger — only the result is visible
        </p>
      </motion.div>
    </div>
  );
}
