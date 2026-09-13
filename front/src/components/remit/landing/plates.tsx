"use client";

/**
 * The plate system — REMIT's editorial illustration framing.
 *
 * Generated etchings are presented like plates in a fine print volume:
 * hairline frames, registration corner ticks, engraved captions and a
 * specimen stamp. The art is original; the presentation is borrowed
 * from centuries of financial printing.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

/* ── Corner registration ticks (like a print proof sheet) ─────────── */

export function CornerTicks({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const color =
    tone === "ink" ? "border-[rgba(239,235,224,0.35)]" : "border-[rgba(26,35,30,0.4)]";
  const base = "pointer-events-none absolute h-3.5 w-3.5";
  return (
    <>
      <span className={cn(base, "left-2 top-2 border-l border-t", color)} aria-hidden="true" />
      <span className={cn(base, "right-2 top-2 border-r border-t", color)} aria-hidden="true" />
      <span className={cn(base, "bottom-2 left-2 border-b border-l", color)} aria-hidden="true" />
      <span className={cn(base, "bottom-2 right-2 border-b border-r", color)} aria-hidden="true" />
    </>
  );
}

/* ── A framed plate with engraved caption ─────────────────────────── */

export function PlateFrame({
  src,
  alt,
  plate,
  caption,
  className,
  imgClassName,
  tone = "ink",
  priority = false,
  children,
}: {
  src: string;
  alt: string;
  plate: string;
  caption?: string;
  className?: string;
  imgClassName?: string;
  tone?: "ink" | "paper";
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const isPaper = tone === "paper";
  return (
    <figure className={cn("relative", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          isPaper
            ? "border border-[rgba(26,35,30,0.16)] bg-paper-2"
            : "border border-[rgba(239,235,224,0.14)] bg-ink-2",
        )}
      >
        { }
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "block h-auto w-full select-none",
            isPaper ? "mix-blend-multiply" : undefined,
            imgClassName,
          )}
        />
        <CornerTicks tone={tone} />
        {children}
      </div>
      <figcaption
        className={cn(
          "mt-3 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1",
          isPaper ? "text-[#5d6a61]" : "text-cream/45",
        )}
      >
        <span
          className={cn(
            "font-data text-[10px] font-medium uppercase tracking-[0.24em]",
            isPaper ? "text-[#8c6a1f]" : "text-gold/80",
          )}
        >
          {plate}
        </span>
        {caption ? (
          <span className="font-display text-[13px] italic">{caption}</span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/* ── Specimen stamp — a circular seal pressed over the art ────────── */

export function SpecimenStamp({
  className,
  tone = "clay",
  label = "SPECIMEN",
  sub = "REMIT PROTOCOL",
}: {
  className?: string;
  tone?: "clay" | "gold" | "mint";
  label?: string;
  sub?: string;
}) {
  const stroke =
    tone === "clay"
      ? "#b5522e"
      : tone === "gold"
        ? "#8c6a1f"
        : "#3e8e66";
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("h-20 w-20 select-none", className)}
      aria-hidden="true"
      style={{ opacity: 0.82, transform: "rotate(-12deg)" }}
    >
      <defs>
        <path
          id={`${id}-arc`}
          d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
        />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke={stroke} strokeWidth="2" />
      <circle cx="60" cy="60" r="50" fill="none" stroke={stroke} strokeWidth="0.75" />
      <circle cx="60" cy="60" r="33" fill="none" stroke={stroke} strokeWidth="1.5" />
      {/* keyhole glyph at center */}
      <circle cx="60" cy="52" r="6" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M57 57 L57 68 M63 57 L63 68" stroke={stroke} strokeWidth="0" />
      <path d="M58.5 56 L58.5 69 M61.5 56 L61.5 69" stroke={stroke} strokeWidth="1.5" />
      <text
        fill={stroke}
        fontSize="10.5"
        fontWeight="700"
        letterSpacing="2.5"
        fontFamily="'JetBrains Mono Variable', ui-monospace, monospace"
      >
        <textPath href={`#${id}-arc`} startOffset="25%" textAnchor="middle">
          {label} · {sub} ·
        </textPath>
      </text>
    </svg>
  );
}

/* ── Dotted editorial connector (draws itself on scroll) ──────────── */

export function DottedLead({
  className,
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 120 60"
      className={cn("h-14 w-28", className)}
      fill="none"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <motion.path
        d="M2 8 C 40 4, 66 18, 96 44"
        stroke="#8c6a1f"
        strokeWidth="1.5"
        strokeDasharray="1 6"
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1.1, ease: [0.21, 0.47, 0.32, 0.98] }}
      />
      <motion.circle
        cx="102"
        cy="50"
        r="3"
        fill="#8c6a1f"
        initial={reduced ? false : { scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 1 }}
      />
    </svg>
  );
}
