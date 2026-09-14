"use client";

/**
 * The enforcement experience — the product's memorable moment.
 *
 * A mandate caps every fill at $10,000. The visitor drives the
 * executor's attempted size and watches cryptography — not goodwill —
 * decide what settles.
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Lock, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Accent,
  DataChip,
  EASE,
  ProofSeal,
  Reveal,
  SectionHeading,
} from "@/components/remit/primitives";

const CAP = 10_000;
const TRACK_MAX = 14_000;
const PRESETS = [4_000, 8_000, 12_000];
const ATTEMPT_PRICE = 1.0001;

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

type Stage = "idle" | "checking" | "rejected" | "verified";

const CHECKS = [
  { label: "Within price limit", detail: `${usd(ATTEMPT_PRICE)} ≤ $1.0002 limit` },
  { label: "Within size limit", detail: "" }, // dynamic
  { label: "Counterparty allowed", detail: "Allow-listed maker (illustration)" },
  { label: "Mandate active", detail: "Sealed example · Compact-enforced cap" },
];

export function SectionEnforcement() {
  const [size, setSize] = React.useState(8_000);
  const [stage, setStage] = React.useState<Stage>("idle");
  const [ticked, setTicked] = React.useState(0);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduced = useReducedMotion();

  const overCap = size > CAP;
  const capPct = (CAP / TRACK_MAX) * 100;
  const sizePct = (size / TRACK_MAX) * 100;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  React.useEffect(() => clearTimers, []);

  const attempt = () => {
    clearTimers();
    setStage("checking");
    setTicked(0);

    // The engine walks its policy checklist sequentially.
    CHECKS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setTicked(i + 1), 420 * (i + 1)));
    });
    timers.current.push(
      setTimeout(() => {
        setStage(overCap ? "rejected" : "verified");
      }, 420 * CHECKS.length + 520),
    );
  };

  const reset = () => {
    clearTimers();
    setStage("idle");
    setTicked(0);
  };

  const changeSize = (v: number) => {
    setSize(v);
    if (stage !== "idle") {
      clearTimers();
      setStage("idle");
      setTicked(0);
    }
  };

  const sizeCheckDetail = overCap
    ? `${usd(size)} > ${usd(CAP)} per-fill cap`
    : `${usd(size)} ≤ ${usd(CAP)} per-fill cap`;

  return (
    <section id="enforcement" className="relative overflow-hidden bg-ink py-24 text-cream md:py-32">
      <div className="glow-gold pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          align="center"
          eyebrow="Enforcement, live"
          title={
            <>
              The agent can choose.
              <br />
              <Accent>The agent cannot exceed.</Accent>
            </>
          }
          lede="Seal a mandate with a hard cap. Drive the executor yourself. Watch what happens when the engine tries to cross the boundary."
        />

        <Reveal delay={0.1} className="mx-auto mt-14 max-w-5xl">
          <div className="grid gap-6 rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[#101915] p-5 sm:p-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
            {/* the mandate — a private document */}
            <div className="paper grain rounded-xl p-6 text-[#1a231e] shadow-[0_36px_80px_-44px_rgba(0,0,0,0.8)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-data text-[10px] font-medium uppercase tracking-[0.2em] text-gold-deep">
                    Private mandate
                  </p>
                  <p className="font-display mt-1 text-2xl font-semibold">Sealed example</p>
                </div>
                <ProofSeal className="h-11 w-11" tone="gold" />
              </div>

              <dl className="mt-6 space-y-3.5 text-[13px]">
                {[
                  ["Asset", "tNIGHT (illustration)"],
                  ["Side", "Buy"],
                  ["Limit price", "Sealed"],
                  ["Total budget", "Sealed"],
                  ["Expiry", "Sealed"],
                  ["Executor", "Constrained executor"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4">
                    <dt className="uppercase tracking-[0.12em] text-[#5d6a61] text-[10.5px]">{k}</dt>
                    <dd className="font-data text-[12.5px] font-medium text-[#1a231e]">{v}</dd>
                  </div>
                ))}
                <div className="rounded-lg border-2 border-dashed border-[#8c6a1f]/50 bg-[#8c6a1f]/8 px-3.5 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="flex items-center gap-1.5 uppercase tracking-[0.12em] text-[#8c6a1f] text-[10.5px] font-semibold">
                      <Lock className="h-3 w-3" /> Max fill
                    </dt>
                    <dd className="font-data text-lg font-semibold text-[#8c6a1f]">
                      {usd(CAP)}
                    </dd>
                  </div>
                </div>
              </dl>

              <p className="mt-5 border-t border-[rgba(26,35,30,0.12)] pt-4 text-[12px] leading-relaxed text-[#5d6a61]">
                These rules remain private. The chain only ever sees that a
                fill obeyed them.
              </p>
            </div>

            {/* the execution console */}
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-data text-[10px] font-medium uppercase tracking-[0.2em] text-sage">
                  Illustration · not live Preprod
                </p>
                <DataChip>
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  mandate active
                </DataChip>
              </div>

              {/* attempt control */}
              <div className="mt-5 rounded-xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor="attempt-size" className="text-[13px] font-medium text-cream/80">
                    Attempted fill size
                  </label>
                  <span className="font-data text-2xl font-semibold text-cream">
                    {usd(size)}
                  </span>
                </div>

                <div className="mt-4">
                  <Slider
                    id="attempt-size"
                    value={[size]}
                    min={2_000}
                    max={TRACK_MAX}
                    step={500}
                    onValueChange={(v) => changeSize(v[0])}
                    aria-label="Attempted fill size in dollars"
                    className="[&_[data-slot=slider-range]]:bg-gold [&_[data-slot=slider-thumb]]:border-gold [&_[data-slot=slider-thumb]]:bg-[#1a1409]"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => changeSize(p)}
                      className={`rounded-full border px-3.5 py-1.5 font-data text-[12px] transition-colors ${
                        size === p
                          ? "border-gold/60 bg-gold/15 text-gold"
                          : "border-[rgba(239,235,224,0.14)] text-cream/60 hover:border-gold/40 hover:text-cream"
                      }`}
                    >
                      {usd(p)}
                    </button>
                  ))}
                  <span className="ml-auto text-[11px] uppercase tracking-[0.14em] text-sage">
                    cap {usd(CAP)}
                  </span>
                </div>

                {/* the boundary gauge */}
                <div className="relative mt-7" aria-hidden="true">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-[rgba(239,235,224,0.08)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: overCap
                          ? "linear-gradient(90deg, #7CC79B 0%, #7CC79B 71.4%, #D07850 71.4%)"
                          : "#7CC79B",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: stage === "idle" ? `${sizePct}%` : stage === "checking" ? 0 : `${sizePct}%` }}
                      transition={{ duration: 0.8, ease: EASE }}
                    />
                  </div>
                  {/* cap marker */}
                  <div className="absolute inset-y-[-6px]" style={{ left: `${capPct}%` }}>
                    <div className="h-[calc(100%+12px)] w-[2px] bg-gold" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="flex items-center gap-1 rounded-full border border-gold/40 bg-[#101915] px-2 py-0.5 font-data text-[9.5px] font-semibold uppercase tracking-[0.1em] text-gold">
                        <Lock className="h-2.5 w-2.5" /> boundary
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <Button
                    onClick={attempt}
                    disabled={stage === "checking"}
                    className="h-11 flex-1 bg-gold font-semibold text-[#1a1409] hover:bg-gold-2 sm:flex-none sm:px-10"
                  >
                    {stage === "checking" ? "Checking policy…" : "Attempt execution"}
                  </Button>
                  {stage === "rejected" || stage === "verified" ? (
                    <Button
                      variant="ghost"
                      onClick={reset}
                      className="h-11 border border-[rgba(239,235,224,0.14)] text-cream/70 hover:text-cream"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* policy checklist + result */}
              <div className="mt-5 flex-1 rounded-xl border border-[rgba(239,235,224,0.1)] bg-[#121c17] p-5">
                <p className="font-data text-[10px] font-medium uppercase tracking-[0.2em] text-sage">
                  Policy check
                </p>
                <ul className="mt-4 space-y-2.5">
                  {CHECKS.map((c, i) => {
                    const detail = c.label === "Within size limit" ? sizeCheckDetail : c.detail;
                    const isSizeCheck = c.label === "Within size limit";
                    const failed = isSizeCheck && overCap && stage !== "idle" && stage !== "checking";
                    const shown =
                      stage === "idle"
                        ? false
                        : stage === "checking"
                          ? i < ticked
                          : true;
                    return (
                      <li
                        key={c.label}
                        className="flex items-center justify-between gap-4 text-[13px]"
                      >
                        <span className="flex items-center gap-2.5">
                          <AnimatePresence mode="wait">
                            {shown ? (
                              <motion.span
                                key={failed ? "fail" : "pass"}
                                initial={{ scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.25 }}
                                className={`flex h-4.5 w-4.5 items-center justify-center rounded-full ${
                                  failed ? "bg-clay/20 text-clay" : "bg-mint/20 text-mint"
                                }`}
                              >
                                {failed ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </motion.span>
                            ) : (
                              <span
                                key="pending"
                                className="flex h-4.5 w-4.5 items-center justify-center rounded-full border border-[rgba(239,235,224,0.18)]"
                              />
                            )}
                          </AnimatePresence>
                          <span className={shown && failed ? "text-clay" : "text-cream/85"}>
                            {c.label}
                          </span>
                        </span>
                        <span className="font-data text-[11px] text-cream/45">{detail}</span>
                      </li>
                    );
                  })}
                </ul>

                {/* verdict */}
                <div className="mt-5 min-h-[118px]">
                  <AnimatePresence mode="wait">
                    {stage === "idle" ? (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex h-full items-center justify-center rounded-lg border border-dashed border-[rgba(239,235,224,0.14)] px-4 py-6 text-center"
                      >
                        <p className="text-[13px] text-cream/50">
                          The engine is ready. Choose a fill size and attempt execution.
                        </p>
                      </motion.div>
                    ) : null}

                    {stage === "checking" ? (
                      <motion.div
                        key="checking"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex h-full items-center justify-center rounded-lg border border-gold/25 bg-gold/5 px-4 py-6"
                      >
                        <p className="flex items-center gap-3 text-[13px] text-gold">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                          </span>
                          Evaluating against the private mandate…
                        </p>
                      </motion.div>
                    ) : null}

                    {stage === "rejected" ? (
                      <motion.div
                        key="rejected"
                        initial={reduced ? false : { opacity: 0, x: -8 }}
                        animate={
                          reduced
                            ? { opacity: 1, x: 0 }
                            : { opacity: 1, x: [0, -7, 6, -4, 0] }
                        }
                        transition={{ duration: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="flex h-full flex-col justify-center gap-2 rounded-lg border border-clay/40 bg-clay/8 px-5 py-5"
                        role="alert"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-data text-sm font-bold uppercase tracking-[0.22em] text-clay">
                            Rejected
                          </p>
                          <ProofSeal className="h-9 w-9" tone="clay" stamp />
                        </div>
                        <p className="text-[13.5px] text-cream/85">
                          Fill exceeds per-fill mandate cap.
                        </p>
                        <p className="font-data text-[11px] uppercase tracking-[0.14em] text-cream/45">
                          {usd(size)} attempted · {usd(CAP)} cap · refused before settlement — no value moved
                        </p>
                      </motion.div>
                    ) : null}

                    {stage === "verified" ? (
                      <motion.div
                        key="verified"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="flex h-full flex-col justify-center gap-2 rounded-lg border border-mint/35 bg-mint/8 px-5 py-5"
                        role="status"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-data text-sm font-bold uppercase tracking-[0.22em] text-mint">
                            Verified
                          </p>
                          <ProofSeal className="h-9 w-9" tone="mint" stamp />
                        </div>
                        <p className="text-[13.5px] text-cream/85">
                          Mandate satisfied — proof accepted on Midnight.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          <DataChip className="border-mint/25 text-mint/90">
                            proof prf_90e2…41ab
                          </DataChip>
                          <DataChip className="border-mint/25 text-mint/90">
                            receipt RCP-2263
                          </DataChip>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-10 max-w-2xl text-center text-pretty text-[15px] leading-relaxed text-cream/60">
            The executor stays free to choose the offer, the moment and the
            size — up to the boundary.{" "}
            <span className="text-gold">Cryptography defines where it stops.</span>{" "}
            The market only ever sees the result.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
