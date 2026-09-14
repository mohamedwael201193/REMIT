"use client";

/**
 * REMIT brand assets — original marks drawn for this identity.
 *
 * The mark expresses the product's core idea: a boundary (the mandate),
 * an agent that operates inside it, and the seal of proof that the
 * boundary was respected.
 */

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

/* ── Logo mark ─────────────────────────────────────────────────────── */

export function RemitMark({
  className,
}: {
  className?: string;
  /** @deprecated Motion loops are not used. Kept so existing call sites typecheck. */
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="REMIT mark"
    >
      <circle
        cx="20"
        cy="20"
        r="15.5"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <circle
        cx="20"
        cy="20"
        r="9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="3.5 5.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="20" cy="20" r="4.6" fill="currentColor" />
      <circle cx="20" cy="4.8" r="2.7" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <RemitMark className={cn("h-7 w-7 text-gold", markClassName)} />
      <span className="font-display text-[1.35rem] font-semibold tracking-[0.08em] uppercase leading-none pt-0.5">
        Remit
      </span>
    </span>
  );
}

/* ── Proof seal — stamps in when a proof verifies ─────────────────── */

export function ProofSeal({
  className,
  tone = "gold",
  stamp = false,
  label,
}: {
  className?: string;
  tone?: "gold" | "mint" | "clay";
  stamp?: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const tones = {
    gold: { ring: "#D9A94E", core: "rgba(217,169,78,0.16)", glyph: "#D9A94E" },
    mint: { ring: "#7CC79B", core: "rgba(124,199,155,0.16)", glyph: "#7CC79B" },
    clay: { ring: "#D07850", core: "rgba(208,120,80,0.16)", glyph: "#D07850" },
  }[tone];

  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={stamp && !reduced ? { scale: 1.7, opacity: 0, rotate: -14 } : false}
      animate={stamp && !reduced ? { scale: 1, opacity: 1, rotate: 0 } : undefined}
      transition={
        stamp && !reduced
          ? { type: "spring", stiffness: 380, damping: 17, delay: 0.12 }
          : undefined
      }
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label={label ?? "Proof seal"}
        className="h-full w-full"
      >
        <circle cx="24" cy="24" r="21" fill={tones.core} />
        <circle cx="24" cy="24" r="21" stroke={tones.ring} strokeWidth="1.8" />
        {/* scalloped seal edge */}
        <circle
          cx="24"
          cy="24"
          r="17.4"
          stroke={tones.ring}
          strokeWidth="0.9"
          strokeDasharray="1.2 3.4"
          strokeLinecap="round"
          opacity="0.9"
        />
        {tone === "clay" ? (
          <path
            d="M17 17 L31 31 M31 17 L17 31"
            stroke={tones.glyph}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M16.5 24.4 L21.8 29.6 L31.5 19.2"
            stroke={tones.glyph}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </motion.span>
  );
}

/* ── Wallet provider marks (typographic, original) ────────────────── */

export function OneAmMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary font-data text-[13px] font-semibold tracking-tight",
        className,
      )}
      aria-hidden="true"
    >
      1AM
    </span>
  );
}

export function LaceMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary font-display text-xl italic font-semibold",
        className,
      )}
      aria-hidden="true"
    >
      L
    </span>
  );
}

export function walletMark(provider: "1am" | "lace") {
  return provider === "1am" ? <OneAmMark /> : <LaceMark />;
}

export function walletName(provider: "1am" | "lace") {
  return provider === "1am" ? "1AM" : "Lace";
}

/* ── Small boundary glyph used inline next to constraints ─────────── */

export function BoundaryGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="2.6" r="1.9" fill="currentColor" />
      <circle cx="10" cy="10" r="2.4" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
