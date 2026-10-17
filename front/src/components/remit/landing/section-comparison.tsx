"use client";

/**
 * The core visual story — traditional execution vs REMIT.
 *
 * Two vertical flows side by side: one leaks at every hop and ends in
 * trust; the other stays sealed and ends in proof.
 */

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  Eye,
  FileLock2,
  Handshake,
  Landmark,
  Receipt,
  ScanEye,
  ShieldCheck,
  UserRound,
  Bot,
} from "lucide-react";
import { Accent, EASE, ProofSeal, Reveal, SectionHeading } from "@/components/remit/primitives";

type Step = {
  icon: React.ElementType;
  title: string;
  detail: string;
  leak?: boolean;
};

const TRADITIONAL: Step[] = [
  {
    icon: UserRound,
    title: "Team briefs the purchasing agent",
    detail: "The limits live in a doc or a prompt — readable, but not enforceable.",
    leak: true,
  },
  {
    icon: ScanEye,
    title: "The agent spends as you",
    detail: "On the payment rails the agent is you: no boundary a counterparty or an auditor can check.",
    leak: true,
  },
  {
    icon: Eye,
    title: "Suppliers read the mandate",
    detail: "Limits, flow, urgency: visible to whoever the flow passes through. Quotes get shaded against them.",
    leak: true,
  },
  {
    icon: Handshake,
    title: "You trust the agent",
    detail: "Compliance is a promise, not a proof. Verification is after the fact.",
    leak: true,
  },
];

const REMIT: Step[] = [
  {
    icon: FileLock2,
    title: "Procurement seals a spending mandate",
    detail: "Spending limit, eligible suppliers, per-order caps and expiry: encrypted rules, one commitment on-chain.",
  },
  {
    icon: Eye,
    title: "Suppliers quote a hidden envelope",
    detail: "Quotes arrive sealed. Nobody learns the mandate or anyone's pricing.",
  },
  {
    icon: Bot,
    title: "The purchasing agent chooses, but cannot exceed",
    detail: "The agent matches quotes freely — inside the boundary it can never cross.",
  },
  {
    icon: Landmark,
    title: "Midnight proves the fill obeyed the mandate",
    detail: "A zero-knowledge proof checks every rule without revealing it.",
  },
  {
    icon: Receipt,
    title: "Verifiable settlement and receipt",
    detail: "Value moves only after the proof is accepted. Anyone can verify.",
  },
];

function FlowColumn({
  steps,
  variant,
}: {
  steps: Step[];
  variant: "traditional" | "remit";
}) {
  const isRemit = variant === "remit";
  return (
    <div
      className={
        isRemit
          ? "relative rounded-2xl border border-gold/25 bg-[#121c17] p-6 shadow-[0_40px_90px_-50px_rgba(217,169,78,0.28)] sm:p-8"
          : "relative rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#101915]/60 p-6 sm:p-8"
      }
    >
      <div className="mb-7 flex items-center justify-between">
        <p
          className={
            isRemit
              ? "font-data text-[11px] font-medium uppercase tracking-[0.22em] text-gold"
              : "font-data text-[11px] font-medium uppercase tracking-[0.22em] text-sage"
          }
        >
          {isRemit ? "REMIT" : "The unbounded agent"}
        </p>
        {isRemit ? (
          <ProofSeal className="h-9 w-9" tone="gold" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(239,235,224,0.14)] bg-[rgba(239,235,224,0.04)]">
            <Eye className="h-4 w-4 text-sage" />
          </span>
        )}
      </div>

      <ol className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-6%" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
              className="relative flex gap-4 pb-7 last:pb-0"
            >
              {/* rail */}
              {!isLast ? (
                <span
                  className="absolute left-[21px] top-11 h-[calc(100%-2.4rem)] w-px"
                  style={{
                    background: isRemit
                      ? "rgba(217,169,78,0.3)"
                      : "rgba(151,164,154,0.25)",
                  }}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={
                  isRemit
                    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold"
                    : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(239,235,224,0.12)] bg-[rgba(239,235,224,0.04)] text-sage"
                }
              >
                <step.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="pt-1">
                <p className="text-[15.5px] font-semibold leading-snug text-cream">
                  {step.title}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-cream/55">
                  {step.detail}
                </p>
                {step.leak ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-clay/30 bg-clay/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-clay">
                    <Eye className="h-3 w-3" /> leaks
                  </span>
                ) : null}
                {isRemit && i === 3 ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-mint">
                    <ShieldCheck className="h-3 w-3" /> proven
                  </span>
                ) : null}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export function SectionComparison() {
  const reduced = useReducedMotion();
  return (
    <section className="relative bg-ink py-24 text-cream md:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          align="center"
          eyebrow="The core difference"
          title={
            <>
              Same agent.{" "}
              <Accent>Different trust.</Accent>
            </>
          }
          lede="Both paths hand purchasing to an agent. Only one of them can prove, after the fact and without disclosure, that every limit was respected."
        />

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-2 lg:gap-8">
          <Reveal>
            <FlowColumn steps={TRADITIONAL} variant="traditional" />
          </Reveal>
          <Reveal delay={0.12}>
            <FlowColumn steps={REMIT} variant="remit" />
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 flex max-w-5xl items-center justify-center gap-3 text-center">
            <ArrowDown
              className={reduced ? "h-4 w-4 text-gold" : "h-4 w-4 animate-bounce text-gold"}
              aria-hidden="true"
            />
            <p className="text-[13px] uppercase tracking-[0.2em] text-sage">
              The agent can choose. The agent cannot exceed.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
