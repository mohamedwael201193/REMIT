"use client";

/**
 * Shared REMIT presentation primitives.
 *
 * Small, focused building blocks every surface composes from —
 * motion, typography, status, surfaces and states.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Brand marks are re-exported for one-line imports across surfaces. */
export { ProofSeal, RemitMark, BoundaryGlyph, Wordmark } from "./brand";

/* ── Motion ────────────────────────────────────────────────────────── */

export const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-10% 0px" }}
      transition={{ duration: 0.72, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Draws an SVG path when scrolled into view. */
export function DrawPath({
  d,
  className,
  duration = 1.4,
  delay = 0,
  ...pathProps
}: React.SVGProps<SVGPathElement> & {
  duration?: number;
  delay?: number;
}) {
  const ref = React.useRef<SVGPathElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const reduced = useReducedMotion();
  return (
    <path
      ref={ref}
      d={d}
      className={className}
      initial={{ pathLength: reduced ? 1 : 0 }}
      animate={inView || reduced ? { pathLength: 1 } : undefined}
      transition={{ duration, delay, ease: EASE }}
      {...pathProps}
    />
  );
}

/** Animated numeral that counts up when visible. */
export function CountUp({
  value,
  format,
  className,
  duration = 1.4,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let frame: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={cn("font-data tabular-nums", className)}>
      {format ? format(display) : Math.round(display).toLocaleString("en-US")}
    </span>
  );
}

/* ── Typography ────────────────────────────────────────────────────── */

export function Eyebrow({
  children,
  className,
  chip,
}: {
  children: React.ReactNode;
  className?: string;
  chip?: string;
}) {
  return (
    <p className={cn("eyebrow flex items-center gap-3 text-gold", className)}>
      {chip ? (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold font-data text-[11px] font-semibold text-[#1a1409]">
          {chip}
        </span>
      ) : null}
      <span>{children}</span>
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  chip,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  chip?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <Reveal>
        <Eyebrow chip={chip} className={align === "center" ? "justify-center" : undefined}>
          {eyebrow}
        </Eyebrow>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="font-display mt-5 text-balance text-[clamp(2.1rem,4.6vw,3.9rem)] font-semibold leading-[1.04] tracking-[-0.015em]">
          {title}
        </h2>
      </Reveal>
      {lede ? (
        <Reveal delay={0.16}>
          <p
            className={cn(
              "text-pretty mt-6 text-[1.05rem] leading-relaxed text-muted-foreground",
              align === "center" && "mx-auto",
            )}
          >
            {lede}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** Italic gold serif accent inside display headings. */
export function Accent({ children }: { children: React.ReactNode }) {
  return <em className="not-italic font-display italic text-gold">{children}</em>;
}

/* ── Surfaces ──────────────────────────────────────────────────────── */

/** Cream "document" surface — re-scopes shadcn vars to the paper theme. */
export function PaperSurface({
  children,
  className,
  grain = true,
}: {
  children: React.ReactNode;
  className?: string;
  grain?: boolean;
}) {
  return (
    <div className={cn("paper grain rounded-2xl", className)}>{children}</div>
  );
}

/* ── Status ────────────────────────────────────────────────────────── */

export type PillTone =
  | "verified"
  | "settled"
  | "rejected"
  | "pending"
  | "sealed"
  | "private"
  | "neutral";

const PILL_TONES: Record<PillTone, string> = {
  verified: "text-mint border-mint/35 bg-mint/10",
  settled: "text-mint border-mint/35 bg-mint/10",
  rejected: "text-clay border-clay/40 bg-clay/10",
  pending: "text-gold border-gold/40 bg-gold/10",
  sealed: "text-gold border-gold/35 bg-gold/10",
  private: "text-sage border-border bg-secondary",
  neutral: "text-muted-foreground border-border bg-secondary",
};

export function StatusPill({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: PillTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        PILL_TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/* ── Data ──────────────────────────────────────────────────────────── */

export function StatBlock({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="eyebrow text-muted-foreground">{label}</span>
      <span className="font-data text-2xl font-medium tracking-tight text-foreground">
        {value}
      </span>
      {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

export function ProgressTrack({
  value,
  max,
  className,
  tone = "gold",
}: {
  value: number;
  max: number;
  className?: string;
  tone?: "gold" | "mint" | "clay";
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));
  const tones = {
    gold: "bg-gold",
    mint: "bg-mint",
    clay: "bg-clay",
  };
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full rounded-full", tones[tone])}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: EASE }}
      />
    </div>
  );
}

export function DataChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-data inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── States ────────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
        {icon ?? <ShieldCheck className="h-5 w-5" />}
      </span>
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Sync interrupted",
  description = "The workspace could not reach the protocol surface. Your mandates remain sealed.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-clay/30 bg-clay/5 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-clay/40 bg-clay/10 text-clay">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry sync
        </Button>
      ) : null}
    </div>
  );
}

/* ── Layout helpers ────────────────────────────────────────────────── */

export function NumberChip({ n, className }: { n: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold font-data text-[12px] font-semibold text-[#1a1409]",
        className,
      )}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}

export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}
